<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Profile — RefreshJWT' })

const { user, accessToken, refresh } = useAuth()

const refreshing = ref(false)
const lastRefreshedAt = ref<string | null>(null)
const refreshError = ref('')

interface DecodedAccessToken {
  id?: string
  username?: string
  role?: string
  permissions?: string[]
  direction?: string
  department?: string
  iat?: number
  exp?: number
}

const decoded = computed<DecodedAccessToken | null>(() => {
  if (!accessToken.value) return null
  try {
    const payload = accessToken.value.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
})

const expiresIn = computed(() => {
  if (!decoded.value?.exp) return null
  const seconds = decoded.value.exp - Math.floor(Date.now() / 1000)
  return seconds > 0 ? seconds : 0
})

function formatDate(unixSeconds?: number) {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleString('fr-FR')
}

async function manualRefresh() {
  refreshing.value = true
  refreshError.value = ''
  try {
    await refresh()
    lastRefreshedAt.value = new Date().toLocaleTimeString('fr-FR')
  } catch (err: any) {
    refreshError.value = err?.data?.message || 'Refresh failed.'
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-16">
    <p class="font-mono text-xs uppercase tracking-wider text-teal-400">GET /api/profile/me</p>
    <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">
      Welcome {{ user?.name }} 👋
    </h1>
    <p class="mt-2 text-sm text-slate-400">
      This page is protected by the <code class="font-mono text-slate-300">auth</code> middleware and 
      requires a valid Bearer access token.
    </p>

    <div class="mt-10 grid gap-6 lg:grid-cols-2">
      <!-- Infos utilisateur -->
      <section class="rounded-xl border border-ink-600 bg-ink-800/50 p-6">
        <h2 class="font-display text-lg font-semibold text-slate-100">Identity</h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between border-b border-ink-600/70 pb-2">
            <dt class="text-slate-500">Full Name</dt>
            <dd class="text-slate-200">{{ user?.name }} {{ user?.lastname }}</dd>
          </div>
          <div class="flex justify-between border-b border-ink-600/70 pb-2">
            <dt class="text-slate-500">User name</dt>
            <dd class="font-mono text-slate-200">{{ user?.username }}</dd>
          </div>
          <div class="flex justify-between border-b border-ink-600/70 pb-2">
            <dt class="text-slate-500">Email</dt>
            <dd class="text-slate-200">{{ user?.email }}</dd>
          </div>
          <div class="flex justify-between border-b border-ink-600/70 pb-2">
            <dt class="text-slate-500">Division / Department</dt>
            <dd class="text-slate-200">{{ user?.direction?.label || user?.direction?.name }} · {{ user?.department?.label || user?.department?.name }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Role</dt>
            <dd>
              <span class="rounded-full border border-teal-500/40 bg-teal-500/10 px-2.5 py-0.5 text-xs text-teal-300">
                {{ user?.role?.label || user?.role?.name }}
              </span>
            </dd>
          </div>
          <div v-if="user?.role?.permissions?.length" class="flex flex-col gap-2 border-t border-ink-600/70 pt-3">
            <dt class="text-slate-500">Permissions</dt>
            <dd class="flex flex-wrap gap-1.5">
              <span
                v-for="perm in user.role.permissions"
                :key="perm"
                class="rounded-full border border-ink-600 bg-ink-900 px-2 py-0.5 font-mono text-[11px] text-slate-300"
              >
                {{ perm }}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Access token en direct -->
      <section class="rounded-xl border border-ink-600 bg-ink-800/50 p-6">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-slate-100">Current Access Token</h2>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs"
            :class="expiresIn && expiresIn > 0 ? 'bg-signal-500/10 text-signal-300' : 'bg-rust-500/10 text-rust-400'"
          >
            {{ expiresIn !== null ? `expire dans ${expiresIn}s` : '—' }}
          </span>
        </div>

        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between border-b border-ink-600/70 pb-2">
            <dt class="text-slate-500">Issued At</dt>
            <dd class="font-mono text-xs text-slate-300">{{ formatDate(decoded?.iat) }}</dd>
          </div>
          <div class="flex justify-between border-b border-ink-600/70 pb-2">
            <dt class="text-slate-500">Expires At</dt>
            <dd class="font-mono text-xs text-slate-300">{{ formatDate(decoded?.exp) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Encoded Role</dt>
            <dd class="font-mono text-xs text-slate-300">{{ decoded?.role ?? '—' }}</dd>
          </div>
        </dl>

        <button
          type="button"
          :disabled="refreshing"
          class="mt-5 w-full rounded-lg border border-signal-500/40 bg-signal-500/10 px-4 py-2.5 text-sm font-medium text-signal-300 transition hover:bg-signal-500/20 disabled:opacity-60"
          @click="manualRefresh"
        >
          {{ refreshing ? 'Rotation in Progress…' : 'Trigger a Rotation Now' }}
        </button>

        <p v-if="lastRefreshedAt" class="mt-2 text-xs text-slate-500">
          New Access Token Obtained At {{ lastRefreshedAt }} — The refresh token stored in the cookie has also been replaced on the server side..
        </p>
        <p v-if="refreshError" class="mt-2 text-xs text-rust-400">{{ refreshError }}</p>
      </section>
    </div>
  </main>
</template>
