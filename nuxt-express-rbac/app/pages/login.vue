<script setup lang="ts">
useHead({ title: 'Connexion — RefreshJWT' })

const { login } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    router.push('/profile')
  } catch (err: any) {
    error.value = err?.data?.message || 'Invalid Credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-6 py-16">
    <p class="font-mono text-xs uppercase tracking-wider text-teal-400">POST /api/auth/login</p>
    <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">Login</h1>
    <p class="mt-2 text-sm text-slate-400">
      An access token is returned to you, and a refresh token is stored in an HttpOnly cookie.
    </p>

    <form class="mt-8 flex flex-col gap-4" @submit.prevent="onSubmit">
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

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label for="password" class="text-sm text-slate-300">Password</label>
          <NuxtLink to="/forgot-password" class="text-xs text-teal-400 hover:text-teal-300">
            Forgot password?
          </NuxtLink>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
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
        {{ loading ? 'Connexion…' : 'Login' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Don't Have an Account Yet?
      <NuxtLink to="/register" class="text-teal-400 hover:text-teal-300">Create an Account</NuxtLink>
    </p>
  </main>
</template>
