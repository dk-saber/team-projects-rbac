<script setup lang="ts">
useHead({ title: 'Set a new password — RefreshJWT' })

const { resetPassword } = useAuth()
const route = useRoute()
const router = useRouter()

const token = computed(() => (route.query.token as string) || '')

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)

async function onSubmit() {
  error.value = ''

  if (!token.value) {
    error.value = 'Missing or invalid reset link.'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'Password must be at least 8 characters long.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  try {
    await resetPassword(token.value, newPassword.value)
    success.value = true
    setTimeout(() => router.push('/login'), 1500)
  } catch (err: any) {
    error.value = err?.data?.message || 'This reset link is invalid or has expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-6 py-16">
    <p class="font-mono text-xs uppercase tracking-wider text-teal-400">POST /api/auth/reset-password</p>
    <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">Set a new password</h1>
    <p class="mt-2 text-sm text-slate-400">
      This link is valid for 15 minutes and can only be used once.
    </p>

    <p v-if="!token" class="mt-8 rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400">
      No reset token found in the link. Please request a new one.
      <NuxtLink to="/forgot-password" class="text-teal-400 hover:text-teal-300">Request a new link</NuxtLink>
    </p>

    <div v-else-if="success" class="mt-8 rounded-lg border border-signal-500/30 bg-signal-500/10 px-4 py-3 text-sm text-signal-300">
      Password reset — redirecting you to login…
    </div>

    <form v-else class="mt-8 flex flex-col gap-4" @submit.prevent="onSubmit">
      <div>
        <label for="newPassword" class="mb-1.5 block text-sm text-slate-300">New password</label>
        <input
          id="newPassword"
          v-model="newPassword"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label for="confirmPassword" class="mb-1.5 block text-sm text-slate-300">Confirm new password</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="mt-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400 disabled:opacity-60"
      >
        {{ loading ? 'Saving…' : 'Set new password' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Remembered your password?
      <NuxtLink to="/login" class="text-teal-400 hover:text-teal-300">Back to login</NuxtLink>
    </p>
  </main>
</template>
