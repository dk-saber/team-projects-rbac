<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

function onOverlayClick() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/70 px-4 py-10 backdrop-blur-sm" @click.self="onOverlayClick">
      <div class="w-full max-w-lg rounded-2xl border border-ink-600 bg-ink-800 shadow-panel">
        <div class="flex items-center justify-between border-b border-ink-700 px-6 py-4">
          <h2 class="font-display text-base font-semibold text-slate-100">{{ title }}</h2>
          <button
            type="button"
            aria-label="Fermer"
            class="rounded-md p-1.5 text-slate-500 transition hover:bg-ink-700 hover:text-slate-200"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
