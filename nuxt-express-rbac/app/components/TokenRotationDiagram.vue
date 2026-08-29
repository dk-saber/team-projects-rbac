<script setup lang="ts">
interface Stage {
  label: string
  route: string
  jti: string
  title: string
  detail: string
}

const stages: Stage[] = [
  {
    label: 'Connection',
    route: 'POST /api/auth/login',
    jti: 'jti_A · issued',
    title: 'Pair emission',
    detail:
      "The password is verified, an access token (15 min) is returned in the JSON, and a refresh token (7 d) is set as an HttpOnly cookie on /api/auth/refresh."
  },
  {
    label: 'Utilisation',
    route: 'Authorization: Bearer <access>',
    jti: 'jti_A · actif',
    title: "The access token is circulating",
    detail:
      "Each call to /api/profile/me carries the access token in the header. No round trip to the database: the JWT signature is sufficient to verify the request."
  },
  {
    label: 'Expiration',
    route: '401 Access token expired',
    jti: 'jti_A · expires',
    title: 'Validity Window Expired',
    detail:
      "After 15 minutes, the auth.js middleware rejects the token. The frontend intercepts this 401 response and automatically triggers a token refresh."
  },
  {
    label: 'Rotation',
    route: 'POST /api/auth/refresh',
    jti: 'jti_A revoked → jti_B issued',
    title: 'Révocation + Reissuance',
    detail:
      "The refresh token stored in the cookie is validated against the database. If it is valid, jti_A is marked with revokedAt and replaced: a new jti_B is signed, and both the cookie and access token are renewed."
  }
]

const active = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const paused = ref(false)

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function start() {
  if (prefersReducedMotion()) return
  stop()
  timer = setInterval(() => {
    if (!paused.value) {
      active.value = (active.value + 1) % stages.length
    }
  }, 2800)
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

function select(i: number) {
  active.value = i
  paused.value = true
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div
    class="rounded-2xl border border-ink-600 bg-ink-800/60 shadow-panel"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <!-- Timeline des étapes -->
    <div class="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl bg-ink-600 sm:grid-cols-4">
      <button
        v-for="(stage, i) in stages"
        :key="stage.label"
        type="button"
        class="group relative flex flex-col gap-2 bg-ink-800 px-4 py-4 text-left transition"
        :class="active === i ? 'bg-ink-700' : 'hover:bg-ink-700/60'"
        @click="select(i)"
      >
        <span class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] transition"
            :class="
              active === i
                ? 'border-gold-400 bg-gold-500/15 text-gold-300'
                : 'border-ink-500 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-300'
            "
          >
            {{ i + 1 }}
          </span>
          <span
            class="text-sm font-medium transition"
            :class="active === i ? 'text-slate-100' : 'text-slate-400'"
          >
            {{ stage.label }}
          </span>
        </span>
        <span class="truncate font-mono text-[11px] text-slate-500">{{ stage.route }}</span>

        <span
          class="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gold-400 transition-transform duration-300"
          :class="active === i ? 'scale-x-100' : 'scale-x-0'"
        />
      </button>
    </div>

    <!-- Active step details -->
    <div class="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
      <div>
        <p class="font-mono text-xs uppercase tracking-wider text-signal-400">
          Étape {{ active + 1 }} / {{ stages.length }}
        </p>
        <h3 class="mt-2 font-display text-xl font-semibold text-slate-100">
          {{ stages[active].title }}
        </h3>
        <p class="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          {{ stages[active].detail }}
        </p>
      </div>

      <div class="flex min-w-[220px] flex-col gap-2 rounded-xl border border-ink-600 bg-ink-900 p-4 font-mono text-xs">
        <div class="flex items-center justify-between text-slate-500">
          <span>refresh_token</span>
          <span class="text-slate-600">RefreshToken doc</span>
        </div>
        <div
          class="flex items-center justify-between rounded-md border px-2.5 py-2 transition"
          :class="
            active === 3
              ? 'border-rust-500/40 bg-rust-500/10 text-rust-400'
              : 'border-ink-600 bg-ink-800 text-slate-300'
          "
        >
          <span>{{ stages[active].jti }}</span>
          <span class="h-1.5 w-1.5 rounded-full" :class="active === 3 ? 'bg-rust-500' : 'bg-signal-400'" />
        </div>
      </div>
    </div>
  </div>
</template>
