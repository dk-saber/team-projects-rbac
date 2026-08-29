export interface MetaOption {
  _id: string
  name: string
  label?: string
  description?: string
}

interface MetaDepartment extends MetaOption {
  direction?: MetaOption | null
}

/**
 * Fetches the RBAC reference data (roles, directions, departments) exposed
 * publicly by the backend at /api/meta/*.
 *
 * These values are backend-driven and evolve without any frontend change:
 * whenever an Admin adds/disables a Direction, Department or Role via
 * /api/admin/*, this composable reflects it automatically on next call.
 */
export const useMeta = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase as string

  const roles = useState<MetaOption[]>('meta_roles', () => [])
  const directions = useState<MetaOption[]>('meta_directions', () => [])
  const departments = useState<MetaDepartment[]>('meta_departments', () => [])

  const loading = useState<boolean>('meta_loading', () => false)
  const error = useState<string>('meta_error', () => '')

  async function fetchRoles() {
    const data = await $fetch<{ roles: MetaOption[] }>(`${base}/meta/roles`)
    roles.value = data.roles
    return data.roles
  }

  async function fetchDirections() {
    const data = await $fetch<{ directions: MetaOption[] }>(`${base}/meta/directions`)
    directions.value = data.directions
    return data.directions
  }

  async function fetchDepartments() {
    const data = await $fetch<{ departments: MetaDepartment[] }>(`${base}/meta/departments`)
    departments.value = data.departments
    return data.departments
  }

  /**
   * Loads directions and departments in parallel — the two fields still
   * required at registration time (role is now assigned by the backend).
   */
  async function loadRegistrationMeta() {
    loading.value = true
    error.value = ''
    try {
      await Promise.all([fetchDirections(), fetchDepartments()])
    } catch (err: any) {
      error.value = err?.data?.message || 'Impossible de charger les données du formulaire.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    roles,
    directions,
    departments,
    loading,
    error,
    fetchRoles,
    fetchDirections,
    fetchDepartments,
    loadRegistrationMeta
  }
}
