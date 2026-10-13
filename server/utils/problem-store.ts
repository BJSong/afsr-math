/**
 * 출제된 문제의 정답 보관소 (서버 측)
 *
 * 명세 13.4: 클라이언트가 전달하는 score/isCorrect/userId 등을 신뢰하지 않고,
 * 서버가 직접 생성·보관한 정답으로 채점한다.
 *
 * - local 모드: 인메모리 Map (단일 인스턴스 개발용)
 * - cloud 모드: Supabase `question_sessions` 테이블 사용 (Phase 3, 마이그레이션 준비됨)
 *   인스턴스 메모리에만 의존하는 방식은 서버리스 운영에 부적합하므로,
 *   운영 전환 시 반드시 DB 기반으로 교체한다.
 */
import type { GeneratedProblem } from '../../lib/types'

interface StoredQuestion {
  operator: GeneratedProblem['operator']
  operands: number[]
  answer: number
  remainder: number | null
  skillId: string
  issuedAt: number
  graded: boolean
  lastResult?: { isCorrect: boolean; correctAnswer: number }
}

const store = new Map<string, StoredQuestion>()
const TTL_MS = 1000 * 60 * 60 * 4 // 4시간 후 만료

function sweep(): void {
  const now = Date.now()
  for (const [k, v] of store) {
    if (now - v.issuedAt > TTL_MS) store.delete(k)
  }
}

export function issueQuestions(problems: GeneratedProblem[]): void {
  if (store.size > 5000) sweep()
  for (const p of problems) {
    store.set(p.questionId, {
      operator: p.operator,
      operands: p.operands,
      answer: p.answer,
      remainder: p.remainder,
      skillId: p.skillId,
      issuedAt: Date.now(),
      graded: false,
    })
  }
}

export function getQuestion(questionId: string): StoredQuestion | undefined {
  const q = store.get(questionId)
  if (!q) return undefined
  if (Date.now() - q.issuedAt > TTL_MS) {
    store.delete(questionId)
    return undefined
  }
  return q
}

export function markGraded(
  questionId: string,
  result: { isCorrect: boolean; correctAnswer: number },
): void {
  const q = store.get(questionId)
  if (q) {
    q.graded = true
    q.lastResult = result
  }
}
