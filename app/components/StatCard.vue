<template>
  <div class="card">
    <p class="text-sm text-slate-500">{{ label }}</p>
    <p class="mt-1 text-3xl font-extrabold tabular-nums">{{ value }}</p>
    <p v-if="sub" class="mt-1 text-xs text-slate-400">{{ sub }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; sub?: string }>()
</script>
