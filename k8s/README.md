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
kubectl apply -f k8s/08-hpa.yaml
```

## 6. Verify the rollout

```bash
kubectl get pods -n projecttrack-rbac -w
kubectl logs -n projecttrack-rbac deploy/api -c seed     # seed initContainer output
kubectl logs -n projecttrack-rbac deploy/api -f
kubectl logs -n projecttrack-rbac deploy/web -f
kubectl get hpa -n projecttrack-rbac                     # see §9 to make this show real numbers
```

Without an Ingress (e.g. quick local test):
```bash
kubectl port-forward -n projecttrack-rbac svc/web 3000:3000
kubectl port-forward -n projecttrack-rbac svc/mailhog 8025:8025
```
Then open http://localhost:3000.

With the Ingress applied, point your DNS (or `/etc/hosts` for local testing) at the Ingress controller's external IP for the host set in `07-ingress.yaml`.

## 7. Metrics Server & the HPA

`08-hpa.yaml` defines a `HorizontalPodAutoscaler` for both `api` and `web` (2–6 replicas, target 60% average
CPU utilization, computed against the `resources.requests.cpu` already set on each container in
`05-api.yaml`/`06-web.yaml`). It's included in `kustomization.yaml`, so `kubectl apply -k k8s/` creates it
along with everything else — but on its own it does nothing useful yet:

```bash
kubectl get hpa -n projecttrack-rbac
# TARGETS column shows <unknown>/60% forever, because no metrics-server is running
```

### 7.1 Install the Metrics Server

The HPA controller reads CPU/memory usage from the `metrics.k8s.io` API, served by the
[Kubernetes Metrics Server](https://github.com/kubernetes-sigs/metrics-server) — it is **not** installed by
default on any cluster type covered here (managed or local).

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

**On local/lab clusters (kind, minikube, k3d, Killercoda):** metrics-server usually crash-loops or logs
`x509: certificate signed by unknown authority`, because the kubelet's serving certificate isn't signed by
a CA metrics-server trusts by default. Work around it by skipping kubelet TLS verification — fine for a lab
or demo cluster, **never do this in production**:

```bash
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

Wait for it to come up, then confirm it's actually serving numbers (this can take up to a minute after the
pod is `Ready`, while it performs its first scrape):

```bash
kubectl rollout status deployment/metrics-server -n kube-system
kubectl top pods -n projecttrack-rbac
```

`kubectl top pods` returning real CPU/memory figures (instead of an error) is the signal that the HPA will
now work. Re-run `kubectl get hpa -n projecttrack-rbac`: `TARGETS` should flip from `<unknown>/60%` to
something like `2%/60%`.

### 7.2 Testing the HPA with a load sidecar

To actually see a scale-up you need to push one of the two Deployments' average CPU utilization above 60%.
Rather than scripting external HTTP traffic, `hpa-load-test-patch.yaml` takes a shortcut: HPA computes a
pod's utilization as the **sum** of all its containers' CPU usage against the **sum** of their
`resources.requests.cpu`, so temporarily adding a small CPU-burning sidecar container to the `api` pods
raises their measured utilization directly and reliably triggers a scale-up — no load generator, no
network path required.

**Apply the sidecar patch** (adds a `load` container running `stress --cpu 1` to the live `api`
Deployment):

```bash
kubectl patch deployment api -n projecttrack-rbac --patch-file=k8s/hpa-load-test-patch.yaml
```

**Watch it react**, in two terminals:

```bash
kubectl get hpa api -n projecttrack-rbac -w
kubectl get pods -n projecttrack-rbac -l app=api -w
```

Within roughly 15–30 seconds (the default HPA sync period) you should see `TARGETS` climb well past `60%`
and `REPLICAS` increase — up to `maxReplicas: 6` if the load is sustained and the cluster has room to
schedule that many pods. `08-hpa.yaml`'s `behavior.scaleUp` allows adding up to 2 pods per 30s, so scale-up
is fast; `behavior.scaleDown` waits for a 120s stabilization window with low usage before removing pods, so
scale-down is deliberately slower and won't flap on a brief dip.

**Remove the sidecar** once you're done (the `stress` process inside it also self-terminates after `600s`
on its own, but the container — and its CPU *request* — stays until you do this):

```bash
kubectl apply -f k8s/05-api.yaml
```

This works because `05-api.yaml` doesn't declare a `load` container: applying it performs a three-way
merge against the last applied configuration and removes the field that's no longer present. This only
works if the Deployment was originally created with `kubectl apply` (as step 5 above does) — if you created
it with `kubectl create` or another patch-only workflow, delete the sidecar explicitly instead:

```bash
kubectl patch deployment api -n projecttrack-rbac --type=json \
  -p="$(kubectl get deployment api -n projecttrack-rbac -o json | \
        jq '[{"op":"remove","path":("/spec/template/spec/containers/" + ((.spec.template.spec.containers | map(.name) | index("load")) | tostring))}]')"
```

Watch `kubectl get hpa api -n projecttrack-rbac -w` again: `TARGETS` should drop back under `60%` and,
after the 120s stabilization window, `REPLICAS` should scale back down toward `minReplicas: 2`.

> **Note for Killercoda / other single-node labs:** these are typically small VMs. If `maxReplicas: 6`
> across both `api` and `web` exceeds the node's available CPU, extra pods will sit in `Pending`
> (`kubectl describe pod` will show `Insufficient cpu`) rather than actually running — the HPA is still
> "working correctly" in that case, there's just no room to schedule what it asked for. Lower `maxReplicas`
> in `08-hpa.yaml` if you want every scaled-up pod to actually get scheduled on a small lab node.

## 8. What's intentionally different from `docker-compose.yaml`

| Aspect                | docker-compose                          | Kubernetes                                                      |
|------------------------|-------------------------------------------|--------------------------------------------------------------------|
| Building images         | `build:` from local `Dockerfile`          | Pre-built images pulled from a registry (steps 2–3 above)          |
| Seeding                 | `command:` runs seed then `npm start` in one container | Dedicated `initContainer` on the `api` Deployment, runs before every pod start (still idempotent) |
| Secrets                 | Plaintext in `environment:`               | Split into a `Secret` (`api-secrets`) and a `ConfigMap` (`api-config`) |
| Storage                 | Named Docker volume                       | `PersistentVolumeClaim` via the `mongo` StatefulSet's `volumeClaimTemplates` |
| Scaling                 | Single container per service              | `api` and `web` start at 2 replicas and autoscale 2–6 on CPU via `HorizontalPodAutoscaler` (see §7) |
| External access         | Published ports (`3000`, `5000`, `8025`)  | `Ingress` (see `07-ingress.yaml`) — ports are not published directly |

## 9. Production hardening checklist (not included by default)

These manifests favor clarity and parity with the docker-compose setup over turnkey production hardening. Before a real deployment, consider adding:

- **NetworkPolicies** restricting which pods can reach `mongo` and `mailhog`.
- **MongoDB authentication** (`MONGO_URI` currently has no credentials, matching the docker-compose setup — fine for an isolated demo namespace, not for a shared cluster).
- A **real SMTP provider** instead of MailHog (which has no authentication and is not meant to be reached from the internet).
- A **production-grade Metrics Server install** — `--kubelet-insecure-tls` (used in §7.1) skips certificate validation and is only acceptable on a lab/local cluster; a managed cluster (EKS/GKE/AKS) either ships metrics-server already configured correctly or lets you install it without that flag.
- **PodDisruptionBudget** if running multiple replicas across nodes that may be drained.
- Restricting `CORS_ORIGIN` (in `01-configmap.yaml`) to the real public origin instead of `*`.