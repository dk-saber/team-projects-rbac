<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useHead({ title: 'Administration — RefreshJWT' })

const {
  users,
  roles,
  directions,
  departments,
  loading,
  error,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  createRef,
  updateRef,
  deactivateRef,
  loadAll
} = useAdmin()

type Tab = 'users' | 'roles' | 'directions' | 'departments'
const tab = ref<Tab>('users')
const tabs: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Utilisateurs' },
  { id: 'roles', label: 'Rôles' },
  { id: 'directions', label: 'Directions' },
  { id: 'departments', label: 'Départements' }
]

onMounted(() => loadAll())

function initials(name?: string, lastname?: string) {
  return `${(name || '?')[0]}${(lastname || '?')[0]}`.toUpperCase()
}

/* ==================================================================
   USERS — CRUD complet
================================================================== */
const showUserForm = ref(false)
const editingUserId = ref<string | null>(null)
const userFormError = ref('')
const userSubmitting = ref(false)

const emptyUserForm = () => ({
  name: '',
  lastname: '',
  username: '',
  email: '',
  password: '',
  direction: '',
  department: '',
  role: '',
  isActive: true
})
const userForm = reactive(emptyUserForm())

function openCreateUser() {
  editingUserId.value = null
  Object.assign(userForm, emptyUserForm())
  userFormError.value = ''
  showUserForm.value = true
}

function openEditUser(u: (typeof users.value)[number]) {
  editingUserId.value = u._id
  Object.assign(userForm, {
    name: u.name,
    lastname: u.lastname,
    username: u.username,
    email: u.email,
    password: '',
    direction: u.direction?._id || '',
    department: u.department?._id || '',
    role: u.role?._id || '',
    isActive: u.isActive
  })
  userFormError.value = ''
  showUserForm.value = true
}

function closeUserForm() {
  showUserForm.value = false
  editingUserId.value = null
}

async function onSubmitUser() {
  userFormError.value = ''
  userSubmitting.value = true
  try {
    if (editingUserId.value) {
      await updateUser(editingUserId.value, {
        name: userForm.name,
        lastname: userForm.lastname,
        username: userForm.username,
        email: userForm.email,
        direction: userForm.direction,
        department: userForm.department,
        isActive: userForm.isActive
      })
      // Le rôle a sa propre route dédiée côté backend (action sensible, tracée séparément).
      const original = users.value.find((u) => u._id === editingUserId.value)
      if (original && original.role?._id !== userForm.role) {
        await changeUserRole(editingUserId.value, userForm.role)
      }
    } else {
      await createUser({
        name: userForm.name,
        lastname: userForm.lastname,
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        direction: userForm.direction,
        department: userForm.department,
        role: userForm.role,
        isActive: userForm.isActive
      })
    }
    closeUserForm()
  } catch (err: any) {
    userFormError.value = err?.data?.message || 'Une erreur est survenue.'
  } finally {
    userSubmitting.value = false
  }
}

const userActionId = ref<string | null>(null)
async function onToggleUserActive(u: (typeof users.value)[number]) {
  userActionId.value = u._id
  try {
    if (u.isActive) {
      await deleteUser(u._id) // soft delete = désactivation + révocation des sessions
    } else {
      await updateUser(u._id, { isActive: true })
    }
  } catch (err: any) {
    error.value = err?.data?.message || 'Action impossible.'
  } finally {
    userActionId.value = null
  }
}

/* ==================================================================
   ROLES / DIRECTIONS / DEPARTMENTS — CRUD générique (déjà en place)
================================================================== */
type RefKind = 'roles' | 'directions' | 'departments'

const newItem = reactive({ name: '', label: '', description: '', permissions: '', direction: '' })
const refError = ref('')
const refSubmitting = ref(false)

function resetNewItem() {
  Object.assign(newItem, { name: '', label: '', description: '', permissions: '', direction: '' })
}

function listFor(kind: RefKind) {
  // IMPORTANT : on retourne .value (déballé), pas le ref lui-même.
  // Contrairement à une référence utilisée directement dans le template
  // (ex: v-for="u in users"), qui est auto-déballée par le compilateur Vue,
  // une valeur retournée par un appel de fonction ne l'est PAS — il faut
  // donc déballer explicitement ici, sous peine de casser le rendu.
  return kind === 'roles' ? roles.value : kind === 'directions' ? directions.value : departments.value
}

async function onCreateRef(kind: RefKind) {
  refError.value = ''
  refSubmitting.value = true
  try {
    const payload: Record<string, any> = {
      name: newItem.name,
      label: newItem.label || undefined,
      description: newItem.description || undefined
    }
    if (kind === 'roles') {
      payload.permissions = newItem.permissions
        ? newItem.permissions.split(',').map((p) => p.trim()).filter(Boolean)
        : []
    }
    if (kind === 'departments' && newItem.direction) {
      payload.direction = newItem.direction
    }
    await createRef(kind, payload)
    resetNewItem()
  } catch (err: any) {
    refError.value = err?.data?.message || 'Impossible de créer cet élément.'
  } finally {
    refSubmitting.value = false
  }
}

/* ---- Édition (modal) ---- */
const showRefForm = ref(false)
const editingRefKind = ref<RefKind>('roles')
const editingRefId = ref<string | null>(null)
const editItem = reactive({ label: '', description: '', permissions: '', direction: '' })
const editError = ref('')
const editSubmitting = ref(false)

function openEditRef(kind: RefKind, item: any) {
  editingRefKind.value = kind
  editingRefId.value = item._id
  Object.assign(editItem, {
    label: item.label || '',
    description: item.description || '',
    permissions: (item.permissions || []).join(', '),
    direction: item.direction?._id || ''
  })
  editError.value = ''
  showRefForm.value = true
}

function closeEditRef() {
  showRefForm.value = false
  editingRefId.value = null
}

async function onSubmitEditRef() {
  if (!editingRefId.value) return
  editError.value = ''
  editSubmitting.value = true
  try {
    const payload: Record<string, any> = {
      label: editItem.label || undefined,
      description: editItem.description || undefined
    }
    if (editingRefKind.value === 'roles') {
      payload.permissions = editItem.permissions
        ? editItem.permissions.split(',').map((p) => p.trim()).filter(Boolean)
        : []
    }
    if (editingRefKind.value === 'departments') {
      payload.direction = editItem.direction || null
    }
    await updateRef(editingRefKind.value, editingRefId.value, payload)
    closeEditRef()
  } catch (err: any) {
    editError.value = err?.data?.message || 'Impossible de modifier cet élément.'
  } finally {
    editSubmitting.value = false
  }
}

const toggling = ref<string | null>(null)
async function onToggleActive(kind: RefKind, item: { _id: string; isActive: boolean }) {
  toggling.value = item._id
  try {
    if (item.isActive) {
      await deactivateRef(kind, item._id)
    } else {
      await updateRef(kind, item._id, { isActive: true })
    }
  } catch (err: any) {
    refError.value = err?.data?.message || 'Action impossible.'
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-6 py-16">
    <p class="font-mono text-xs uppercase tracking-wider text-teal-400">/api/admin/*</p>
    <h1 class="mt-3 font-display text-3xl font-semibold text-slate-100">Administration</h1>
    <p class="mt-2 text-sm text-slate-400">
      Réservé au rôle Admin. Gérez les utilisateurs, rôles, directions et départements.
    </p>

    <p v-if="error" class="mt-6 rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400">
      {{ error }}
    </p>

    <!-- Tabs -->
    <div class="mt-8 flex flex-wrap gap-2 border-b border-ink-600/70 pb-3">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="rounded-md px-3 py-1.5 text-sm transition"
        :class="tab === t.id ? 'border border-teal-500/30 bg-teal-500/10 text-teal-300' : 'text-slate-400 hover:bg-ink-800'"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="loading" class="mt-6 text-sm text-slate-500">Chargement…</p>

    <!-- ============================= USERS ============================= -->
    <section v-if="tab === 'users' && !loading" class="mt-6">
      <div class="mb-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400"
          @click="openCreateUser"
        >
          + Nouvel utilisateur
        </button>
      </div>

      <div class="dtable-shell">
        <div class="overflow-x-auto">
          <table class="dtable">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Direction · Département</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u._id">
                <td>
                  <div class="flex items-center gap-3">
                    <span class="dtable-avatar">{{ initials(u.name, u.lastname) }}</span>
                    <div>
                      <div class="font-mono text-slate-100">{{ u.username }}</div>
                      <div class="text-xs text-slate-500">{{ u.name }} {{ u.lastname }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-slate-300">{{ u.email }}</td>
                <td class="text-slate-400">
                  {{ u.direction?.label || u.direction?.name || '—' }} · {{ u.department?.label || u.department?.name || '—' }}
                </td>
                <td><RoleBadge v-if="u.role" :name="u.role.name" /><span v-else class="text-slate-500">—</span></td>
                <td><StatusBadge :value="u.isActive ? 'active' : 'inactive'" /></td>
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="dtable-action-btn" @click="openEditUser(u)">Modifier</button>
                    <button
                      type="button"
                      :disabled="userActionId === u._id"
                      class="dtable-action-btn disabled:opacity-60"
                      :class="u.isActive ? 'danger' : ''"
                      @click="onToggleUserActive(u)"
                    >
                      {{ userActionId === u._id ? '…' : u.isActive ? 'Désactiver' : 'Réactiver' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!users.length" class="dtable-empty">Aucun utilisateur.</p>
      </div>
    </section>

    <!-- ============================= ROLES / DIRECTIONS / DEPARTMENTS ============================= -->
    <section v-if="tab !== 'users' && !loading" class="mt-6">
      <div class="rounded-2xl border border-ink-600 bg-ink-800/40 p-6 shadow-panel">
        <h2 class="font-display text-base font-semibold text-slate-100">Ajouter</h2>
        <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onCreateRef(tab)">
          <div>
            <label class="mb-1.5 block text-sm text-slate-300">Nom (identifiant unique)</label>
            <input v-model="newItem.name" required class="input" placeholder="Ex: QA-Lead" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm text-slate-300">Libellé affiché</label>
            <input v-model="newItem.label" class="input" placeholder="Ex: Responsable QA" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-sm text-slate-300">Description</label>
            <input v-model="newItem.description" class="input" placeholder="Optionnel" />
          </div>
          <div v-if="tab === 'roles'" class="sm:col-span-2">
            <label class="mb-1.5 block text-sm text-slate-300">Permissions (séparées par virgule)</label>
            <input v-model="newItem.permissions" class="input" placeholder="project:read, project:update" />
          </div>
          <div v-if="tab === 'departments'" class="sm:col-span-2">
            <label class="mb-1.5 block text-sm text-slate-300">Direction rattachée (optionnel)</label>
            <select v-model="newItem.direction" class="input">
              <option value="">—</option>
              <option v-for="d in directions" :key="d._id" :value="d._id">{{ d.label || d.name }}</option>
            </select>
          </div>

          <p v-if="refError" class="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400 sm:col-span-2">
            {{ refError }}
          </p>

          <button
            type="submit"
            :disabled="refSubmitting"
            class="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400 disabled:opacity-60 sm:col-span-2"
          >
            {{ refSubmitting ? 'Création…' : 'Créer' }}
          </button>
        </form>
      </div>

      <div class="mt-6 dtable-shell">
        <div class="overflow-x-auto">
          <table class="dtable">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Libellé</th>
                <th v-if="tab === 'roles'">Permissions</th>
                <th v-if="tab === 'departments'">Direction</th>
                <th>Statut</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in listFor(tab)" :key="item._id">
                <td class="font-mono text-slate-200">{{ item.name }}</td>
                <td class="text-slate-300">{{ item.label || '—' }}</td>
                <td v-if="tab === 'roles'">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="perm in item.permissions"
                      :key="perm"
                      class="rounded-full border border-ink-600 bg-ink-900 px-2 py-0.5 font-mono text-[11px] text-slate-400"
                    >
                      {{ perm }}
                    </span>
                  </div>
                </td>
                <td v-if="tab === 'departments'" class="text-slate-400">
                  {{ item.direction?.label || item.direction?.name || '—' }}
                </td>
                <td><StatusBadge :value="item.isActive ? 'active' : 'inactive'" /></td>
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button type="button" class="dtable-action-btn" @click="openEditRef(tab, item)">Modifier</button>
                    <button
                      type="button"
                      :disabled="toggling === item._id"
                      class="dtable-action-btn disabled:opacity-60"
                      :class="item.isActive ? 'danger' : ''"
                      @click="onToggleActive(tab, item)"
                    >
                      {{ item.isActive ? 'Supprimer' : 'Réactiver' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!listFor(tab).length" class="dtable-empty">Aucun élément.</p>
      </div>
    </section>

    <!-- Formulaire utilisateur (création / édition) -->
    <ModalDialog v-if="showUserForm" :title="editingUserId ? 'Modifier l\u2019utilisateur' : 'Nouvel utilisateur'" @close="closeUserForm">
      <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSubmitUser">
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Prénom</label>
          <input v-model="userForm.name" required class="input" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Nom</label>
          <input v-model="userForm.lastname" required class="input" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Nom d'utilisateur</label>
          <input v-model="userForm.username" required class="input" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Email</label>
          <input v-model="userForm.email" type="email" required class="input" />
        </div>
        <div v-if="!editingUserId" class="sm:col-span-2">
          <label class="mb-1.5 block text-sm text-slate-300">Mot de passe</label>
          <input v-model="userForm.password" type="password" required minlength="6" class="input" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Direction</label>
          <select v-model="userForm.direction" required class="input">
            <option value="" disabled>Sélectionner</option>
            <option v-for="d in directions" :key="d._id" :value="d._id">{{ d.label || d.name }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Département</label>
          <select v-model="userForm.department" required class="input">
            <option value="" disabled>Sélectionner</option>
            <option v-for="d in departments" :key="d._id" :value="d._id">{{ d.label || d.name }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Rôle</label>
          <select v-model="userForm.role" required class="input">
            <option value="" disabled>Sélectionner</option>
            <option v-for="r in roles" :key="r._id" :value="r._id">{{ r.label || r.name }}</option>
          </select>
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm text-slate-300">
            <input v-model="userForm.isActive" type="checkbox" class="h-4 w-4 rounded border-ink-600 bg-ink-900 text-teal-500 focus:ring-teal-500" />
            Compte actif
          </label>
        </div>

        <p v-if="userFormError" class="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400 sm:col-span-2">
          {{ userFormError }}
        </p>

        <div class="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            :disabled="userSubmitting"
            class="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400 disabled:opacity-60"
          >
            {{ userSubmitting ? 'Enregistrement…' : editingUserId ? 'Enregistrer' : 'Créer l\u2019utilisateur' }}
          </button>
          <button type="button" class="rounded-lg border border-ink-600 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-ink-800" @click="closeUserForm">
            Annuler
          </button>
        </div>
      </form>
    </ModalDialog>

    <!-- Formulaire édition rôle / direction / département -->
    <ModalDialog v-if="showRefForm" :title="`Modifier`" @close="closeEditRef">
      <form class="grid grid-cols-1 gap-4" @submit.prevent="onSubmitEditRef">
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Libellé affiché</label>
          <input v-model="editItem.label" class="input" placeholder="Ex: Responsable QA" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm text-slate-300">Description</label>
          <input v-model="editItem.description" class="input" placeholder="Optionnel" />
        </div>
        <div v-if="editingRefKind === 'roles'">
          <label class="mb-1.5 block text-sm text-slate-300">Permissions (séparées par virgule)</label>
          <input v-model="editItem.permissions" class="input" placeholder="project:read, project:update" />
        </div>
        <div v-if="editingRefKind === 'departments'">
          <label class="mb-1.5 block text-sm text-slate-300">Direction rattachée</label>
          <select v-model="editItem.direction" class="input">
            <option value="">—</option>
            <option v-for="d in directions" :key="d._id" :value="d._id">{{ d.label || d.name }}</option>
          </select>
        </div>

        <p v-if="editError" class="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-400">
          {{ editError }}
        </p>

        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="editSubmitting"
            class="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-teal-400 disabled:opacity-60"
          >
            {{ editSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
          <button type="button" class="rounded-lg border border-ink-600 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-ink-800" @click="closeEditRef">
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
