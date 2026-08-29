<script setup lang="ts">
const props = defineProps<{
  name: string
  size?: 'sm' | 'md'
}>()

/**
 * IMPORTANT : Tailwind scanne le code source de façon statique pour savoir
 * quelles classes générer au build. Une classe construite par template
 * literal (ex: `border-role-${key}/30`) ne serait PAS détectée et
 * disparaîtrait en production. On liste donc chaque combinaison
 * explicitement, en clair, pour que le JIT les trouve.
 */
const STYLES: Record<string, { dot: string; pill: string }> = {
  admin: { dot: 'bg-role-admin', pill: 'border-role-admin/30 bg-role-admin/10 text-role-admin' },
  devops: { dot: 'bg-role-devops', pill: 'border-role-devops/30 bg-role-devops/10 text-role-devops' },
  dev: { dot: 'bg-role-dev', pill: 'border-role-dev/30 bg-role-dev/10 text-role-dev' },
  test: { dot: 'bg-role-test', pill: 'border-role-test/30 bg-role-test/10 text-role-test' },
  ops: { dot: 'bg-role-ops', pill: 'border-role-ops/30 bg-role-ops/10 text-role-ops' },
  default: { dot: 'bg-role-default', pill: 'border-role-default/30 bg-role-default/10 text-role-default' }
}

const style = computed(() => {
  const k = (props.name || '').toLowerCase()
  return STYLES[k] || STYLES.default
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-medium"
    :class="[size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs', style.pill]"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="style.dot" />
    {{ name }}
  </span>
</template>
