<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-6 text-2xl font-extrabold">⚙️ 설정 및 데이터 관리</h1>

    <div class="card space-y-5">
      <div>
        <label class="mb-1 block font-bold">닉네임</label>
        <input v-model="settings.nickname" type="text" maxlength="20"
          class="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold outline-none focus:border-indigo-500" />
        <p class="mt-1 text-xs text-slate-400">실명이나 학교 이름은 입력하지 마세요.</p>
      </div>
      <label class="flex items-center justify-between">
        <span class="font-bold">기본 학습 시간 (분)</span>
        <input v-model.number="settings.defaultMinutes" type="number" min="5" max="60"
          class="w-24 rounded-xl border-2 border-slate-200 px-3 py-2 text-center font-bold outline-none focus:border-indigo-500" />
      </label>
      <label class="flex items-center justify-between">
        <span class="font-bold">시간 측정 기본값</span>
        <input v-model="settings.timerOn" type="checkbox" class="h-6 w-6 accent-indigo-600" />
      </label>
      <button class="btn-secondary w-full" @click="save">설정 저장</button>
      <p v-if="saved" class="text-center text-sm font-bold text-green-700">저장되었어요 ✅</p>
    </div>

    <div class="card mt-6">
      <h3 class="font-extrabold">🔬 적응형 알고리즘 안내</h3>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        맞춤 학습의 문제 선택 우선순위(P = 0.35·오류 + 0.25·복습 + 0.20·유창성 + 0.20·전이),
        난이도 임계값(90%·80%), 복습 간격(1→3→7→14→30일)은
        <strong>초기 설계 가설</strong>이며, 교육 연구에서 검증된 값이 아닙니다.
        학습 데이터가 쌓이면 조정됩니다. 효과 검증은 사전·사후 평가와 지연 복습으로
        확인할 수 있도록 설계되어 있습니다.
      </p>
      <label class="mt-3 flex items-start gap-2 text-sm">
        <input v-model="settings.understoodExperimental" type="checkbox" class="mt-1 h-5 w-5 accent-indigo-600" />
        <span>위 내용을 이해했습니다.</span>
      </label>
    </div>

    <div class="card mt-6">
      <h3 class="font-extrabold">💾 내 데이터</h3>
      <p class="mt-1 text-sm text-slate-500">모든 학습 데이터는 이 브라우저(기기)에만 저장됩니다.</p>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row">
        <button class="btn-secondary flex-1" @click="exportData">데이터 내보내기 (JSON)</button>
        <button class="btn-secondary flex-1 !text-red-600" @click="confirmReset">모든 데이터 삭제</button>
      </div>
      <div v-if="resetting" class="mt-3 rounded-xl bg-red-50 p-4 text-sm">
        <p class="font-bold text-red-700">정말 모든 학습 기록을 삭제할까요? 되돌릴 수 없어요.</p>
        <div class="mt-2 flex gap-2">
          <button class="btn-secondary !text-red-600" @click="doReset">네, 삭제합니다</button>
          <button class="btn-secondary" @click="resetting = false">취소</button>
        </div>
      </div>
    </div>

    <div class="card mt-6">
      <h3 class="font-extrabold">🔒 개인정보 보호</h3>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>실명·학교명·생년월일을 수집하지 않습니다.</li>
        <li>위치정보를 수집하지 않습니다.</li>
        <li>계정 탈퇴(데이터 삭제)는 위 "모든 데이터 삭제"로 가능합니다.</li>
        <li>클라우드 동기화는 Supabase 인증·접근 통제가 완성된 후에 제공됩니다.</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { exportDBJSON, loadDB, resetDB, saveDB } from '~/composables/useLocalStore'
import type { UserSettings } from '../../lib/types'

const settings = reactive<UserSettings>({
  nickname: '', defaultMinutes: 10, soundOn: false, timerOn: true, understoodExperimental: false,
})
const saved = ref(false)
const resetting = ref(false)

function save() {
  const db = loadDB()
  db.settings = { ...settings }
  saveDB(db)
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}

function exportData() {
  const blob = new Blob([exportDBJSON(loadDB())], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `afsr-math-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function confirmReset() {
  resetting.value = true
}

function doReset() {
  resetDB()
  resetting.value = false
  const db = loadDB()
  Object.assign(settings, db.settings)
}

onMounted(() => {
  Object.assign(settings, loadDB().settings)
})
</script>
