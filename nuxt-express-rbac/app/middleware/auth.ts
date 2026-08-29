export default defineNuxtRouteMiddleware(async () => {
  // The refresh token lives in an HttpOnly cookie: only the browser can
// present it to the backend. Therefore, session restoration can only
// be performed on the client side.
  if (import.meta.server) return

  const { isLoggedIn, initialized, initAuth } = useAuth()

  if (!initialized.value) {
    await initAuth()
  }

  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
})
