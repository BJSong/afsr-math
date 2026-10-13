<template>
  <div>
    <!-- 출제 설정 -->
    <div v-if="!started" class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-2xl font-extrabold">🎯 집중 연산 훈련 — 문제 설정</h1>
      <div class="card space-y-6">
        <div>
          <p class="mb-2 font-bold">연산</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="o in operators" :key="o.value"
              class="btn-secondary" :class="{ '!bg-indigo-600 !text-white': form.operator === o.value }"
              @click="form.operator = o.value"
            >{{ o.label }}</button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="mb-2 font-bold">첫 번째 숫자 자릿수</p>
            <div class="flex items-center gap-2">
              <select v-model.number="form.digitsA.min" class="btn-secondary flex-1"><option v-for="n in 4" :key="n" :value="n">{{ n }}자리</option></select>
              <span>~</span>
              <select v-model.number="form.digitsA.max" class="btn-secondary flex-1"><option v-for="n in 4" :key="n" :value="n">{{ n }}자리</option></select>
            </div>
          </div>
          <div>
            <p class="mb-2 font-bold">두 번째 숫자 자릿수</p>
            <div class="flex items-center gap-2">
              <select v-model.number="form.digitsB.min" class="btn-secondary flex-1"><option v-for="n in 4" :key="n" :value="n">{{ n }}자리</option></select>
              <span>~</span>
              <select v-model.number="form.digitsB.max" class="btn-secondary flex-1"><option v-for="n in 4" :key="n" :value="n">{{ n }}자리</option></select>
            </div>
          </div>
        </div>

        <div>
          <p class="mb-2 font-bold">난이도</p>
          <div class="flex gap-2">
            <button v-for="d in difficulties" :key="d.value" class="btn-secondary"
              :class="{ '!bg-indigo-600 !text-white': form.difficulty === d.value }"
              @click="form.difficulty = d.value">{{ d.label }}</button>
          </div>
          <p class="mt-1 text-xs text-slate-400">난이도는 자릿수뿐 아니라 받아올림 횟수·계산 단계 등을 함께 고려해 판정됩니다.</p>
        </div>

        <div>
          <p class="mb-2 font-bold">받아올림 / 받아내림</p>
          <div class="flex gap-2">
            <button v-for="c in carries" :key="c.value" class="btn-secondary"
              :class="{ '!bg-indigo-600 !text-white': form.carry === c.value }"
              @click="form.carry = c.value">{{ c.label }}</button>
          </div>
        </div>

        <div>
          <p class="mb-2 font-bold">문제 수</p>
          <div class="flex flex-wrap items-center gap-2">
            <button v-for="n in [10, 20, 30]" :key="n" class="btn-secondary"
              :class="{ '!bg-indigo-600 !text-white': form.count === n }" @click="form.count = n">{{ n }}문제</button>
            <input v-model.number="customCount" type="number" min="1" max="200" placeholder="직접 입력"
              class="w-28 rounded-xl border-2 border-slate-200 px-3 py-2 text-center font-bold outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div class="space-y-3">
          <label class="flex items-center justify-between">
            <span class="font-bold">시간 측정</span>
            <input v-model="form.timerOn" type="checkbox" class="h-6 w-6 accent-indigo-600" />
          </label>
          <label v-if="form.operator === 'sub' || form.operator === 'mixed'" class="flex items-center justify-between">
            <span class="font-bold">음수 허용</span>
            <input v-model="form.allowNegative" type="checkbox" class="h-6 w-6 accent-indigo-600" />
          </label>
          <label v-if="form.operator === 'div' || form.operator === 'mixed'" class="flex items-center justify-between">
            <span class="font-bold">나머지 허용 <span class="text-xs font-normal text-slate-400">(몫만 입력)</span></span>
            <input v-model="form.allowRemainder" type="checkbox" class="h-6 w-6 accent-indigo-600" />
          </label>
        </div>

        <p v-if="error" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

        <button class="btn-primary w-full" :disabled="loading" @click="startSession">
          {{ loading ? '문제를 만드는 중...' : '학습 시작하기' }}
        </button>
      </div>
    </div>

    <!-- 풀이 -->
    <div v-else-if="!finished">
      <div class="mb-4 flex items-center justify-between">
        <button class="btn-secondary !px-3 !py-1.5 text-sm" @click="quitToHome">그만하기</button>
        <div class="h-2.5 w-48 overflow-hidden rounded-full bg-slate-200">
          <div class="h-full rounded-full bg-indigo-600 transition-all" :style="{ width: `${((index + 1) / problems.length) * 100}%` }" />
        </div>
      </div>
      <ProblemCard
        v-if="currentProblem"
        :problem="currentProblem"
        :index="index"
        :total="problems.length"
        :timer-on="form.timerOn"
        :submitting="submitting"
        :result="currentResult"
        :is-last="isLast()"
        @submit="submit"
        @next="next"
      />
    </div>

    <!-- 결과 -->
    <SessionSummary
      v-else
      title="🎯 집중 연산 훈련 완료!"
      :results="results"
    >
      <template #actions>
        <button class="btn-secondary" @click="reset">다시 설정하기</button>
        <NuxtLink to="/dashboard" class="btn-primary">성과 보기</NuxtLink>
      </template>
    </SessionSummary>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useProblemSession, type ClientProblem } from '~/composables/useProblemSession'

const operators = [
  { value: 'add', label: '덧셈 +' },
  { value: 'sub', label: '뺄셈 −' },
  { value: 'mul', label: '곱셈 ×' },
  { value: 'div', label: '나눗셈 ÷' },
  { value: 'mixed', label: '혼합' },
] as const
const difficulties = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
] as const
const carries = [
  { value: 'any', label: '무관' },
  { value: 'required', label: '있음' },
  { value: 'none', label: '없음' },
] as const

const form = reactive({
  operator: 'add' as 'add' | 'sub' | 'mul' | 'div' | 'mixed',
  digitsA: { min: 2, max: 2 },
  digitsB: { min: 1, max: 1 },
  difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  carry: 'any' as 'none' | 'required' | 'any',
  count: 10,
  timerOn: true,
  allowNegative: false,
  allowRemainder: false,
})
const customCount = ref<number | null>(null)
const started = ref(false)
const loading = ref(false)
const error = ref('')

const session = useProblemSession()
const { problems, index, results, currentResult, submitting, finished, currentProblem, isLast, start, submit, next, quit } = session

async function startSession() {
  error.value = ''
  const count = customCount.value && customCount.value > 0 ? Math.min(200, Math.floor(customCount.value)) : form.count
  if (form.digitsA.min > form.digitsA.max || form.digitsB.min > form.digitsB.max) {
    error.value = '자릿수 범위가 올바르지 않습니다.'
    return
  }
  loading.value = true
  try {
    const list = await $fetch<ClientProblem[]>('/api/problems', {
      method: 'POST',
      body: {
        operator: form.operator,
        digitsA: form.digitsA,
        digitsB: form.digitsB,
        difficulty: form.difficulty,
        carry: form.carry,
        allowNegative: form.allowNegative,
        allowRemainder: form.allowRemainder,
        count,
      },
    })
    start(list, 'drill')
    started.value = true
  } catch (e: unknown) {
    error.value = e instanceof Error ? (e as { data?: { message?: string } }).data?.message ?? e.message : '문제 생성에 실패했습니다.'
    if (!error.value || error.value === '문제 생성에 실패했습니다.') {
      // $fetch 에러에서 메시지 추출
      const fe = e as { data?: { message?: string }; message?: string }
      error.value = fe.data?.message ?? fe.message ?? '문제 생성에 실패했습니다.'
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  started.value = false
  finished.value = false
}

function quitToHome() {
  quit()
  reset()
}
</script>
