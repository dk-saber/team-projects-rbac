# Deploying to Kubernetes

This directory contains plain Kubernetes manifests (usable directly with `kubectl apply` or as a single `kustomize` bundle) to deploy the same four services defined in the root `docker-compose.yaml`: `mongo`, `mailhog`, `api`, and `web`.

## 1. Prerequisites

- A Kubernetes cluster (managed — EKS/GKE/AKS — or local — kind/minikube/k3d) and `kubectl` configured against it.
- A default `StorageClass` available (for MongoDB's persistent volume), or adjust `storageClassName` in `03-mongo.yaml`.
- An Ingress controller if you want external access (these manifests assume [ingress-nginx](https://kubernetes.github.io/ingress-nginx/); adjust `ingressClassName` otherwise).
- A container registry you can push to (Docker Hub, GHCR, ECR, GCR, ...) — unlike `docker-compose`, Kubernetes does not build images from a local `Dockerfile`; it only pulls pre-built images.

## 2. An important constraint specific to this codebase

The frontend's `nuxt.config.ts` hardcodes its internal API proxy target:

```ts
routeRules: {
  '/api/**': { proxy: 'http://api:5000/api/**' }
}
```

This means the backend **must** be reachable at the DNS name `api` on port `5000` from within the `web` pod — which is exactly what the `Service` named `api` in `05-api.yaml` provides, as long as both are deployed in the same namespace. **Do not rename the `api` Service** without also updating `nuxt.config.ts` and rebuilding the frontend image.

## 3. Build and push the images

Images are pushed to Docker Hub under the `saberdk` account. `05-api.yaml` and `06-web.yaml` already reference `saberdk/projecttrack-rbac-api:v1.0` and `saberdk/projecttrack-rbac-web:v1.0` — no placeholder to edit.

From the repository root:

```bash
docker login

# Backend
docker build -t saberdk/projecttrack-rbac-api:v1.0 ./jwt-project-manager-rbac
docker push saberdk/projecttrack-rbac-api:v1.0

# Frontend — the --build-arg is required: it must stay "/api" so the refresh
# token cookie remains same-origin once deployed (see README.md § Architecture).
docker build --build-arg NUXT_PUBLIC_API_BASE=/api -t saberdk/projecttrack-rbac-web:v1.0 ./nuxt-express-rbac
docker push saberdk/projecttrack-rbac-web:v1.0
```

**Using a local cluster (kind / minikube) instead, without pushing to Docker Hub:**

```bash
# kind
kind load docker-image saberdk/projecttrack-rbac-api:v1.0
kind load docker-image saberdk/projecttrack-rbac-web:v1.0

# minikube
minikube image load saberdk/projecttrack-rbac-api:v1.0
minikube image load saberdk/projecttrack-rbac-web:v1.0
```

## 4. Configure secrets

**Do not apply `02-secret.yaml` as-is in any shared or production cluster** — its values are placeholders. Prefer creating the Secret imperatively instead of editing the file:

```bash
kubectl create namespace projecttrack-rbac

kubectl create secret generic api-secrets \
  --namespace projecttrack-rbac \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=REFRESH_TOKEN_SECRET="$(openssl rand -base64 48)" \
  --from-literal=SEED_ADMIN_EMAIL="admin@example.com" \
  --from-literal=SEED_ADMIN_PASSWORD="$(openssl rand -base64 18)"
```

If you do this, skip `02-secret.yaml` when applying (see below) and remove it from `kustomization.yaml`.

## 5. Apply the manifests

**Option A — Kustomize (recommended, applies everything in order):**
```bash
kubectl apply -k k8s/
```

**Option B — plain kubectl, file by file:**
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secret.yaml   # or skip if created imperatively above
kubectl apply -f k8s/03-mongo.yaml
kubectl apply -f k8s/04-mailhog.yaml
kubectl apply -f k8s/05-api.yaml
kubectl apply -f k8s/06-web.yaml
kubectl apply -f k8s/07-ingress.yaml
```

## 6. Verify the rollout

```bash
kubectl get pods -n projecttrack-rbac -w
kubectl logs -n projecttrack-rbac deploy/api -c seed     # seed initContainer output
kubectl logs -n projecttrack-rbac deploy/api -f
kubectl logs -n projecttrack-rbac deploy/web -f
```

Without an Ingress (e.g. quick local test):
```bash
kubectl port-forward -n projecttrack-rbac svc/web 3000:3000
kubectl port-forward -n projecttrack-rbac svc/mailhog 8025:8025
```
Then open http://localhost:3000.

With the Ingress applied, point your DNS (or `/etc/hosts` for local testing) at the Ingress controller's external IP for the host set in `07-ingress.yaml`.

## 7. What's intentionally different from `docker-compose.yaml`

| Aspect                | docker-compose                          | Kubernetes                                                      |
|------------------------|-------------------------------------------|--------------------------------------------------------------------|
| Building images         | `build:` from local `Dockerfile`          | Pre-built images pulled from a registry (steps 2–3 above)          |
| Seeding                 | `command:` runs seed then `npm start` in one container | Dedicated `initContainer` on the `api` Deployment, runs before every pod start (still idempotent) |
| Secrets                 | Plaintext in `environment:`               | Split into a `Secret` (`api-secrets`) and a `ConfigMap` (`api-config`) |
| Storage                 | Named Docker volume                       | `PersistentVolumeClaim` via the `mongo` StatefulSet's `volumeClaimTemplates` |
| Scaling                 | Single container per service              | `api` and `web` run 2 replicas by default (`spec.replicas`)         |
| External access         | Published ports (`3000`, `5000`, `8025`)  | `Ingress` (see `07-ingress.yaml`) — ports are not published directly |

## 8. Production hardening checklist (not included by default)

These manifests favor clarity and parity with the docker-compose setup over turnkey production hardening. Before a real deployment, consider adding:

- **NetworkPolicies** restricting which pods can reach `mongo` and `mailhog`.
- **MongoDB authentication** (`MONGO_URI` currently has no credentials, matching the docker-compose setup — fine for an isolated demo namespace, not for a shared cluster).
- A **real SMTP provider** instead of MailHog (which has no authentication and is not meant to be reached from the internet).
- **HorizontalPodAutoscaler** for `api` and `web` if load varies.
- **PodDisruptionBudget** if running multiple replicas across nodes that may be drained.
- Restricting `CORS_ORIGIN` (in `01-configmap.yaml`) to the real public origin instead of `*`.
