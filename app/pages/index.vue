<template>
  <div>
    <div class="card mb-6 bg-gradient-to-br from-indigo-600 to-violet-600 !text-white">
      <h1 class="text-2xl font-extrabold">안녕하세요, {{ nickname }}님! 👋</h1>
      <p class="mt-1 text-indigo-100">오늘도 조금씩, 꾸준히 계산 실력을 키워봐요.</p>
      <div v-if="reviewDue > 0" class="mt-3 inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">
        📚 복습할 유형 {{ reviewDue }}개가 기다리고 있어요
      </div>
    </div>

    <h2 class="mb-3 text-lg font-extrabold">학습 모드</h2>
    <div class="mb-8 grid gap-4 sm:grid-cols-3">
      <NuxtLink to="/drill" class="card transition hover:-translate-y-0.5 hover:shadow-md">
        <p class="text-3xl">🎯</p>
        <h3 class="mt-2 font-extrabold">집중 연산 훈련</h3>
        <p class="mt-1 text-sm text-slate-500">연산·자릿수·난이도를 직접 정하고 집중 연습</p>
      </NuxtLink>
      <NuxtLink to="/adaptive" class="card transition hover:-translate-y-0.5 hover:shadow-md">
        <p class="text-3xl">🧠</p>
        <h3 class="mt-2 font-extrabold">맞춤 학습</h3>
        <p class="mt-1 text-sm text-slate-500">AI가 취약 유형을 분석해 문제를 골라줘요</p>
      </NuxtLink>
      <NuxtLink to="/thinking" class="card transition hover:-translate-y-0.5 hover:shadow-md">
        <p class="text-3xl">💡</p>
        <h3 class="mt-2 font-extrabold">수학적 사고 훈련</h3>
        <p class="mt-1 text-sm text-slate-500">10 만들기·분배법칙 등 계산 전략 익히기</p>
      </NuxtLink>
    </div>

    <h2 class="mb-3 text-lg font-extrabold">한눈에 보는 학습 현황</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="푼 문제" :value="stats.totalAttempts" sub="누적" />
      <StatCard label="정답률" :value="pct(stats.firstTryAccuracy)" sub="첫 시도 기준" />
      <StatCard label="학습 세션" :value="stats.sessionCount" sub="누적" />
      <StatCard label="숙달한 유형" :value="stats.masteredSkills.length" sub="가숙달 이상" />
    </div>

    <div v-if="recommendations.length" class="card mt-6">
      <h3 class="font-extrabold">🎯 지금 집중하면 좋은 유형</h3>
      <ul class="mt-2 space-y-1 text-sm text-slate-600">
        <li v-for="r in recommendations" :key="r.skillId" class="flex items-center justify-between">
          <span>{{ skillName(r.skillId) }}</span>
          <span class="text-xs text-slate-400">{{ r.why }}</span>
        </li>
      </ul>
      <NuxtLink to="/adaptive" class="btn-secondary mt-4">맞춤 학습 시작하기</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { computeStats, loadDB, type LocalDB } from '~/composables/useLocalStore'
import { selectNextSkills } from '../../lib/adaptive/engine'
import { getSkill } from '../../lib/skills/skill-graph'
import { recentAccuracy } from '../../lib/adaptive/engine'

const db = ref<LocalDB>(loadDB())
const stats = computed(() => computeStats(db.value))
const nickname = computed(() => db.value.settings.nickname || '수학 탐험가')
const reviewDue = computed(() => stats.value.reviewDueCount)

const pct = (x: number) => `${Math.round(x * 100)}%`
const skillName = (id: string) => {
  try { return getSkill(id).name } catch { return id }
}

const recommendations = computed(() => {
  const progresses = Object.values(db.value.progress)
  if (progresses.length === 0) return []
  return selectNextSkills(progresses, undefined, new Date(), { count: 3 }).map((s) => {
    const p = db.value.progress[s.skillId]
    if (!p) return { skillId: s.skillId, why: '새로운 유형' }
    const acc = recentAccuracy(p)
    const why = Number.isNaN(acc) ? '새로운 유형' : `최근 정답률 ${Math.round(acc * 100)}%`
    return { skillId: s.skillId, why }
  })
})

onMounted(() => {
  db.value = loadDB()
})
</script>
