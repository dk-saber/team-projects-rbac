<script setup lang="ts">
useHead({ title: 'Créer un compte — RefreshJWT' })

const { register } = useAuth()
const { directions, departments, loadRegistrationMeta } = useMeta()
const router = useRouter()

const form = reactive({
  name: '',
  lastname: '',
  username: '',
  email: '',
  password: '',
  direction: '',
  department: ''
})

const error = ref('')
const success = ref(false)
const loading = ref(false)
const metaLoading = ref(true)
const metaError = ref('')

onMounted(async () => {
  try {
    await loadRegistrationMeta()
  } catch (err: any) {
    metaError.value = err?.data?.message || 'Impossible de charger les directions/départements.'
  } finally {
    metaLoading.value = false
  }
})

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await register({ ...form })
    success.value = true
    setTimeout(() => router.push('/login'), 1200)
  } catch (err: any) {
    error.value = err?.data?.message || 'Unable to Create Account.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-[calc(100vh-140px)] max-w-xl flex-col justify-center px-6 py-16">
    <p class="font-mono text-xs uppercase tracking-wider text-teal-400">POST /api/auth/register</p>
    <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">Create an Account</h1>
    <p class="mt-2 text-sm text-slate-400">The password is hashed with bcrypt before being stored.</p>
    <p class="mt-1 text-xs text-slate-500">
      A default role is assigned automatically by the backend. An Admin can change it afterwards.
    </p>

    <p v-if="metaError" class="mt-4 rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400">
      {{ metaError }}
    </p>

    <form class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1.5 block text-sm text-slate-300">First Name</label>
        <input v-model="form.name" required class="input" placeholder="Saber" />
      </div>
      <div>
        <label class="mb-1.5 block text-sm text-slate-300">Last Name</label>
        <input v-model="form.lastname" required class="input" placeholder="Dkhili" />
      </div>

      <div>
        <label class="mb-1.5 block text-sm text-slate-300">User name</label>
        <input v-model="form.username" required class="input" placeholder="sdkhili" />
      </div>
      <div>
        <label class="mb-1.5 block text-sm text-slate-300">Email</label>
        <input v-model="form.email" type="email" required class="input" placeholder="example@mail.com" />
      </div>

      <div class="sm:col-span-2">
        <label class="mb-1.5 block text-sm text-slate-300">Password</label>
        <input v-model="form.password" type="password" required minlength="6" class="input" placeholder="••••••••" />
      </div>

      <div>
        <label class="mb-1.5 block text-sm text-slate-300">Direction</label>
        <select v-model="form.direction" required class="input" :disabled="metaLoading">
          <option value="" disabled>{{ metaLoading ? 'Loading…' : 'Select a direction' }}</option>
          <option v-for="d in directions" :key="d._id" :value="d._id">
            {{ d.label || d.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="mb-1.5 block text-sm text-slate-300">Department</label>
        <select v-model="form.department" required class="input" :disabled="metaLoading">
          <option value="" disabled>{{ metaLoading ? 'Loading…' : 'Select a department' }}</option>
          <option v-for="d in departments" :key="d._id" :value="d._id">
            {{ d.label || d.name }}
          </option>
        </select>
      </div>

      <p v-if="error" class="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400 sm:col-span-2">
        {{ error }}
      </p>
      <p v-if="success" class="rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-sm text-signal-300 sm:col-span-2">
        Registration Successful — Redirecting to Login...
      </p>

      <button
        type="submit"
        :disabled="loading || metaLoading"
        class="mt-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400 disabled:opacity-60 sm:col-span-2"
      >
        {{ loading ? 'Creating Your Account...' : 'Create My Account' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Already Have an Account?
      <NuxtLink to="/login" class="text-teal-400 hover:text-teal-300">Sign In</NuxtLink>
    </p>
  </main>
</template>

<style scoped>
.input {
  @apply w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500;
}
</style>
