# jwtRefreshToken-fe

Frontend Nuxt 4 + Tailwind CSS pour le projet `jwtRefreshToken-be`. La page d'accueil explique et illustre
la **rotation de refresh token** utilisée par l'API (access token de 15 min, refresh token en cookie
HttpOnly, révoqué et remplacé à chaque `/api/auth/refresh`).

## Fonctionnalités

- **Accueil (`/`)** — pédagogie sur la rotation de refresh token : diagramme animé des 4 étapes
  (connexion, utilisation, expiration, rotation), anatomie d'un JWT, comparaison avec un token statique,
  points de sécurité concrets du projet.
- **Inscription (`/register`)** — formulaire aligné sur le modèle `User` du backend.
- **Connexion (`/login`)** — `POST /api/auth/login`, stocke l'access token en mémoire uniquement.
- **Profil (`/profile`)** — route protégée (`middleware: auth`), affiche les infos utilisateur, décode et
  affiche l'expiration de l'access token courant, et permet de déclencher une rotation manuelle.
- **Session silencieuse** — au chargement de l'app, tentative de `POST /api/auth/refresh` (cookie
  HttpOnly) pour restaurer la session sans redemander les identifiants.
- **Intercepteur 401** — `useApi().authFetch` rejoue automatiquement une requête après un refresh
  silencieux si l'access token a expiré.

## Prérequis

- Node.js 18+
- Le backend `jwtRefreshToken-be` démarré sur `http://localhost:5000` (CORS déjà configuré côté backend
  pour `http://localhost:3000` avec `credentials: true`).

## Installation

```bash
npm install
cp .env.example .env
```

`.env` :

```env
NUXT_PUBLIC_API_BASE=http://localhost:5000/api
```

## Développement

```bash
npm run dev
```

L'app tourne sur `http://localhost:3000`.

## Build

```bash
npm run build
npm run preview
```

## Structure (Nuxt 4 — dossier `app/`)

```text
jwtRefreshToken-fe/
├── app/
│   ├── app.vue
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── NavBar.vue
│   │   ├── SiteFooter.vue
│   │   ├── TokenRotationDiagram.vue   # diagramme signature de la rotation
│   │   └── JwtAnatomy.vue
│   ├── composables/
│   │   ├── useAuth.ts                 # état d'auth, login/register/refresh/logout
│   │   └── useApi.ts                  # fetch authentifié avec retry sur 401
│   ├── middleware/
│   │   └── auth.ts                    # protège /profile
│   ├── pages/
│   │   ├── index.vue
│   │   ├── login.vue
│   │   ├── register.vue
│   │   └── profile.vue
│   └── plugins/
│       └── auth.client.ts             # restauration de session au démarrage
├── nuxt.config.ts
├── tailwind.config.ts
└── package.json
```

## Notes de sécurité côté front

- L'access token n'est **jamais** persisté (pas de `localStorage`/`sessionStorage`) : il vit en mémoire
  via `useState`, donc il disparaît à chaque rechargement complet — d'où la restauration silencieuse via
  le refresh token en cookie.
- Le refresh token n'est jamais manipulé par le JavaScript front : il est géré entièrement par le cookie
  `HttpOnly` posé par le backend.
- Tous les appels vers `/api/auth/*` et `/api/profile/*` passent `credentials: 'include'` pour que le
  cookie soit envoyé.
