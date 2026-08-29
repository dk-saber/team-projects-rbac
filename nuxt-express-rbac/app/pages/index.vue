<script setup lang="ts">
useHead({
  title: 'ProjectTrack RBAC — Project Tracking with Role-Based Access Control'
})

const features = [
  {
    title: 'Project Tracking',
    text: 'Create, update and follow projects through their lifecycle — draft, in progress, on hold, completed or cancelled. Everyone sees every project; only authorized roles can act on them.'
  },
  {
    title: 'Role-Based Access Control',
    text: 'Five built-in roles out of the box (Admin, Devops, Dev, Test, Ops), each carrying a distinct set of permissions that decide who can create, edit, or delete.'
  },
  {
    title: 'Organizational Structure',
    text: 'Projects and users are attached to a Direction and a Department. Both are backend-driven reference data, not hardcoded lists.'
  },
  {
    title: 'Evolvable by Design',
    text: 'An Admin can add a new role, direction or department — or change any permission — from the console at any time, with zero code change and no redeploy.'
  },
  {
    title: 'Admin Console',
    text: 'Full CRUD on users, roles, directions and departments: create accounts directly, reassign roles, deactivate access, all from one screen.'
  },
  {
    title: 'Secure by Default',
    text: 'Authentication runs on short-lived JWT access tokens with rotating, HttpOnly refresh tokens — detailed further down this page.'
  }
]

const steps = [
  {
    title: 'Sign up',
    text: 'A new user registers and picks their Direction and Department. A default role is assigned automatically by the backend — never chosen by the user.'
  },
  {
    title: 'An Admin assigns the right role',
    text: 'From the Admin console, an Admin reviews the account and sets its actual role — Dev, Test, Ops, Devops, or Admin — via a dedicated, audited endpoint.'
  },
  {
    title: 'Permissions decide what you can do',
    text: 'Viewing the project list is open to every authenticated user. Creating, editing or deleting a project depends entirely on the permissions attached to your role.'
  },
  {
    title: 'The organization stays flexible',
    text: 'Anytime the company changes — a new department, a new role, a permission that needs adjusting — an Admin updates it from the console. The rest of the app follows automatically.'
  }
]

const permissionMatrix = [
  { role: 'Admin', read: true, create: true, update: true, del: true, extra: 'Full access (*)' },
  { role: 'Devops', read: true, create: true, update: true, del: true, extra: 'Deploy' },
  { role: 'Dev', read: true, create: false, update: true, del: false, extra: '—' },
  { role: 'Test', read: true, create: false, update: false, del: false, extra: '—' },
  { role: 'Ops', read: true, create: false, update: false, del: false, extra: '—' }
]

const securityFeatures = [
  {
    title: 'Rotation on Every Use',
    text: 'Each call to /api/auth/refresh revokes the presented refresh token (revokedAt) and issues a new one. As a result, the same refresh token is never used more than once.'
  },
  {
    title: 'Replay Detection',
    text: 'If a refresh token that has already been revoked is presented again (theft, duplication, or replay attack), the database recognizes it and rejects the request with a 401 response, indicating that a session may have been compromised.'
  },
  {
    title: 'HttpOnly Cookie, Limited Scope',
    text: 'The refresh token is never accessible from JavaScript. It is stored in a cookie configured with path=/api/auth/refresh, SameSite=Strict, and Secure in production.'
  },
  {
    title: 'Token Fingerprint, Not the Plain Token',
    text: 'utils/tokens.js stores only hashToken(refreshToken) (SHA-256) in the database. As a result, a MongoDB database leak would not directly expose any usable refresh tokens.'
  },
  {
    title: 'Short-Lived, Stateless Access Token',
    text: 'The access token (15 minutes) is self-contained: the auth.js middleware validates it using only its signature and expiration time, without requiring a database lookup. This keeps the API fast between refresh token rotations.'
  },
  {
    title: 'Targeted Revocation',
    text: 'Each refresh token is associated with a unique jti. Revoking a session (logout, compromise, etc.) affects only that specific session and does not impact other devices that are still connected.'
  }
]

const compareRows = [
  { dim: 'Lifetime', simple: 'Single Token, Long Lifetime (Days)', rotation: 'Short-Lived Access Token (15 min) + Refresh Token Rotated on Every Use' },
  { dim: 'Token Theft', simple: 'Remains Valid Until Expiration', rotation: 'Detected on the Next Refresh if the Stolen Token Is Replayed' },
  { dim: 'Storage', simple: 'Often stored in plaintext on the client side (e.g., localStorage)', rotation: 'Refresh Token in an HttpOnly Cookie, Access Token Stored in Memory Only' },
  { dim: 'Revocation', simple: 'Difficult Without a Global Revocation List', rotation: 'Immediate, Per-jti Revocation Without Invalidating Other Sessions' }
]
</script>

<template>
  <main>
    <!-- HERO -->
    <section class="relative overflow-hidden border-b border-ink-600/70">
      <div class="mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
        <p class="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800/80 px-3 py-1 font-mono text-xs text-teal-400">
          <span class="h-1.5 w-1.5 rounded-full bg-teal-400" />
          Project Tracking · Role-Based Access Control
        </p>

        <h1 class="mt-6 text-balance font-display text-4xl font-semibold leading-[1.1] text-slate-100 sm:text-5xl">
          Track your projects.
          <span class="text-teal-400">Control access by role.</span>
        </h1>

        <p class="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-slate-400 sm:text-lg">
          A project tracking application built around Role-Based Access Control. Every project is
          visible to everyone; who can create, edit, or delete one depends entirely on their role —
          Admin, Devops, Dev, Test, or Ops — mapped onto your organization's Directions and Departments.
        </p>

        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink
            to="/register"
            class="rounded-lg bg-teal-500 px-5 py-3 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400"
          >
            Create an Account
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="rounded-lg border border-ink-600 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-400"
          >
            Login
          </NuxtLink>
        </div>

        <dl class="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-600 pt-6 font-mono text-xs text-slate-500">
          <div>
            <dt>Default roles</dt>
            <dd class="mt-1 text-sm text-slate-200">5</dd>
          </div>
          <div>
            <dt>Reference data</dt>
            <dd class="mt-1 text-sm text-slate-200">Backend-driven</dd>
          </div>
          <div>
            <dt>Org structure</dt>
            <dd class="mt-1 text-sm text-slate-200">Directions · Departments</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="mx-auto max-w-6xl px-6 py-20">
      <div class="mb-10 max-w-2xl">
        <p class="font-mono text-xs uppercase tracking-wider text-teal-400">What You Can Do</p>
        <h2 class="mt-3 font-display text-3xl font-semibold text-slate-100">Everything a Project Tracker Needs, Access-Controlled</h2>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="rounded-xl border border-ink-600 bg-ink-800/50 p-5 transition hover:border-ink-500"
        >
          <h3 class="font-display text-base font-semibold text-slate-100">{{ feature.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ feature.text }}</p>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="border-y border-ink-600/70 bg-ink-900/40">
      <div class="mx-auto max-w-6xl px-6 py-20">
        <div class="mb-10 max-w-2xl">
          <p class="font-mono text-xs uppercase tracking-wider text-teal-400">Mode of Operation</p>
          <h2 class="mt-3 font-display text-3xl font-semibold text-slate-100">How It Works</h2>
        </div>

        <ol class="grid gap-5 sm:grid-cols-2">
          <li
            v-for="(step, i) in steps"
            :key="step.title"
            class="flex gap-4 rounded-xl border border-ink-600 bg-ink-800/50 p-5"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 font-mono text-sm font-semibold text-teal-300">
              {{ i + 1 }}
            </span>
            <div>
              <h3 class="font-display text-base font-semibold text-slate-100">{{ step.title }}</h3>
              <p class="mt-1.5 text-sm leading-relaxed text-slate-400">{{ step.text }}</p>
            </div>
          </li>
        </ol>

        <!-- Permission matrix -->
        <div class="mt-10">
          <p class="mb-4 text-sm text-slate-400">
            Default permissions per role, as configured by <code class="font-mono text-slate-300">scripts/seed.js</code> — fully adjustable afterwards from the Admin console.
          </p>
          <div class="dtable-shell">
            <div class="overflow-x-auto">
              <table class="dtable">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Read Projects</th>
                    <th>Create</th>
                    <th>Update</th>
                    <th>Delete</th>
                    <th>Extra</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in permissionMatrix" :key="row.role">
                    <td><RoleBadge :name="row.role" /></td>
                    <td :class="row.read ? 'text-emerald-400' : 'text-slate-600'">{{ row.read ? '✓' : '—' }}</td>
                    <td :class="row.create ? 'text-emerald-400' : 'text-slate-600'">{{ row.create ? '✓' : '—' }}</td>
                    <td :class="row.update ? 'text-emerald-400' : 'text-slate-600'">{{ row.update ? '✓' : '—' }}</td>
                    <td :class="row.del ? 'text-emerald-400' : 'text-slate-600'">{{ row.del ? '✓' : '—' }}</td>
                    <td class="text-slate-400">{{ row.extra }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= UNDER THE HOOD: JWT SECURITY ================= -->
    <section class="mx-auto max-w-6xl px-6 py-20">
      <div class="mb-10 max-w-2xl">
        <p class="font-mono text-xs uppercase tracking-wider text-teal-400">Under the Hood</p>
        <h2 class="mt-3 font-display text-3xl font-semibold text-slate-100">Authentication: A Refresh Token Used Only Once</h2>
        <p class="mt-3 text-sm leading-relaxed text-slate-400">
          Every role and permission above is enforced on top of a session model designed to limit the damage
          of a stolen token: a 15-minute access token kept only in frontend memory, and a refresh token stored
          in an HttpOnly cookie, revoked and replaced on every use.
        </p>
      </div>

      <JwtAnatomy />
    </section>

    <!-- DIAGRAMME DE ROTATION -->
    <section class="mx-auto max-w-6xl px-6 pb-20">
      <div class="mb-10 max-w-2xl">
        <p class="font-mono text-xs uppercase tracking-wider text-teal-400">The Rotation Lifecycle</p>
        <h2 class="mt-3 font-display text-3xl font-semibold text-slate-100">How One Token Replaces Another</h2>
        <p class="mt-3 text-sm leading-relaxed text-slate-400">
          The four steps below correspond exactly to the routes implemented in <code class="font-mono text-slate-300">jwtRefreshToken-be</code>.
          The active step rotates automatically. Click a step to pin it.
        </p>
      </div>

      <TokenRotationDiagram />
    </section>

    <!-- POURQUOI LA ROTATION -->
    <section class="border-y border-ink-600/70 bg-ink-900/40">
      <div class="mx-auto max-w-6xl px-6 py-20">
        <div class="mb-10 max-w-2xl">
          <p class="font-mono text-xs uppercase tracking-wider text-teal-400">Why Rotate Refresh Tokens</p>
          <h2 class="mt-3 font-display text-3xl font-semibold text-slate-100">What Refresh Token Rotation Actually Brings</h2>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="feature in securityFeatures"
            :key="feature.title"
            class="rounded-xl border border-ink-600 bg-ink-800/50 p-5 transition hover:border-ink-500"
          >
            <h3 class="font-display text-base font-semibold text-slate-100">{{ feature.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-400">{{ feature.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- COMPARAISON -->
    <section class="mx-auto max-w-6xl px-6 py-20">
      <div class="mb-10 max-w-2xl">
        <p class="font-mono text-xs uppercase tracking-wider text-teal-400">Compared to a Single Token</p>
        <h2 class="mt-3 font-display text-3xl font-semibold text-slate-100">Rotation vs. Static Refresh Token</h2>
      </div>

      <div class="overflow-hidden rounded-xl border border-ink-600">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="bg-ink-800 text-slate-400">
              <th class="px-5 py-3 font-medium">Dimension</th>
              <th class="px-5 py-3 font-medium">Static Token</th>
              <th class="px-5 py-3 font-medium text-teal-400">With Rotation (This Project)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row.dim" class="border-t border-ink-600">
              <td class="px-5 py-4 font-medium text-slate-200">{{ row.dim }}</td>
              <td class="px-5 py-4 text-slate-500">{{ row.simple }}</td>
              <td class="px-5 py-4 text-slate-300">{{ row.rotation }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- CTA FINAL -->
    <section class="mx-auto max-w-6xl px-6 pb-24">
      <div class="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-ink-800 to-ink-900 p-8 text-center sm:p-12">
        <h2 class="font-display text-2xl font-semibold text-slate-100 sm:text-3xl">See It in Action</h2>
        <p class="mx-auto mt-3 max-w-lg text-sm text-slate-400">
          Create an account, have an Admin assign you a role from the console, then open the
          Projects page to see your permissions in effect.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <NuxtLink
            to="/register"
            class="rounded-lg bg-teal-500 px-5 py-3 text-sm font-medium text-ink-950 transition hover:bg-teal-400"
          >
            Start
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
