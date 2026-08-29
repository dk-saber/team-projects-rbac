import type { FetchOptions } from 'ofetch'

/**
 * Authenticated HTTP client.
 *
 * Every request is sent with the current Bearer access token. If the API
 * returns a 401 response (access token expired), the client attempts a
 * single silent refresh via /api/auth/refresh (HttpOnly cookie) and then
 * retries the original request.
 * If the refresh also fails, the session is considered terminated.
 */
export const useApi = () => {
  const { accessToken, refresh, logout } = useAuth()
  const config = useRuntimeConfig()
  const base = config.public.apiBase as string

  async function authFetch<T>(path: string, options: FetchOptions<'json'> = {}): Promise<T> {
    const run = () =>
      $fetch<T>(`${base}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.headers as Record<string, string> | undefined),
          ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {})
        }
      })

    try {
      return await run()
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode
      if (status === 401) {
        try {
          await refresh()
          return await run()
        } catch (refreshErr) {
          await logout()
          throw refreshErr
        }
      }
      throw err
    }
  }

  return { authFetch }
}
