# API — Suivi de projets (RBAC)

Base URL locale : `http://localhost:5000/api`

## Authentification

L'API utilise un **access token JWT** (courte durée, 15 min par défaut) et un
**refresh token** stocké dans un cookie `HttpOnly` (rotation à chaque refresh).

- L'access token peut être envoyé soit dans l'en-tête `Authorization: Bearer <token>`,
  soit automatiquement via le cookie `access_token` si vous le stockez côté client sous cette forme.
- Le refresh token est **toujours** géré par cookie `HttpOnly` (`refresh_token`, path `/api/auth/refresh`) — le frontend ne le manipule jamais directement.
- Toutes les requêtes vers des routes protégées doivent inclure `credentials: 'include'` (fetch) ou `withCredentials: true` (axios) pour que les cookies circulent.

Le payload de l'access token (et donc `req.user` côté backend) contient :

```json
{
  "id": "66f...",
  "username": "jdoe",
  "role": "Dev",
  "permissions": ["project:read", "project:update"],
  "direction": "Dir1",
  "department": "Dep1"
}
```

---

## RBAC — Rôles & permissions par défaut

Défini dans `scripts/seed.js`, modifiable à chaud via `/api/admin/roles`.

| Rôle    | Permissions par défaut                                              |
|---------|------------------------------------------------------------------------|
| Admin   | `*` (tout)                                                              |
| Devops  | `project:read`, `project:create`, `project:update`, `project:delete`, `project:deploy` |
| Dev     | `project:read`, `project:update`                                        |
| Test    | `project:read`                                                          |
| Ops     | `project:read`                                                          |

**Visibilité actuelle des projets : tout le monde voit tout** (`GET /api/projects` n'est pas filtré par rôle/département). Seul le **droit d'agir** (créer / modifier / supprimer) dépend des permissions ci-dessus.

---

## 1. Auth — `/api/auth`

### POST `/api/auth/register`
Public. Le rôle **n'est jamais fourni par le client** : un rôle par défaut (`Dev`, configurable via `DEFAULT_REGISTRATION_ROLE`) est assigné automatiquement.

```json
// Body
{
  "name": "Jean",
  "lastname": "Dupont",
  "username": "jdupont",
  "email": "jdupont@example.com",
  "password": "MotDePasse123!",
  "direction": "<directionId>",   // depuis GET /api/meta/directions
  "department": "<departmentId>"  // depuis GET /api/meta/departments
}
```
→ `201 { "message": "User created successfully" }`

### POST `/api/auth/login`
Public. Limité par `loginLimiter` (anti brute-force).
```json
// Body
{ "email": "jdupont@example.com", "password": "MotDePasse123!" }
```
→ `200`
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "66f...",
    "name": "Jean",
    "lastname": "Dupont",
    "username": "jdupont",
    "email": "jdupont@example.com",
    "direction": { "id": "...", "name": "Dir1", "label": "Dir1" },
    "department": { "id": "...", "name": "Dep1", "label": "Dep1" },
    "role": { "id": "...", "name": "Dev", "label": "Développeur", "permissions": ["project:read","project:update"] }
  }
}
```
Pose aussi le cookie `HttpOnly` `refresh_token`.

### POST `/api/auth/refresh`
Utilise le cookie `refresh_token` (rotation). Aucun body requis.
→ `200 { "accessToken": "eyJ..." }`

### POST `/api/auth/logout`
Révoque le refresh token courant et efface le cookie.
→ `200 { "message": "Logged out" }`

### POST `/api/auth/forgot-password`
```json
{ "email": "jdupont@example.com" }
```
Réponse générique dans tous les cas (anti-énumération d'emails).

### POST `/api/auth/reset-password`
```json
{ "token": "<reçu par email>", "newPassword": "NouveauMotDePasse123!" }
```
Invalide aussi toutes les sessions actives de l'utilisateur.

---

## 2. Meta — `/api/meta` (public, pour peupler les formulaires)

| Méthode | Route                    | Description                                   |
|--------:|--------------------------|------------------------------------------------|
| GET     | `/api/meta/roles`        | Rôles actifs (`_id`, `name`, `label`, `description`) |
| GET     | `/api/meta/directions`   | Directions actives                              |
| GET     | `/api/meta/departments`  | Départements actifs (avec `direction` peuplée)  |

Utilisées par le frontend pour peupler les dropdowns du formulaire d'inscription. *(Note : `/api/meta/roles` reste dispo en lecture, mais le rôle n'est plus soumis à l'inscription — voir plus haut.)*

---

## 3. Profile — `/api/profile` (authentifié)

### GET `/api/profile/me`
→ `200 { "user": { ...sans le mot de passe, role/direction/department peuplés } }`

---

## 4. Projets — `/api/projects` (authentifié)

| Méthode | Route                | Permission requise | Description                        |
|--------:|-----------------------|---------------------|--------------------------------------|
| GET     | `/api/projects`       | aucune (connecté)   | Liste tous les projets non archivés |
| GET     | `/api/projects/:id`   | aucune (connecté)   | Détail d'un projet                   |
| POST    | `/api/projects`       | `project:create`    | Créer un projet                      |
| PUT     | `/api/projects/:id`   | `project:update`    | Modifier un projet                   |
| DELETE  | `/api/projects/:id`   | `project:delete`    | Supprimer (archive, soft delete)     |

### POST `/api/projects`
```json
{
  "name": "Migration MongoDB",
  "description": "Passer de v9 à v10",
  "status": "in_progress",        // draft | in_progress | on_hold | completed | cancelled
  "startDate": "2026-09-01",
  "endDate": "2026-12-01",
  "direction": "<directionId>",   // optionnel
  "department": "<departmentId>", // optionnel
  "members": ["<userId>", "..."]  // optionnel
}
```
→ `201 { "message": "Projet créé", "project": { ... } }`

### PUT `/api/projects/:id`
Mêmes champs que POST, tous optionnels (mise à jour partielle).
→ `200 { "message": "Projet mis à jour", "project": { ... } }`

### DELETE `/api/projects/:id`
→ `200 { "message": "Projet supprimé (archivé)" }`

---

## 5. Admin — `/api/admin` (rôle `Admin` uniquement)

### Utilisateurs
| Méthode | Route                        | Description                          |
|--------:|-------------------------------|----------------------------------------|
| GET     | `/api/admin/users`            | Liste tous les utilisateurs            |
| GET     | `/api/admin/users/:id`        | Détail d'un utilisateur                |
| POST    | `/api/admin/users`            | Créer un utilisateur (rôle/direction/département choisis directement) |
| PUT     | `/api/admin/users/:id`        | Modifier les infos générales (hors mot de passe et rôle) |
| DELETE  | `/api/admin/users/:id`        | Désactiver un utilisateur (soft delete) — `?hard=true` pour supprimer définitivement |
| PUT     | `/api/admin/users/:id/role`   | Changer le rôle d'un utilisateur (body `{ "role": "<roleId>" }`) |

⚠️ Le changement de rôle ne prend effet qu'au prochain refresh/login de l'utilisateur concerné (le rôle est embarqué dans l'access token en cours). La désactivation (`DELETE` sans `hard`), elle, révoque immédiatement les refresh tokens actifs et bloque toute nouvelle connexion.

Exemple création d'utilisateur :
```json
POST /api/admin/users
{
  "name": "Jean",
  "lastname": "Dupont",
  "username": "jdupont",
  "email": "jdupont@example.com",
  "password": "MotDePasse123!",
  "direction": "<directionId>",
  "department": "<departmentId>",
  "role": "<roleId>",
  "isActive": true
}
```

Exemple modification :
```json
PUT /api/admin/users/<userId>
{ "username": "jdupont2", "isActive": false }
```

### Rôles / Directions / Départements (CRUD complet, même structure pour les 3)
| Méthode | Route                          |
|--------:|----------------------------------|
| GET     | `/api/admin/roles`                |
| POST    | `/api/admin/roles`                |
| PUT     | `/api/admin/roles/:id`            |
| DELETE  | `/api/admin/roles/:id` *(désactive, ne supprime pas)* |
| GET     | `/api/admin/directions`           |
| POST    | `/api/admin/directions`           |
| PUT     | `/api/admin/directions/:id`       |
| DELETE  | `/api/admin/directions/:id`       |
| GET     | `/api/admin/departments`          |
| POST    | `/api/admin/departments`          |
| PUT     | `/api/admin/departments/:id`      |
| DELETE  | `/api/admin/departments/:id`      |

Exemple création de rôle :
```json
POST /api/admin/roles
{
  "name": "QA-Lead",
  "label": "Responsable QA",
  "permissions": ["project:read", "project:update"]
}
```

Exemple création de département rattaché à une direction :
```json
POST /api/admin/departments
{ "name": "Dep4", "label": "Nouveau département", "direction": "<directionId>" }
```

---

## Codes d'erreur communs

| Code | Signification                                  |
|-----:|--------------------------------------------------|
| 400  | Champ requis manquant / invalide (validation)     |
| 401  | Non authentifié / token absent, invalide ou expiré |
| 403  | Authentifié mais rôle/permission insuffisant      |
| 404  | Ressource introuvable                              |
| 500  | Erreur serveur                                      |

---

## Variables d'environnement liées au RBAC

| Variable                    | Rôle                                                        | Défaut       |
|-------------------------------|--------------------------------------------------------------|--------------|
| `DEFAULT_REGISTRATION_ROLE`   | Rôle assigné automatiquement à l'inscription publique         | `Dev`        |
| `SEED_ADMIN_EMAIL`            | Email du compte Admin créé par `npm run seed`                 | `admin@example.com` |
| `SEED_ADMIN_PASSWORD`         | Mot de passe du compte Admin créé par `npm run seed`           | `ChangeMe123!` |
