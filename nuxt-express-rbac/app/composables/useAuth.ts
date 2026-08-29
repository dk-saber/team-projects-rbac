export interface AuthRef {
  id: string
  name: string
  label?: string
}

export interface AuthRole extends AuthRef {
  permissions?: string[]
}

export interface AuthUser {
  id: string
  name: string
  lastname: string
  username: string
  email: string
  direction: AuthRef
  department: AuthRef
  role: AuthRole
}

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

interface RefreshResponse {
  accessToken: string
}

interface MessageResponse {
  message: string
}

/**
 * Authentication state shared across the entire application.
 *
 * - The access token lives only in memory (useState): it is never stored in
 *   localStorage, reducing exposure in the event of an XSS vulnerability.
 * - The refresh token is never handled on the client side: it is stored in an
 *   HttpOnly cookie set by the backend on /api/auth/refresh.
 */
export const useAuth = () => {
  const user = useState<AuthUser | null>('auth_user', () => null)
  const accessToken = useState<string | null>('auth_access_token', () => null)
  const initialized = useState<boolean>('auth_initialized', () => false)
  const authLoading = useState<boolean>('auth_loading', () => false)

  const config = useRuntimeConfig()
  const base = config.public.apiBase as string

  const isLoggedIn = computed(() => !!accessToken.value)

  /**
   * Checks whether the current user's role grants one of the given
   * permissions (mirrors the backend's authorizePermissions middleware,
   * including the '*' wildcard used by the Admin role).
   */
  function hasPermission(...required: string[]) {
    const perms = user.value?.role?.permissions || []
    if (perms.includes('*')) return true
    return required.some((p) => perms.includes(p))
  }

  function hasRole(...roles: string[]) {
    return !!user.value?.role?.name && roles.includes(user.value.role.name)
  }

  async function register(payload: {
    name: string
    lastname: string
    username: string
    email: string
    password: string
    direction: string // Direction _id, from GET /api/meta/directions
    department: string // Department _id, from GET /api/meta/departments
  }) {
    // Note: `role` is intentionally NOT part of this payload. The backend
    // always assigns a default role at registration (see DEFAULT_REGISTRATION_ROLE) ;
    // only an Admin can change it afterwards via PUT /api/admin/users/:id/role.
    return await $fetch(`${base}/auth/register`, {
      method: 'POST',
      body: payload
    })
  }

  async function login(email: string, password: string) {
    const data = await $fetch<LoginResponse>(`${base}/auth/login`, {
      method: 'POST',
      body: { email, password },
      credentials: 'include'
    })
    accessToken.value = data.accessToken
    user.value = data.user
    initialized.value = true
    return data
  }

  /**
 * Exchanges the refresh token (stored in an HttpOnly cookie) for a new access token.
 * On the backend, the previous refresh token is revoked and a new one is issued
 * and set again in a cookie: this is known as token rotation.
 */
  async function refresh() {
    const data = await $fetch<RefreshResponse>(`${base}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
    accessToken.value = data.accessToken
    return data.accessToken
  }

  async function logout() {
    try {
      await $fetch(`${base}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } finally {
      accessToken.value = null
      user.value = null
    }
  }

  /**
   * Requests a password reset link. The backend always returns the same
   * generic message, whether or not the email is linked to an account,
   * to prevent account enumeration.
   */
  async function forgotPassword(email: string) {
    return await $fetch<MessageResponse>(`${base}/auth/forgot-password`, {
      method: 'POST',
      body: { email }
    })
  }

  /**
   * Submits a new password along with the single-use token received by email.
   * The token is only valid for 15 minutes and can be used once.
   */
  async function resetPassword(token: string, newPassword: string) {
    return await $fetch<MessageResponse>(`${base}/auth/reset-password`, {
      method: 'POST',
      body: { token, newPassword }
    })
  }

  async function fetchMe() {
    const data = await $fetch<{ user: AuthUser }>(`${base}/profile/me`, {
      method: 'GET',
      credentials: 'include',
      headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}
    })
    user.value = data.user
    return data.user
  }

  /**
   * Attempts to restore an existing session when the application loads.
   * If a valid refresh_token cookie is still present, a new access token is
   * retrieved silently, without prompting the user to log in again.
   */
  async function initAuth() {
    if (initialized.value) return
    authLoading.value = true
    try {
      await refresh()
      await fetchMe()
    } catch {
      accessToken.value = null
      user.value = null
    } finally {
      initialized.value = true
      authLoading.value = false
    }
  }

  return {
    user,
    accessToken,
    isLoggedIn,
    initialized,
    authLoading,
    register,
    login,
    refresh,
    logout,
    fetchMe,
    initAuth,
    forgotPassword,
    resetPassword,
    hasPermission,
    hasRole
  }
}
