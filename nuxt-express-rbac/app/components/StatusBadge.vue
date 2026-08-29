<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

const LABELS: Record<string, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
  active: 'Actif',
  inactive: 'Inactif'
}

// Classes explicites (voir RoleBadge.vue pour pourquoi pas de template literal).
const STYLES: Record<string, string> = {
  draft: 'border-ink-500 bg-ink-700 text-slate-300',
  in_progress: 'border-signal-500/30 bg-signal-500/10 text-signal-300',
  on_hold: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-rust-500/30 bg-rust-500/10 text-rust-400',
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  inactive: 'border-ink-500 bg-ink-700 text-slate-500'
}

const label = computed(() => LABELS[props.value] || props.value)
const style = computed(() => STYLES[props.value] || STYLES.draft)
</script>

<template>
  <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium" :class="style">
    {{ label }}
  </span>
</template>
