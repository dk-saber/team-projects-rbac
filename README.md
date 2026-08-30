# ProjectTrack RBAC

A project tracking application built around **Role-Based Access Control (RBAC)**. Every project is visible to every authenticated user; who can **create**, **update**, or **delete** one depends entirely on their role. Roles, Directions and Departments are backend-driven reference data — an Admin can add or change them at any time from the console, with no code change and no redeploy.

Authentication is built on short-lived JWT access tokens paired with rotating, HttpOnly refresh tokens (one-time use, replay-detected, per-session revocation).

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [Kubernetes Deployment (Killercoda)](#kubernetes-deployment-killercoda)
- [Services & Ports](#services--ports)
- [Environment Variables](#environment-variables)
- [Default Admin Account](#default-admin-account)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Architecture

The stack is composed of five services, all orchestrated by a single `docker-compose.yaml` at the repository root:

| Service   | Image / Build              | Purpose                                                  |
|-----------|-----------------------------|-----------------------------------------------------------|
| `mongo`   | `mongo:7`                   | Primary database (users, roles, directions, departments, projects, refresh tokens) |
| `mailhog` | `mailhog/mailhog`           | Local fake SMTP server — captures password-reset emails without sending them anywhere, viewable at `http://localhost:8025` |
| `api`     | Built from `./jwt-project-manager-rbac` | Express REST API — auth, RBAC, projects, admin console backend |
| `web`     | Built from `./nuxt-express-rbac` | Nuxt 4 frontend — server-rendered, proxies `/api/**` to the `api` service internally |

Browser traffic only ever talks to the `web` service (port `3000`). Nuxt's internal Nitro server proxies every `/api/**` request to `api:5000` over the Docker network, preserving the original `Origin` header. This keeps the HttpOnly refresh-token cookie same-origin from the browser's point of view, regardless of the public hostname the app is served from (e.g. a dynamically generated sandbox domain).

```
Browser ──▶ web (Nuxt/Nitro, :3000) ──proxy /api/**──▶ api (Express, :5000) ──▶ mongo (:27017)
                                                              │
                                                              └──▶ mailhog (:1025 SMTP / :8025 UI)
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Engine 20.10+) or a **Kubernetes cluster** (Killercoda / Minikube).
- `kubectl` CLI (for Kubernetes deployments).
- No local Node.js, MongoDB, or SMTP setup is required — everything runs in containers.

## Project Structure

```
.
├── docker-compose.yaml
├── README.md
├── jwtRefreshToken-be/        # Express API
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── models/                # Mongoose schemas: User, Role, Direction, Department, Project, RefreshToken
│   ├── routes/                # auth, profile, meta, admin, projects
│   ├── middleware/             # auth (JWT), rbac (role/permission checks)
│   ├── scripts/seed.js        # Seeds default roles/directions/departments + an Admin account
│   └── API.md                 # Full REST API reference
└── jwtRefreshToken-fe/        # Nuxt 4 frontend
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example
    ├── app/pages/              # /, /login, /register, /profile, /projects, /admin, ...
    ├── app/composables/        # useAuth, useApi, useMeta, useProjects, useAdmin
    └── nuxt.config.ts          # routeRules proxying /api/** to the api service
```

> **Note:** if you extracted the backend/frontend from separate archives, make sure the resulting folders are named exactly `jwt-project-manager-rbac` and `jnuxt-express-rbac` at the repository root (matching the `build.context` paths in `docker-compose.yaml`), or update those paths accordingly.

## Quick Start

```bash
# From the repository root, next to docker-compose.yaml

# 1. Build all images (use --no-cache on the very first run, or after major dependency changes)
docker compose build

# 2. Start the stack in the background
docker compose up -d

# 3. Watch the logs until MongoDB is healthy and the API/web servers are ready
docker compose logs -f
```

The `api` service automatically runs `node scripts/seed.js` before starting the server (see the `command` override in `docker-compose.yaml`), so the default roles, directions, departments, and an Admin account are created on first boot. The seed is idempotent — re-running it on every restart will **not** duplicate data or overwrite roles/permissions you've since changed from the Admin console.

Once everything is up:

- Frontend: **http://localhost:3000**
- API (direct, optional — the frontend already proxies it): **http://localhost:5000/api**
- MailHog UI (password-reset emails land here): **http://localhost:8025**

To stop everything:

```bash
docker compose down
```

To stop and also wipe the MongoDB volume (fresh database on next `up`):

```bash
docker compose down -v
```

## Services & Ports

| Service   | Container name    | Host port | Notes                                  |
|-----------|--------------------|-----------|------------------------------------------|
| `web`     | `jwt-auth-web`     | `3000`    | Public entry point                       |
| `api`     | `jwt-auth-api`     | `5000`    | Exposed for direct testing/debugging     |
| `mailhog` | `jwt-mailhog`      | `8025`    | Web UI to read captured emails           |
| `mongo`   | `jwt-mongo`        | —         | Not published to the host; internal only |

## Environment Variables

Defined directly under `api.environment` in `docker-compose.yaml`. **Change the secrets before any real deployment** — the values below are development placeholders.

| Variable                 | Description                                                        | Default (dev)                          |
|---------------------------|----------------------------------------------------------------------|------------------------------------------|
| `PORT`                    | Port the API listens on inside the container                        | `5000`                                   |
| `NODE_ENV`                | Node environment                                                    | `production`                             |
| `CORS_ORIGIN`             | Allowed CORS origin(s)                                               | `*` (safe here — see note below)         |
| `MONGO_URI`               | MongoDB connection string                                           | `mongodb://mongo:27017/jwt-refresh-demo` |
| `JWT_SECRET`              | Signing secret for access tokens                                     | `change-me` ⚠️                            |
| `JWT_EXPIRES_IN`          | Access token lifetime                                                | `15m`                                    |
| `REFRESH_TOKEN_SECRET`    | Signing secret for refresh tokens                                    | `change-me-too` ⚠️                        |
| `REFRESH_TOKEN_TTL_SEC`   | Refresh token lifetime, in seconds                                   | `604800` (7 days)                        |
| `FRONTEND_URL`            | Used to build links in password-reset emails                        | `http://localhost:3000`                  |
| `PASSWORD_RESET_TTL_SEC`  | Password-reset token lifetime, in seconds                            | `900` (15 min)                           |
| `SMTP_HOST` / `SMTP_PORT` | MailHog's internal address on the Docker network                    | `mailhog` / `1025`                       |
| `SMTP_SECURE`             | Whether SMTP uses TLS                                                | `false` (MailHog needs none)             |
| `MAIL_FROM`               | "From" address on outgoing emails                                    | `no-reply@example.com`                   |

The frontend receives one build argument:

| Build arg               | Description                                                                 | Value in this compose file |
|---------------------------|-------------------------------------------------------------------------------|------------------------------|
| `NUXT_PUBLIC_API_BASE`    | Base path the browser calls; kept relative (`/api`) so requests stay same-origin and are proxied server-side to `api:5000` | `/api`                       |

> **Why `CORS_ORIGIN: "*"` is fine here:** the browser only ever talks to the `web` service. `web` forwards `/api/**` requests to `api` server-to-server, inside the Docker network — the browser's `Origin` header never has to match a hardcoded value on the API side. Set this to your actual public frontend origin if you ever expose the `api` service directly to the internet.

## Default Admin Account

Created once by `scripts/seed.js` on the very first run (skipped if an Admin already exists):

- **Email:** `admin@example.com`
- **Password:** `ChangeMe123!`

**Change this password immediately after first login.** You can override the seeded credentials before the first run by adding to the `api.environment` block:

```yaml
      SEED_ADMIN_EMAIL: you@yourcompany.com
      SEED_ADMIN_PASSWORD: a-strong-password
```

## Common Operations

**Rebuild a single service after code changes:**
```bash
docker compose build --no-cache api   # or: web
docker compose up -d api
```

**Re-run the seed manually** (e.g. to inspect its output, or after wiping the database):
```bash
docker compose exec api node scripts/seed.js
```

**Tail logs for one service:**
```bash
docker compose logs -f api
docker compose logs -f web
```

**Open a shell inside a container:**
```bash
docker compose exec api sh
```

**Full reset (containers, network, and the Mongo volume):**
```bash
docker compose down -v
docker compose up -d --build
```

## Troubleshooting

**`nuxt: Permission denied` (or similar) during `docker compose build`:**
Almost always caused by a local `node_modules` folder (installed on your host OS) being picked up by the build context and overwriting the one installed fresh inside the Linux container. Make sure `.dockerignore` is present in both `jwtRefreshToken-be/` and `jwtRefreshToken-fe/` (it is, by default, in this repository), delete any local `node_modules` folders, then rebuild with `--no-cache`:
```bash
rm -rf jwtRefreshToken-be/node_modules jwtRefreshToken-fe/node_modules
docker compose build --no-cache
```

**API can't reach MongoDB on first start:**
The `api` service waits for `mongo`'s healthcheck to pass (`depends_on: condition: service_healthy`) before starting, so this should self-resolve within a few seconds. If it persists, check `docker compose logs mongo`.

**Password reset emails don't seem to arrive:**
They're never sent to a real inbox in this setup — MailHog captures everything locally. Check **http://localhost:8025**.

**Changes to `roles`/`directions`/`departments` seem to disappear on restart:**
They shouldn't — `scripts/seed.js` only inserts data that doesn't already exist (`$setOnInsert`) and never overwrites existing documents. If you see otherwise, please check you're not running against a fresh (`down -v`) volume.

## API Reference

The full REST API — every route, required permissions, and example payloads — is documented in [`jwtRefreshToken-be/API.md`](./jwtRefreshToken-be/API.md).
