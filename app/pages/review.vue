<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-6 text-2xl font-extrabold">📝 오답 노트</h1>

    <div v-if="wrongs.length === 0" class="card text-center">
      <p class="text-4xl">🎉</p>
      <p class="mt-3 font-bold">아직 틀린 문제가 없어요!</p>
      <p class="mt-1 text-sm text-slate-500">문제를 풀다 틀리면 여기에 모아서 다시 연습할 수 있어요.</p>
      <NuxtLink to="/modes" class="btn-primary mt-4">학습하러 가기</NuxtLink>
    </div>

    <div v-else>
      <div class="mb-4 flex gap-2">
        <button class="btn-secondary" :class="{ '!bg-indigo-600 !text-white': filter === 'all' }" @click="filter = 'all'">전체 ({{ wrongs.length }})</button>
        <button class="btn-secondary" :class="{ '!bg-indigo-600 !text-white': filter === 'unfixed' }" @click="filter = 'unfixed'">아직 못 푼 문제 ({{ unfixed.length }})</button>
        <button class="btn-secondary" :class="{ '!bg-indigo-600 !text-white': filter === 'fixed' }" @click="filter = 'fixed'">다시 맞힌 문제 ({{ fixed.length }})</button>
      </div>

      <div v-if="errorPattern" class="card mb-4">
        <h3 class="font-extrabold">🔍 자주 틀리는 패턴</h3>
        <p class="mt-1 text-sm text-slate-600">{{ errorPattern }}</p>
      </div>

      <div class="space-y-3">
        <div v-for="w in shown" :key="w.problem.questionId" class="card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xl font-extrabold tabular-nums">{{ w.problem.prompt }}</p>
              <p class="mt-1 text-sm">
                내 답: <span class="font-bold text-red-600">{{ w.userAnswer ?? '(빈 답)' }}</span>
                → 정답: <span class="font-bold text-indigo-700">{{ w.problem.answer }}</span>
              </p>
              <div v-if="w.problem.strategyTags?.length" class="mt-1 flex flex-wrap gap-1">
                <span v-for="t in w.problem.strategyTags" :key="t" class="chip text-xs">{{ t }}</span>
              </div>
              <p v-if="w.fixed" class="mt-1 text-xs font-bold text-green-600">✅ 다시 맞혔어요!</p>
            </div>
            <button v-if="!w.fixed && solvingId !== w.problem.questionId" class="btn-secondary shrink-0 text-sm" @click="solvingId = w.problem.questionId">
              다시 풀기
            </button>
          </div>

          <div v-if="solvingId === w.problem.questionId" class="mt-3 border-t border-slate-100 pt-3">
            <div class="flex gap-2">
              <input
                v-model="retryInput"
                type="text" inputmode="numeric"
                class="input-number !py-2 !text-2xl"
                placeholder="답 입력"
                @keydown.enter="checkRetry(w)"
              />
              <button class="btn-primary shrink-0" @click="checkRetry(w)">확인</button>
            </div>
            <p v-if="retryMsg" class="mt-2 text-sm font-bold" :class="retryOk ? 'text-green-700' : 'text-red-700'">{{ retryMsg }}</p>
            <p class="mt-1 text-xs text-slate-400">복습 연습은 공식 기록에 별도로 집계되지 않아요.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadDB, saveDB, type LocalDB, type WrongItem } from '~/composables/useLocalStore'
import { ERROR_LABEL } from '../../lib/adaptive/error-analysis'

const db = ref<LocalDB>(loadDB())
const filter = ref<'all' | 'unfixed' | 'fixed'>('unfixed')
const solvingId = ref<string | null>(null)
const retryInput = ref('')
const retryMsg = ref('')
const retryOk = ref(false)

const wrongs = computed(() => db.value.wrongs)
const unfixed = computed(() => wrongs.value.filter((w) => !w.fixed))
const fixed = computed(() => wrongs.value.filter((w) => w.fixed))
const shown = computed(() => (filter.value === 'all' ? wrongs.value : filter.value === 'unfixed' ? unfixed.value : fixed.value))

const errorPattern = computed(() => {
  // attempts의 최근 오류 기록으로 패턴 파악
  const counts = new Map<string, number>()
  for (const p of Object.values(db.value.progress)) {
    for (const e of p.errorHistory.slice(-10)) {
      counts.set(e.errorType, (counts.get(e.errorType) ?? 0) + 1)
    }
  }
  if (counts.size === 0) return ''
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top) return ''
  const label = (ERROR_LABEL as Record<string, string>)[top[0]] ?? top[0]
  return `최근에 '${label}'이(가) ${top[1]}회 감지되었어요. 관련 개념 설명을 다시 읽어보세요.`
})

function checkRetry(w: WrongItem) {
  const answer = Number(retryInput.value.trim())
  if (!Number.isInteger(answer)) {
    retryMsg.value = '숫자를 입력하세요.'
    retryOk.value = false
    return
  }
  if (answer === w.problem.answer) {
    retryOk.value = true
    retryMsg.value = '정답! 🎉 교정되었어요.'
    w.fixed = true
    saveDB(db.value)
    setTimeout(() => {
      solvingId.value = null
      retryInput.value = ''
      retryMsg.value = ''
    }, 1200)
  } else {
    retryOk.value = false
    retryMsg.value = `땡! 정답은 ${w.problem.answer} 이에요. 과정을 다시 생각해 보세요.`
  }
}

onMounted(() => {
  db.value = loadDB()
})
</script>
