export type ProjectStatus = 'draft' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export interface RefLite {
  _id: string
  name: string
  label?: string
}

export interface UserLite {
  _id: string
  username: string
  name?: string
  lastname?: string
}

export interface Project {
  _id: string
  name: string
  description?: string
  status: ProjectStatus
  startDate?: string
  endDate?: string
  direction?: RefLite | null
  department?: RefLite | null
  createdBy?: UserLite
  members?: UserLite[]
  createdAt?: string
  updatedAt?: string
}

export interface ProjectInput {
  name: string
  description?: string
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  direction?: string | null
  department?: string | null
  members?: string[]
}

export const useProjects = () => {
  const { authFetch } = useApi()

  const projects = useState<Project[]>('projects_list', () => [])
  const loading = useState<boolean>('projects_loading', () => false)
  const error = useState<string>('projects_error', () => '')

  async function fetchProjects() {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ projects: Project[] }>('/projects')
      projects.value = data.projects
      return data.projects
    } catch (err: any) {
      error.value = err?.data?.message || 'Impossible de charger les projets.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProject(payload: ProjectInput) {
    const data = await authFetch<{ project: Project; message: string }>('/projects', {
      method: 'POST',
      body: payload
    })
    projects.value = [data.project, ...projects.value]
    return data.project
  }

  async function updateProject(id: string, payload: Partial<ProjectInput>) {
    const data = await authFetch<{ project: Project; message: string }>(`/projects/${id}`, {
      method: 'PUT',
      body: payload
    })
    const idx = projects.value.findIndex((p) => p._id === id)
    if (idx !== -1) projects.value[idx] = data.project
    return data.project
  }

  async function deleteProject(id: string) {
    await authFetch<{ message: string }>(`/projects/${id}`, { method: 'DELETE' })
    projects.value = projects.value.filter((p) => p._id !== id)
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
  }
}
