<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Projets — RefreshJWT' })

const { hasPermission } = useAuth()
const { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject } = useProjects()
const { directions, departments, loadRegistrationMeta } = useMeta()

const canCreate = computed(() => hasPermission('project:create'))
const canUpdate = computed(() => hasPermission('project:update'))
const canDelete = computed(() => hasPermission('project:delete'))

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé'
}

const showForm = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const submitting = ref(false)

const emptyForm = () => ({
  name: '',
  description: '',
  status: 'draft' as const,
  startDate: '',
  endDate: '',
  direction: '',
  department: ''
})

const form = reactive(emptyForm())

onMounted(async () => {
  await Promise.allSettled([fetchProjects(), loadRegistrationMeta()])
})

function openCreateForm() {
  editingId.value = null
  Object.assign(form, emptyForm())
  formError.value = ''
  showForm.value = true
}

function openEditForm(project: (typeof projects.value)[number]) {
  editingId.value = project._id
  Object.assign(form, {
    name: project.name,
    description: project.description || '',
    status: project.status,
    startDate: project.startDate ? project.startDate.substring(0, 10) : '',
    endDate: project.endDate ? project.endDate.substring(0, 10) : '',
    direction: project.direction?._id || '',
    department: project.department?._id || ''
  })
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function onSubmit() {
  formError.value = ''
  submitting.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      direction: form.direction || null,
      department: form.department || null
    }
    if (editingId.value) {
      await updateProject(editingId.value, payload)
    } else {
      await createProject(payload)
    }
    closeForm()
  } catch (err: any) {
    formError.value = err?.data?.message || 'Une erreur est survenue.'
  } finally {
    submitting.value = false
  }
}

const deletingId = ref<string | null>(null)
async function onDelete(id: string) {
  if (!confirm('Supprimer ce projet ? Cette action l\u2019archive et le retire des listes.')) return
  deletingId.value = id
  try {
    await deleteProject(id)
  } catch {
    // le projet reste affiché en cas d'échec, l'utilisateur peut réessayer
  } finally {
    deletingId.value = null
  }
}

function initials(text?: string) {
  if (!text) return '—'
  return text.slice(0, 2).toUpperCase()
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-6 py-16">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-xs uppercase tracking-wider text-teal-400">GET /api/projects</p>
        <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">Projets</h1>
        <p class="mt-2 max-w-xl text-sm text-slate-400">
          Tout le monde voit tous les projets. Le droit de créer, modifier ou supprimer dépend de votre rôle.
        </p>
      </div>
      <button
        v-if="canCreate"
        type="button"
        class="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400"
        @click="openCreateForm"
      >
        + Nouveau projet
      </button>
    </div>

    <p v-if="error" class="mt-6 rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400">
      {{ error }}
    </p>

    <!-- Tableau -->
    <div class="mt-8 dtable-shell">
      <div class="overflow-x-auto">
        <table class="dtable">
          <thead>
            <tr>
              <th>Projet</th>
              <th>Statut</th>
              <th>Direction · Département</th>
              <th>Échéance</th>
              <th>Créé par</th>
              <th v-if="canUpdate || canDelete" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in projects" :key="project._id">
              <td>
                <div class="font-medium text-slate-100">{{ project.name }}</div>
                <div v-if="project.description" class="mt-0.5 max-w-sm truncate text-xs text-slate-500">
                  {{ project.description }}
                </div>
              </td>
              <td><StatusBadge :value="project.status" /></td>
              <td class="text-slate-400">
                {{ project.direction?.label || project.direction?.name || '—' }}
                <span class="text-slate-600">·</span>
                {{ project.department?.label || project.department?.name || '—' }}
              </td>
              <td class="whitespace-nowrap font-mono text-xs text-slate-400">
                {{ project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : '—' }}
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="dtable-avatar">{{ initials(project.createdBy?.username) }}</span>
                  <span class="font-mono text-xs text-slate-400">{{ project.createdBy?.username || '—' }}</span>
                </div>
              </td>
              <td v-if="canUpdate || canDelete" class="text-right">
                <div class="flex justify-end gap-2">
                  <button v-if="canUpdate" type="button" class="dtable-action-btn" @click="openEditForm(project)">
                    Modifier
                  </button>
                  <button
                    v-if="canDelete"
                    type="button"
                    :disabled="deletingId === project._id"
                    class="dtable-action-btn danger disabled:opacity-60"
                    @click="onDelete(project._id)"
                  >
                    {{ deletingId === project._id ? '…' : 'Supprimer' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="loading" class="dtable-empty">Chargement des projets…</p>
      <p v-else-if="!projects.length" class="dtable-empty">Aucun projet pour le moment.</p>
    </div>

    <!-- Formulaire création / édition -->
    <ModalDialog v-if="showForm" :title="editingId ? 'Modifier le projet' : 'Nouveau projet'" @close="closeForm">
      <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm text-slate-300">Nom</label>
          <input v-model="form.name" required class="input" placeholder="Migration MongoDB" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm text-slate-300">Description</label>
          <textarea v-model="form.description" rows="3" class="input resize-none" placeholder="Détails du projet" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Statut</label>
          <select v-model="form.status" class="input">
            <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm text-slate-300">Début</label>
            <input v-model="form.startDate" type="date" class="input" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm text-slate-300">Fin</label>
            <input v-model="form.endDate" type="date" class="input" />
          </div>
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Direction</label>
          <select v-model="form.direction" class="input">
            <option value="">—</option>
            <option v-for="d in directions" :key="d._id" :value="d._id">{{ d.label || d.name }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Département</label>
          <select v-model="form.department" class="input">
            <option value="">—</option>
            <option v-for="d in departments" :key="d._id" :value="d._id">{{ d.label || d.name }}</option>
          </select>
        </div>

        <p v-if="formError" class="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400 sm:col-span-2">
          {{ formError }}
        </p>

        <div class="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400 disabled:opacity-60"
          >
            {{ submitting ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer le projet' }}
          </button>
          <button type="button" class="rounded-lg border border-ink-600 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-ink-800" @click="closeForm">
            Annuler
          </button>
        </div>
      </form>
    </ModalDialog>
  </main>
</template>

<style scoped>
.input {
  @apply w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500;
}
</style>
