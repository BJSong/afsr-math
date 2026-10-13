<template>
  <div>
    <h1 class="mb-6 text-2xl font-extrabold">📊 학습 성과 분석</h1>

    <div v-if="stats.totalAttempts === 0" class="card text-center">
      <p class="text-4xl">🌱</p>
      <p class="mt-3 font-bold">아직 학습 기록이 없어요.</p>
      <p class="mt-1 text-sm text-slate-500">문제를 풀기 시작하면 여기에 성과가 쌓여요.</p>
      <NuxtLink to="/modes" class="btn-primary mt-4">학습 시작하기</NuxtLink>
    </div>

    <div v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="첫 시도 정답률" :value="pct(stats.firstTryAccuracy)" :sub="`총 ${stats.totalAttempts}문제`" />
        <StatCard label="중앙 풀이 시간" :value="medianSec" sub="정답 기준" />
        <StatCard label="누적 학습 시간" :value="`${stats.totalMinutes}분`" :sub="`${stats.sessionCount}개 세션`" />
        <StatCard label="복습 예정" :value="`${stats.reviewDueCount}개`" sub="유형" />
      </div>

      <div class="card mt-6">
        <h3 class="font-extrabold">연산별 정답률</h3>
        <div class="mt-3 space-y-2">
          <div v-for="o in stats.byOperator" :key="o.operator" class="flex items-center gap-3">
            <span class="w-14 text-sm font-bold">{{ o.operator }}</span>
            <div class="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${o.accuracy * 100}%` }" />
            </div>
            <span class="w-24 text-right text-sm tabular-nums text-slate-500">{{ pct(o.accuracy) }} ({{ o.count }})</span>
          </div>
        </div>
        <p class="mt-2 text-xs text-slate-400">서로 다른 난이도의 기록은 직접 비교하지 않아요. 같은 유형 내에서의 변화에 주목하세요.</p>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div class="card">
          <h3 class="font-extrabold">🎯 집중하면 좋은 유형</h3>
          <ul v-if="stats.weakSkills.length" class="mt-2 space-y-1 text-sm">
            <li v-for="w in stats.weakSkills" :key="w.skillId" class="flex justify-between">
              <span>{{ skillName(w.skillId) }}</span>
              <span class="tabular-nums text-slate-500">{{ pct(w.accuracy) }} · {{ w.attempts }}회</span>
            </li>
          </ul>
          <p v-else class="mt-2 text-sm text-slate-500">아직 분석할 기록이 충분하지 않아요.</p>
        </div>
        <div class="card">
          <h3 class="font-extrabold">🏅 숙달한 유형</h3>
          <div v-if="stats.masteredSkills.length" class="mt-2 flex flex-wrap gap-1">
            <span v-for="s in stats.masteredSkills" :key="s" class="chip">{{ skillName(s) }}</span>
          </div>
          <p v-else class="mt-2 text-sm text-slate-500">꾸준히 학습하면 여기에 표시돼요.</p>
        </div>
      </div>

      <div v-if="stats.trend.length" class="card mt-6">
        <h3 class="font-extrabold">최근 학습 추세 (정답률)</h3>
        <div class="mt-3 flex h-32 items-end gap-1">
          <div v-for="t in stats.trend" :key="t.date" class="flex flex-1 flex-col items-center gap-1">
            <span class="text-[10px] tabular-nums text-slate-400">{{ Math.round(t.accuracy * 100) }}</span>
            <div class="w-full rounded-t bg-indigo-400" :style="{ height: `${Math.max(4, t.accuracy * 100)}px` }" :title="`${t.date}: ${t.count}문제`" />
            <span class="text-[10px] text-slate-400">{{ t.date }}</span>
          </div>
        </div>
      </div>

      <div class="card mt-6">
        <h3 class="font-extrabold">유형별 숙달 상태</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <div v-for="p in progressList" :key="p.skillId" class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm ring-1 ring-slate-100">
            <span class="font-semibold">{{ skillName(p.skillId) }}</span>
            <span class="chip !text-xs">{{ masteryLabel(p.mastery) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { computeStats, loadDB, type LocalDB } from '~/composables/useLocalStore'
import { getSkill } from '../../lib/skills/skill-graph'
import { MASTERY_LABEL } from '../../lib/adaptive/mastery'
import type { MasteryState } from '../../lib/types'

const db = ref<LocalDB>(loadDB())
const stats = computed(() => computeStats(db.value))

const pct = (x: number) => `${Math.round(x * 100)}%`
const medianSec = computed(() =>
  stats.value.medianDurationMs == null ? '-' : `${(stats.value.medianDurationMs / 1000).toFixed(1)}초`,
)
const skillName = (id: string) => {
  try { return getSkill(id).name } catch { return id }
}
const masteryLabel = (m: MasteryState) => MASTERY_LABEL[m] ?? m
const progressList = computed(() =>
  Object.values(db.value.progress).sort((a, b) => b.attempts - a.attempts).slice(0, 12),
)

onMounted(() => {
  db.value = loadDB()
})
</script>
