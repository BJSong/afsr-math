<template>
  <div class="card mx-auto w-full max-w-xl">
    <div class="mb-2 flex items-center justify-between text-sm text-slate-500">
      <span>문제 {{ index + 1 }} / {{ total }}</span>
      <span v-if="timerOn && elapsedSec > 0" class="tabular-nums">{{ elapsedSec }}초</span>
    </div>

    <div class="mb-6 mt-4 text-center">
      <p class="text-5xl font-extrabold tracking-wide tabular-nums sm:text-6xl">
        {{ problem.prompt }}
      </p>
      <button
        v-if="problem.hint && !result"
        class="mt-3 text-sm font-semibold text-indigo-600 underline-offset-2 hover:underline"
        @click="showHint = !showHint"
      >
        {{ showHint ? '힌트 숨기기' : '💡 힌트 보기' }}
      </button>
      <p v-if="showHint && problem.hint" class="mx-auto mt-2 max-w-md rounded-xl bg-amber-50 px-4 py-2 text-base text-amber-900">
        {{ problem.hint }}
      </p>
    </div>

    <div v-if="!result">
      <input
        ref="inputEl"
        v-model="input"
        type="text"
        inputmode="numeric"
        pattern="-?[0-9]*"
        class="input-number"
        placeholder="답을 입력하세요"
        autocomplete="off"
        @keydown.enter="onSubmit"
      />
      <button class="btn-primary mt-4 w-full" :disabled="submitting" @click="onSubmit">
        {{ submitting ? '채점 중...' : '제출 (Enter)' }}
      </button>
      <p class="mt-2 text-center text-xs text-slate-400">키보드 숫자 입력 후 Enter를 누르세요</p>
    </div>

    <div v-else class="text-center">
      <div
        class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        :class="result.isCorrect ? 'bg-green-100' : 'bg-red-100'"
      >
        {{ result.isCorrect ? '⭕' : '❌' }}
      </div>
      <p class="text-xl font-bold" :class="result.isCorrect ? 'text-green-700' : 'text-red-700'">
        {{ result.isCorrect ? feedbackPraise : '아쉬워요, 다시 생각해 볼까요?' }}
      </p>
      <p v-if="!result.isCorrect" class="mt-2 text-lg">
        정답은 <span class="font-extrabold text-indigo-700">{{ result.correctAnswer }}</span> 이에요
      </p>
      <div v-if="result.errorTypes?.length" class="mx-auto mt-4 max-w-md text-left">
        <div
          v-for="e in result.errorTypes"
          :key="e.type"
          class="mb-2 rounded-xl bg-slate-50 px-4 py-2 text-sm ring-1 ring-slate-200"
        >
          <span class="font-bold">{{ e.label }}</span>
          <span v-if="e.estimated" class="chip ml-2 !py-0 text-xs">추정</span>
          <p class="mt-1 text-slate-600">{{ e.detail }}</p>
        </div>
      </div>
      <button class="btn-primary mt-4 w-full" @click="$emit('next')">
        {{ isLast ? '결과 보기' : '다음 문제 →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface GradeResult {
  isCorrect: boolean
  correctAnswer: number
  errorTypes?: { type: string; label: string; estimated: boolean; detail: string }[]
}

const props = defineProps<{
  problem: { prompt: string; hint?: string; questionId: string }
  index: number
  total: number
  timerOn: boolean
  submitting: boolean
  result: GradeResult | null
  isLast: boolean
}>()

const emit = defineEmits<{
  submit: [answer: number | null, durationMs: number]
  next: []
}>()

const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const showHint = ref(false)
const startedAt = ref(0)
const elapsedSec = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const feedbackPraise = computed(() => {
  const list = ['정답이에요! 🎉', '잘했어요! ✨', '완벽해요! 💪', '멋져요! 🌟']
  return list[props.index % list.length]
})

function reset() {
  input.value = ''
  showHint.value = false
  startedAt.value = Date.now()
  elapsedSec.value = 0
}

function onSubmit() {
  const raw = input.value.trim()
  if (raw === '' || raw === '-' || props.submitting || props.result) return
  const answer = Number(raw)
  if (!Number.isInteger(answer)) return
  emit('submit', answer, Date.now() - startedAt.value)
}

watch(
  () => props.problem.questionId,
  () => reset(),
)

onMounted(() => {
  reset()
  inputEl.value?.focus()
  if (props.timerOn) {
    timer = setInterval(() => {
      elapsedSec.value = Math.floor((Date.now() - startedAt.value) / 1000)
    }, 500)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
