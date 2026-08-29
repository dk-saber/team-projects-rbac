export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { isLoggedIn, initialized, initAuth, hasRole } = useAuth()

  if (!initialized.value) {
    await initAuth()
  }

  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }

  if (!hasRole('Admin')) {
    return navigateTo('/profile')
  }
})
