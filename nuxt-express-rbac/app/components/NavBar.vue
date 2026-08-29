<script setup lang="ts">
const { isLoggedIn, user, logout, hasRole } = useAuth()
const router = useRouter()
const menuOpen = ref(false)
const isAdmin = computed(() => hasRole('Admin'))

async function handleLogout() {
  await logout()
  menuOpen.value = false
  router.push('/')
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-ink-600/70 bg-ink-950/85 backdrop-blur">
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <NuxtLink to="/" class="flex items-center gap-2.5 font-display text-lg font-semibold text-slate-100">
        <span class="flex h-8 w-8 items-center justify-center rounded-md border border-teal-500/40 bg-teal-500/10 text-teal-400">
          <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 3l7 3.2v5.4c0 4.6-3 8.7-7 9.9-4-1.2-7-5.3-7-9.9V6.2L12 3z" stroke-linejoin="round" />
            <path d="M12 8v4.2M12 15.4h.01" stroke-linecap="round" />
          </svg>
        </span>
        <span>RefreshJWT<span class="text-teal-400">.</span></span>
      </NuxtLink>

      <div class="hidden items-center gap-1 md:flex">
        <NuxtLink
          to="/"
          class="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-ink-800 hover:text-slate-100"
          active-class="text-teal-400"
        >
          Welcome
        </NuxtLink>

        <template v-if="isLoggedIn">
          <NuxtLink
            to="/projects"
            class="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-ink-800 hover:text-slate-100"
            active-class="text-teal-400"
          >
            Projets
          </NuxtLink>
          <NuxtLink
            to="/profile"
            class="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-ink-800 hover:text-slate-100"
            active-class="text-teal-400"
          >
            Profile
          </NuxtLink>
          <NuxtLink
            v-if="isAdmin"
            to="/admin"
            class="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-ink-800 hover:text-slate-100"
            active-class="text-teal-400"
          >
            Admin
          </NuxtLink>
          <span class="mx-2 h-4 w-px bg-ink-600" />
          <span class="px-2 text-sm text-slate-500">{{ user?.username }}</span>
          <button
            type="button"
            class="rounded-md border border-ink-600 px-3 py-2 text-sm text-slate-300 transition hover:border-rust-500/50 hover:text-rust-400"
            @click="handleLogout"
          >
            Logout
          </button>
        </template>

        <template v-else>
          <NuxtLink
            to="/login"
            class="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-ink-800 hover:text-slate-100"
            active-class="text-teal-400"
          >
            Login
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="ml-1 rounded-md bg-teal-500 px-3.5 py-2 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400"
          >
            Create an account
          </NuxtLink>
        </template>
      </div>

      <button
        type="button"
        class="rounded-md border border-ink-600 p-2 text-slate-300 md:hidden"
        aria-label="Ouvrir le menu"
        @click="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
        </svg>
      </button>
    </nav>

    <div v-if="menuOpen" class="border-t border-ink-600/70 bg-ink-950 px-6 py-4 md:hidden">
      <div class="flex flex-col gap-1">
        <NuxtLink to="/" class="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-800" @click="menuOpen = false">Accueil</NuxtLink>
        <template v-if="isLoggedIn">
          <NuxtLink to="/projects" class="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-800" @click="menuOpen = false">Projets</NuxtLink>
          <NuxtLink to="/profile" class="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-800" @click="menuOpen = false">Profil</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin" class="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-800" @click="menuOpen = false">Admin</NuxtLink>
          <button type="button" class="mt-1 rounded-md border border-ink-600 px-3 py-2 text-left text-sm text-rust-400" @click="handleLogout">
            Logout
          </button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-ink-800" @click="menuOpen = false">Connexion</NuxtLink>
          <NuxtLink to="/register" class="mt-1 rounded-md bg-teal-500 px-3 py-2 text-sm font-medium text-ink-950" @click="menuOpen = false">
            Create an account
          </NuxtLink>
        </template>
      </div>
    </div>
  </header>
</template>
