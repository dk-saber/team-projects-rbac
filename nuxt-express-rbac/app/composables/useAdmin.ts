export interface AdminRefItem {
  _id: string
  name: string
  label?: string
  description?: string
  isActive: boolean
  permissions?: string[] // roles only
  direction?: { _id: string; name: string; label?: string } | null // departments only
}

export interface AdminUser {
  _id: string
  name: string
  lastname: string
  username: string
  email: string
  isActive: boolean
  role: { _id: string; name: string; label?: string } | null
  direction: { _id: string; name: string; label?: string } | null
  department: { _id: string; name: string; label?: string } | null
}

export interface AdminUserInput {
  name: string
  lastname: string
  username: string
  email: string
  password: string
  direction: string
  department: string
  role: string
  isActive?: boolean
}

type RefKind = 'roles' | 'directions' | 'departments'

/**
 * Talks to the Admin-only endpoints (/api/admin/*). Every call requires the
 * caller's role to be Admin — the backend enforces this and returns 403
 * otherwise, which authFetch/callers should surface to the UI.
 */
export const useAdmin = () => {
  const { authFetch } = useApi()

  const users = useState<AdminUser[]>('admin_users', () => [])
  const roles = useState<AdminRefItem[]>('admin_roles', () => [])
  const directions = useState<AdminRefItem[]>('admin_directions', () => [])
  const departments = useState<AdminRefItem[]>('admin_departments', () => [])

  const loading = useState<boolean>('admin_loading', () => false)
  const error = useState<string>('admin_error', () => '')

  async function fetchUsers() {
    const data = await authFetch<{ users: AdminUser[] }>('/admin/users')
    users.value = data.users
    return data.users
  }

  async function createUser(payload: AdminUserInput) {
    const data = await authFetch<{ user: AdminUser; message: string }>('/admin/users', {
      method: 'POST',
      body: payload
    })
    users.value = [...users.value, data.user]
    return data.user
  }

  async function updateUser(userId: string, payload: Partial<Omit<AdminUserInput, 'password' | 'role'>>) {
    const data = await authFetch<{ user: AdminUser; message: string }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: payload
    })
    const idx = users.value.findIndex((u) => u._id === userId)
    if (idx !== -1) users.value[idx] = data.user
    return data.user
  }

  /** Soft delete by default (isActive: false + sessions revoked). Pass hard: true to delete permanently. */
  async function deleteUser(userId: string, hard = false) {
    const data = await authFetch<{ message: string; user?: AdminUser }>(
      `/admin/users/${userId}${hard ? '?hard=true' : ''}`,
      { method: 'DELETE' }
    )
    if (hard) {
      users.value = users.value.filter((u) => u._id !== userId)
    } else if (data.user) {
      const idx = users.value.findIndex((u) => u._id === userId)
      if (idx !== -1) users.value[idx] = data.user
    }
    return data
  }

  async function changeUserRole(userId: string, roleId: string) {
    const data = await authFetch<{ user: AdminUser; message: string }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: { role: roleId }
    })
    const idx = users.value.findIndex((u) => u._id === userId)
    if (idx !== -1) users.value[idx] = data.user
    return data.user
  }

  function stateFor(kind: RefKind) {
    return kind === 'roles' ? roles : kind === 'directions' ? directions : departments
  }

  async function fetchRefs(kind: RefKind) {
    const data = await authFetch<Record<string, AdminRefItem[]>>(`/admin/${kind}`)
    stateFor(kind).value = data[kind]
    return data[kind]
  }

  async function createRef(kind: RefKind, payload: Record<string, any>) {
    const singular = kind === 'roles' ? 'role' : kind === 'directions' ? 'direction' : 'department'
    const data = await authFetch<Record<string, AdminRefItem>>(`/admin/${kind}`, {
      method: 'POST',
      body: payload
    })
    stateFor(kind).value = [...stateFor(kind).value, data[singular]]
    return data[singular]
  }

  async function updateRef(kind: RefKind, id: string, payload: Record<string, any>) {
    const singular = kind === 'roles' ? 'role' : kind === 'directions' ? 'direction' : 'department'
    const data = await authFetch<Record<string, AdminRefItem>>(`/admin/${kind}/${id}`, {
      method: 'PUT',
      body: payload
    })
    const list = stateFor(kind)
    const idx = list.value.findIndex((r) => r._id === id)
    if (idx !== -1) list.value[idx] = data[singular]
    return data[singular]
  }

  /** Soft-delete: the backend deactivates rather than deletes (isActive: false). */
  async function deactivateRef(kind: RefKind, id: string) {
    const singular = kind === 'roles' ? 'role' : kind === 'directions' ? 'direction' : 'department'
    const data = await authFetch<Record<string, AdminRefItem>>(`/admin/${kind}/${id}`, {
      method: 'DELETE'
    })
    const list = stateFor(kind)
    const idx = list.value.findIndex((r) => r._id === id)
    if (idx !== -1) list.value[idx] = data[singular]
    return data[singular]
  }

  async function loadAll() {
    loading.value = true
    error.value = ''
    try {
      await Promise.all([fetchUsers(), fetchRefs('roles'), fetchRefs('directions'), fetchRefs('departments')])
    } catch (err: any) {
      error.value = err?.data?.message || 'Impossible de charger les données admin.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    roles,
    directions,
    departments,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    changeUserRole,
    fetchRefs,
    createRef,
    updateRef,
    deactivateRef,
    loadAll
  }
}
