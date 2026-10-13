/**
 * 문제 풀이 세션 러너 (drill / adaptive / thinking 공용)
 *
 * 흐름: 문제 출제(서버) → 풀이 → 답안 제출 → 서버 측 채점 → 로컬 기록 → 다음 문제
 * 정답은 서버가 /api/attempts 응답으로만 전달한다.
 */
import { computed, ref } from 'vue'
import type { ErrorType, GeneratedProblem, LearningSession } from '../../lib/types'
import {
  loadDB,
  recordAttempt,
  recordSession,
  type LocalDB,
} from './useLocalStore'

export interface ClientProblem {
  questionId: string
  skillId: string
  operator: GeneratedProblem['operator']
  operands: number[]
  prompt: string
  hint?: string
}

export interface GradeResult {
  isCorrect: boolean
  correctAnswer: number
  remainder: number | null
  errorTypes: { type: ErrorType; label: string; estimated: boolean; detail: string }[]
  duplicate: boolean
}

export interface SessionResult {
  isCorrect: boolean
  durationMs: number
  skillId: string
}

export function useProblemSession() {
  const problems = ref<ClientProblem[]>([])
  const index = ref(0)
  const results = ref<SessionResult[]>([])
  const currentResult = ref<GradeResult | null>(null)
  const submitting = ref(false)
  const finished = ref(false)
  const startedAt = ref('')
  const mode = ref<LearningSession['mode']>('drill')
  const db = ref<LocalDB>(loadDB())

  const current = () => problems.value[index.value]
  const currentProblem = computed(() => problems.value[index.value] ?? null)
  const isLast = () => index.value >= problems.value.length - 1

  function start(list: ClientProblem[], m: LearningSession['mode']) {
    problems.value = list
    mode.value = m
    index.value = 0
    results.value = []
    currentResult.value = null
    finished.value = false
    startedAt.value = new Date().toISOString()
    db.value = loadDB()
  }

  async function submit(answer: number | null, durationMs: number): Promise<void> {
    const p = current()
    if (!p || submitting.value || currentResult.value) return
    submitting.value = true
    try {
      const res = await $fetch<GradeResult>('/api/attempts', {
        method: 'POST',
        body: { questionId: p.questionId, userAnswer: answer, durationMs },
      })
      currentResult.value = res

      // 로컬 학습 기록 (정답은 서버 응답에서만 가져옴)
      const full: GeneratedProblem = {
        questionId: p.questionId,
        skillId: p.skillId,
        operator: p.operator,
        operands: p.operands,
        answer: res.correctAnswer,
        remainder: res.remainder,
        operandDigits: [String(p.operands[0]).length, String(p.operands[1] ?? 0).length] as [number, number],
        difficulty: 'medium',
        conceptTags: [],
        strategyTags: [],
        prerequisiteSkills: [],
        generatedAt: new Date().toISOString(),
        prompt: p.prompt,
        features: { carries: 0, borrows: 0, mulCarries: 0, columns: 1, remainder: false, mixed: false },
        hint: p.hint,
      }
      recordAttempt(
        db.value,
        full,
        answer,
        { isCorrect: res.isCorrect, correctAnswer: res.correctAnswer, errorTypes: res.errorTypes ?? [] },
        durationMs,
      )
      results.value.push({ isCorrect: res.isCorrect, durationMs, skillId: p.skillId })
    } finally {
      submitting.value = false
    }
  }

  function next(): void {
    if (isLast()) {
      finish()
      return
    }
    currentResult.value = null
    index.value += 1
  }

  function finish(): void {
    const session: LearningSession = {
      sessionId: `s_${Date.now().toString(36)}`,
      mode: mode.value,
      startedAt: startedAt.value,
      endedAt: new Date().toISOString(),
      segments: [],
      attemptIds: [],
    }
    recordSession(db.value, session)
    finished.value = true
  }

  function quit(): void {
    if (results.value.length > 0 && !finished.value) finish()
  }

  return {
    problems, index, results, currentResult, submitting, finished,
    current, currentProblem, isLast, start, submit, next, finish, quit, db,
  }
}
