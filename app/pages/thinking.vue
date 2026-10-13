<template>
  <div>
    <div v-if="phase === 'intro'" class="mx-auto max-w-2xl">
      <h1 class="mb-2 text-2xl font-extrabold">💡 수학적 사고 훈련</h1>
      <p class="mb-6 text-sm text-slate-500">계산 결과뿐 아니라, 수의 관계와 효율적인 전략을 익혀요.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <button
          v-for="t in templates" :key="t.value"
          class="card text-left transition hover:-translate-y-0.5 hover:shadow-md"
          :class="{ '!ring-2 !ring-indigo-500': chosen === t.value }"
          @click="chosen = t.value"
        >
          <p class="text-3xl">{{ t.emoji }}</p>
          <h3 class="mt-2 font-extrabold">{{ t.title }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ t.desc }}</p>
          <p class="mt-2 font-mono text-sm text-indigo-700">{{ t.example }}</p>
        </button>
      </div>
      <div class="card mt-4 flex items-center justify-between">
        <span class="font-bold">문제 수</span>
        <div class="flex gap-2">
          <button v-for="n in [5, 10, 15]" :key="n" class="btn-secondary"
            :class="{ '!bg-indigo-600 !text-white': count === n }" @click="count = n">{{ n }}문제</button>
        </div>
      </div>
      <p v-if="error" class="card mt-4 text-sm text-red-700">{{ error }}</p>
      <button class="btn-primary mt-4 w-full" :disabled="loading" @click="startSession">
        {{ loading ? '문제를 만드는 중...' : '훈련 시작하기' }}
      </button>
    </div>

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
        :timer-on="false"
        :submitting="submitting"
        :result="currentResult"
        :is-last="isLast()"
        @submit="submit"
        @next="next"
      />
      <p class="mt-3 text-center text-xs text-slate-400">사고 훈련에서는 정확성과 이해를 우선해요. 시간은 재지 않습니다.</p>
    </div>

    <SessionSummary v-else title="💡 수학적 사고 훈련 완료!" :results="results">
      <template #actions>
        <button class="btn-secondary" @click="phase = 'intro'; finished = false">다른 전략 연습</button>
        <NuxtLink to="/dashboard" class="btn-primary">성과 보기</NuxtLink>
      </template>
    </SessionSummary>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProblemSession, type ClientProblem } from '~/composables/useProblemSession'
import type { ThinkingTemplate } from '../../lib/thinking/problems'

const templates: { value: ThinkingTemplate; emoji: string; title: string; desc: string; example: string }[] = [
  { value: 'make-ten', emoji: '🔟', title: '10 만들기', desc: '10이 되는 짝을 찾아 계산을 간단히', example: '27 + 5 = ?' },
  { value: 'find-unknown', emoji: '❓', title: '미지수 찾기', desc: '□에 들어갈 수를 관계로 파악', example: '47 + □ = 48 + 27' },
  { value: 'distributive', emoji: '✖️', title: '분배법칙 활용', desc: '곱셈을 나누어 쉽게 계산', example: '48 × 25 = ?' },
  { value: 'complement', emoji: '💯', title: '보수 활용', desc: '100·1000에 가까운 수로 변환', example: '100 − 47 = ?' },
]

const chosen = ref<ThinkingTemplate>('make-ten')
const count = ref(10)
const phase = ref<'intro' | 'solving'>('intro')
const loading = ref(false)
const error = ref('')

const session = useProblemSession()
const { problems, index, results, currentResult, submitting, finished, currentProblem, isLast, start, submit, next, quit } = session

async function startSession() {
  loading.value = true
  error.value = ''
  try {
    const list = await $fetch<ClientProblem[]>('/api/problems', {
      method: 'POST',
      body: { kind: 'thinking', template: chosen.value, count: count.value },
    })
    start(list, 'adaptive')
    phase.value = 'solving'
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    error.value = fe.data?.message ?? fe.message ?? '문제 생성에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

function quitToHome() {
  quit()
  phase.value = 'intro'
  finished.value = false
}
</script>
