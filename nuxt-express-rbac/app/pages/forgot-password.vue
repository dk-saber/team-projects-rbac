<script setup lang="ts">
useHead({ title: 'Forgot password — RefreshJWT' })

const { forgotPassword } = useAuth()

const email = ref('')
const error = ref('')
const submitted = ref(false)
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await forgotPassword(email.value)
    // The backend always answers the same way, whether the email exists or not,
    // so the UI never reveals which accounts are registered.
    submitted.value = true
  } catch (err: any) {
    error.value = err?.data?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-6 py-16">
    <p class="font-mono text-xs uppercase tracking-wider text-teal-400">POST /api/auth/forgot-password</p>
    <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">Reset your password</h1>
    <p class="mt-2 text-sm text-slate-400">
      Enter your email address. If it matches an account, we'll send a single-use link that expires in 15 minutes.
    </p>

    <div v-if="submitted" class="mt-8 rounded-lg border border-signal-500/30 bg-signal-500/10 px-4 py-3 text-sm text-signal-300">
      If an account exists for <span class="text-slate-100">{{ email }}</span>, a reset link is on its way. Check your inbox.
    </div>

    <form v-else class="mt-8 flex flex-col gap-4" @submit.prevent="onSubmit">
      <div>
        <label for="email" class="mb-1.5 block text-sm text-slate-300">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500"
          placeholder="example@mail.com"
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
        {{ loading ? 'Sending…' : 'Send reset link' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Remembered your password?
      <NuxtLink to="/login" class="text-teal-400 hover:text-teal-300">Back to login</NuxtLink>
    </p>
  </main>
</template>
