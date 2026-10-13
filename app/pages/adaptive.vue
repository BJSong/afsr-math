<template>
  <div>
    <!-- 인트로 -->
    <div v-if="phase === 'intro'" class="mx-auto max-w-2xl">
      <h1 class="mb-6 text-2xl font-extrabold">🧠 맞춤 학습</h1>

      <div v-if="needsDiagnosis" class="card text-center">
        <p class="text-4xl">🔍</p>
        <h2 class="mt-3 text-xl font-extrabold">먼저 짧은 진단을 해볼까요?</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          학습 기록이 아직 없어요. 10문제 정도의 쉬운 진단으로 현재 실력을 파악하고,
          그 결과에 맞춰 앞으로의 문제를 골라드릴게요.
        </p>
        <button class="btn-primary mt-4 w-full" :disabled="loading" @click="startDiagnosis">
          {{ loading ? '준비 중...' : '진단 시작하기 (10문제)' }}
        </button>
      </div>

      <div v-else class="card">
        <h2 class="text-xl font-extrabold">오늘의 맞춤 플랜</h2>
        <p class="mt-1 text-sm text-slate-500">학습 기록을 분석해 지금 가장 필요한 유형을 골랐어요.</p>
        <ul class="mt-4 space-y-3">
          <li v-for="s in plan" :key="s.skillId" class="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div class="flex items-center justify-between">
              <span class="font-extrabold">{{ s.name }}</span>
              <span class="chip">{{ s.count }}문제</span>
            </div>
            <p class="mt-1 text-sm text-slate-600">{{ s.why }}</p>
          </li>
        </ul>
        <button class="btn-primary mt-4 w-full" :disabled="loading" @click="startAdaptive">
          {{ loading ? '문제를 만드는 중...' : `맞춤 학습 시작하기 (총 ${totalCount}문제)` }}
        </button>
        <p class="mt-3 text-xs leading-relaxed text-slate-400">
          ※ 문제 선택 기준은 초기 설계 가설이며, 학습 데이터가 쌓이면 조정됩니다.
          자세한 원리는 설정 &gt; 안내에서 확인할 수 있어요.
        </p>
      </div>
      <p v-if="error" class="card mt-4 !border-red-200 text-sm text-red-700">{{ error }}</p>
    </div>

    <!-- 풀이 -->
    <div v-else-if="phase === 'solving' && !finished">
      <div class="mb-4 flex items-center justify-between">
        <button class="btn-secondary !px-3 !py-1.5 text-sm" @click="quitToHome">그만하기</button>
        <span class="text-sm font-bold text-slate-500">{{ sessionLabel }}</span>
        <div class="h-2.5 w-40 overflow-hidden rounded-full bg-slate-200">
          <div class="h-full rounded-full bg-indigo-600 transition-all" :style="{ width: `${((index + 1) / problems.length) * 100}%` }" />
        </div>
      </div>
      <ProblemCard
        v-if="currentProblem"
        :problem="currentProblem"
        :index="index"
        :total="problems.length"
        :timer-on="db.settings.timerOn"
        :submitting="submitting"
        :result="currentResult"
        :is-last="isLast()"
        @submit="submit"
        @next="next"
      />
    </div>

    <!-- 결과 -->
    <SessionSummary
      v-else-if="phase === 'solving'"
      :title="wasDiagnosis ? '🔍 진단 완료!' : '🧠 맞춤 학습 완료!'"
      :results="results"
      :subtitle="wasDiagnosis ? '분석 결과를 확인하세요' : undefined"
    >
      <template #actions>
        <button v-if="wasDiagnosis" class="btn-primary" @click="goAdaptive">맞춤 학습 시작하기</button>
        <NuxtLink to="/dashboard" class="btn-secondary">성과 보기</NuxtLink>
        <NuxtLink to="/" class="btn-secondary">홈으로</NuxtLink>
      </template>
    </SessionSummary>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProblemSession, type ClientProblem } from '~/composables/useProblemSession'
import { loadDB, type LocalDB } from '~/composables/useLocalStore'
import { computePriority, recentAccuracy, recommendAction, selectNextSkills } from '../../lib/adaptive/engine'
import { skillToRequest } from '../../lib/skills/skill-options'
import { getSkill } from '../../lib/skills/skill-graph'
import { DEFAULT_POLICY } from '../../lib/policy'

const session = useProblemSession()
const { problems, index, results, currentResult, submitting, finished, currentProblem, isLast, start, submit, next, quit, db } = session

const phase = ref<'intro' | 'solving'>('intro')
const loading = ref(false)
const error = ref('')
const wasDiagnosis = ref(false)
const sessionLabel = ref('')

const localDB = ref<LocalDB>(loadDB())
const needsDiagnosis = computed(() => localDB.value.attempts.length < 10)

interface PlanItem { skillId: string; name: string; why: string; count: number }
const plan = ref<PlanItem[]>([])
const totalCount = computed(() => plan.value.reduce((s, x) => s + x.count, 0))

function describeWhy(skillId: string): string {
  const p = db.value.progress[skillId]
  if (!p) return '새로운 유형에 도전해 보세요.'
  const pr = computePriority(p, DEFAULT_POLICY, new Date())
  const action = recommendAction(p, DEFAULT_POLICY)
  const parts: string[] = []
  const acc = recentAccuracy(p)
  if (!Number.isNaN(acc)) parts.push(`최근 정답률 ${Math.round(acc * 100)}%`)
  const top =
    pr.error >= pr.review && pr.error >= pr.fluency && pr.error >= pr.transfer ? '오류 교정'
    : pr.review >= pr.fluency && pr.review >= pr.transfer ? '복습 시기'
    : pr.fluency >= pr.transfer ? '풀이 속도 향상' : '응용력 기르기'
  parts.push(`${top}이 필요해 보여요`)
  const actionLabel: Record<string, string> = {
    expand: '실력이 좋아서 범위를 넓혀볼게요', hold: '같은 수준에서 탄탄히 연습해요',
    reteach: '개념부터 다시 짚어볼게요', 'fluency-practice': '정확하면서도 빠르게 풀어봐요',
    'remove-pressure': '시간 부담 없이 정확하게 풀어봐요',
  }
  parts.push(actionLabel[action.action] ?? '')
  return parts.join(' · ')
}

function buildPlan() {
  const progresses = Object.values(db.value.progress)
  const picked = selectNextSkills(progresses, DEFAULT_POLICY, new Date(), { count: 3 })
  plan.value = picked.map((s) => {
    let name = s.skillId
    try { name = getSkill(s.skillId).name } catch { /* keep id */ }
    return { skillId: s.skillId, name, why: describeWhy(s.skillId), count: 7 }
  })
}

async function fetchProblems(reqs: { req: Record<string, unknown>; label: string }[]): Promise<ClientProblem[]> {
  const all: ClientProblem[] = []
  for (const { req } of reqs) {
    const list = await $fetch<ClientProblem[]>('/api/problems', { method: 'POST', body: req })
    all.push(...list)
  }
  // 순서 섞기 (Interleaving: 기초 숙달 이후 혼합)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = all[i]
    const b = all[j]
    if (a === undefined || b === undefined) continue
    all[i] = b
    all[j] = a
  }
  return all
}

async function startDiagnosis() {
  loading.value = true
  error.value = ''
  wasDiagnosis.value = true
  sessionLabel.value = '진단 중'
  try {
    const list = await fetchProblems([
      { req: { operator: 'mixed', digitsA: { min: 1, max: 2 }, digitsB: { min: 1, max: 2 }, difficulty: 'easy', carry: 'any', allowNegative: false, allowRemainder: false, count: 10 }, label: '진단' },
    ])
    start(list, 'adaptive')
    phase.value = 'solving'
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    error.value = fe.data?.message ?? fe.message ?? '문제 생성에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function startAdaptive() {
  loading.value = true
  error.value = ''
  wasDiagnosis.value = false
  sessionLabel.value = '맞춤 학습 중'
  try {
    const list = await fetchProblems(plan.value.map((s) => ({ req: skillToRequest(s.skillId), label: s.skillId })))
    start(list, 'adaptive')
    phase.value = 'solving'
  } catch (e: unknown) {
    const fe = e as { data?: { message?: string }; message?: string }
    error.value = fe.data?.message ?? fe.message ?? '문제 생성에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

function goAdaptive() {
  phase.value = 'intro'
  finished.value = false
  localDB.value = loadDB()
  buildPlan()
}

function quitToHome() {
  quit()
  phase.value = 'intro'
  finished.value = false
  localDB.value = loadDB()
  if (!needsDiagnosis.value) buildPlan()
}

onMounted(() => {
  localDB.value = loadDB()
  db.value = localDB.value
  if (!needsDiagnosis.value) buildPlan()
})
</script>
