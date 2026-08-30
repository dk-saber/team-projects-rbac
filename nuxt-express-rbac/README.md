# nuxt-express-rbac (frontend)

Nuxt 4 + Tailwind CSS frontend for the `jwt-project-manager-rbac` API. Beyond the auth flow, it's a full
RBAC-driven project tracker: every authenticated user can browse projects, while creating, updating, or
deleting one is gated by permission, and an Admin console manages users, roles, directions, and departments
without any redeploy.

The home page (`/`) doubles as a live explainer of the **refresh token rotation** used by the API
(15-minute access token, HttpOnly refresh-token cookie, revoked and replaced on every
`POST /api/auth/refresh`).

## Features

- **Home (`/`)** — walkthrough of refresh token rotation: an animated 4-step diagram (login, use,
  expiration, rotation), a JWT anatomy breakdown, a comparison with a static token, and the project's
  concrete security choices.
- **Register (`/register`)** — signup form matching the backend's `User` model (direction and department
  are picked from `GET /api/meta/*`; the role is always assigned by the backend's default registration
  role, never chosen by the user here).
- **Login (`/login`)** — `POST /api/auth/login`, keeps the access token in memory only.
- **Forgot / reset password (`/forgot-password`, `/reset-password`)** — requests a single-use reset link
  by email (`POST /api/auth/forgot-password`) and submits a new password with that token
  (`POST /api/auth/reset-password`); the backend always answers the forgot-password call with the same
  generic message to avoid account enumeration.
- **Profile (`/profile`)** — protected route (`middleware: auth`); shows the current user's info, decodes
  and displays the current access token's expiration, and lets the user trigger a manual rotation.
- **Projects (`/projects`)** — protected route (`middleware: auth`); lists every project visible to any
  authenticated user, while the create/edit/delete actions are shown or hidden per-user based on
  `hasPermission('project:create' | 'project:update' | 'project:delete')`, mirroring the backend's RBAC
  checks.
- **Admin console (`/admin`)** — protected route (`middleware: admin`, requires the `Admin` role); tabbed
  CRUD over Users, Roles, Directions, and Departments — including changing a user's role or deactivating a
  reference item — all backed by the `/api/admin/*` endpoints.
- **Silent session restore** — on app load, the client attempts `POST /api/auth/refresh` (HttpOnly cookie)
  to restore the session without asking for credentials again.
- **401 interceptor** — `useApi().authFetch` automatically retries a request once, after a silent refresh,
  if the access token had expired.

## Prerequisites

- Node.js 18+
- The `jwt-project-manager-rbac` backend running and reachable (locally at `http://localhost:5000`, with
  CORS already configured backend-side for `http://localhost:3000` and `credentials: true`).

## Installation

```bash
npm install
cp .env.example .env
```

`.env`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:5000/api
```

## Development

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Build

```bash
npm run build
npm run preview
```

## Project structure (Nuxt 4 — `app/` directory)

```text
nuxt-express-rbac/
├── app/
│   ├── app.vue
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── NavBar.vue
│   │   ├── SiteFooter.vue
│   │   ├── ModalDialog.vue             # generic confirm/edit modal, used across Admin & Projects
│   │   ├── RoleBadge.vue               # colored badge for a user's role
│   │   ├── StatusBadge.vue             # colored badge for a project's status
│   │   ├── TokenRotationDiagram.vue    # signature refresh-token-rotation diagram
│   │   └── JwtAnatomy.vue
│   ├── composables/
│   │   ├── useAuth.ts                  # auth state: login/register/refresh/logout, hasRole/hasPermission
│   │   ├── useApi.ts                   # authenticated fetch with automatic retry on 401
│   │   ├── useMeta.ts                  # public reference data: GET /api/meta/{roles,directions,departments}
│   │   ├── useProjects.ts              # CRUD against /api/projects
│   │   └── useAdmin.ts                 # CRUD against /api/admin/* (users, roles, directions, departments)
│   ├── middleware/
│   │   ├── auth.ts                     # protects /profile and /projects
│   │   └── admin.ts                    # protects /admin (requires the Admin role)
│   ├── pages/
│   │   ├── index.vue
│   │   ├── login.vue
│   │   ├── register.vue
│   │   ├── forgot-password.vue
│   │   ├── reset-password.vue
│   │   ├── profile.vue
│   │   ├── projects/index.vue
│   │   └── admin/index.vue
│   └── plugins/
│       └── auth.client.ts              # session restoration on startup
├── nuxt.config.ts
├── tailwind.config.ts
└── package.json
```

## Frontend security notes

- The access token is **never** persisted (no `localStorage`/`sessionStorage`): it lives in memory via
  `useState`, so it disappears on every full page reload — which is exactly why the silent restore via the
  refresh-token cookie exists.
- The refresh token is never touched by frontend JavaScript: it's entirely managed through the `HttpOnly`
  cookie set by the backend.
- Every call to `/api/auth/*`, `/api/profile/*`, `/api/projects/*`, and `/api/admin/*` sends
  `credentials: 'include'` so that cookie is actually delivered.
- UI-level permission checks (`hasPermission`, `hasRole`, the `auth`/`admin` middlewares) only control what
  the interface *shows*; they are a convenience layer, not the security boundary — every mutating request
  is re-checked and enforced by the backend's own `auth`/`rbac` middleware regardless of what the frontend
  displays.

## Deployment

This service is also built and deployed as a container image (`saberdk/projecttrack-rbac-web`) alongside
the backend — see the root [`README.md`](../README.md) for `docker-compose`, and
[`k8s/README.md`](../k8s/README.md) for the Kubernetes manifests (including the extra steps needed on a
Killercoda lab cluster).