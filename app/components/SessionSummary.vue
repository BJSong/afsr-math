<template>
  <div class="card mx-auto w-full max-w-xl text-center">
    <h2 class="text-2xl font-extrabold">{{ title }}</h2>
    <p class="mt-1 text-slate-500">{{ subtitle }}</p>

    <div class="mt-6 grid grid-cols-3 gap-3">
      <div class="rounded-xl bg-slate-50 p-4">
        <p class="text-3xl font-extrabold text-indigo-700">{{ Math.round(accuracy * 100) }}%</p>
        <p class="mt-1 text-sm text-slate-500">정답률</p>
      </div>
      <div class="rounded-xl bg-slate-50 p-4">
        <p class="text-3xl font-extrabold text-indigo-700">{{ correct }}/{{ total }}</p>
        <p class="mt-1 text-sm text-slate-500">맞힌 문제</p>
      </div>
      <div class="rounded-xl bg-slate-50 p-4">
        <p class="text-3xl font-extrabold text-indigo-700">{{ avgSec }}초</p>
        <p class="mt-1 text-sm text-slate-500">평균 풀이 시간</p>
      </div>
    </div>

    <p class="mt-6 rounded-xl bg-indigo-50 px-4 py-3 text-left text-sm leading-relaxed text-indigo-900">
      {{ message }}
    </p>

    <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  results: { isCorrect: boolean; durationMs: number }[]
}>()

const total = computed(() => props.results.length)
const correct = computed(() => props.results.filter((r) => r.isCorrect).length)
const accuracy = computed(() => (total.value ? correct.value / total.value : 0))
const avgSec = computed(() => {
  if (!total.value) return 0
  const avg = props.results.reduce((s, r) => s + r.durationMs, 0) / total.value / 1000
  return Math.round(avg * 10) / 10
})

const message = computed(() => {
  const a = accuracy.value
  if (a >= 0.9) return '훌륭해요! 이 유형은 거의 완벽해요. 다음 단계로 확장해 볼까요?'
  if (a >= 0.8) return '잘하고 있어요! 같은 수준에서 조금 더 연습하면 완전히 익숙해질 거예요.'
  if (a >= 0.6) return '조금 더 연습이 필요해요. 틀린 문제는 오답 노트에서 다시 확인해 보세요.'
  return '개념부터 차근차근 다시 배워봐요. 힌트를 활용하고, 급하지 않게 풀어보세요.'
})
</script>
