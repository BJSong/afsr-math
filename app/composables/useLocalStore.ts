/**
 * 로컬 저장소 (MVP) — localStorage 기반
 *
 * 명세 4.2: 초기 MVP는 로컬 저장소로 동작. Supabase Auth·RLS 완성 전에는
 * 실제 사용자 데이터를 클라우드에 저장하지 않는다.
 * 저장소 인터페이스는 Supabase 어댑터로 교체 가능하도록 함수 단위로 분리.
 */
import type {
  AttemptRecord,
  ErrorClassification,
  GeneratedProblem,
  LearningSession,
  SkillProgress,
  UserSettings,
} from '../../lib/types'
import { emptySkillProgress } from '../../lib/types'
import { median, recentAccuracy } from '../../lib/adaptive/engine'
import { updateMastery } from '../../lib/adaptive/mastery'
import { nextReview } from '../../lib/adaptive/spaced-repetition'
import { DEFAULT_POLICY } from '../../lib/policy'

const DB_KEY = 'afsr-math:v1'

export interface WrongItem {
  problem: GeneratedProblem
  userAnswer: number | null
  at: string
  fixed: boolean
}

export interface LocalDB {
  version: 1
  settings: UserSettings
  attempts: AttemptRecord[]
  progress: Record<string, SkillProgress>
  wrongs: WrongItem[]
  sessions: LearningSession[]
}

const defaultSettings = (): UserSettings => ({
  nickname: '수학 탐험가',
  defaultMinutes: 10,
  soundOn: false,
  timerOn: true,
  understoodExperimental: false,
})

function defaultDB(): LocalDB {
  return {
    version: 1,
    settings: defaultSettings(),
    attempts: [],
    progress: {},
    wrongs: [],
    sessions: [],
  }
}

function isClient(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadDB(): LocalDB {
  if (!isClient()) return defaultDB()
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return defaultDB()
    const db = JSON.parse(raw) as LocalDB
    if (db.version !== 1) return defaultDB()
    return db
  } catch {
    return defaultDB()
  }
}

export function saveDB(db: LocalDB): void {
  if (!isClient()) return
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDB(): void {
  if (!isClient()) return
  localStorage.removeItem(DB_KEY)
}

export function exportDBJSON(db: LocalDB): string {
  return JSON.stringify(db, null, 2)
}

/** 스킬 진행 상태 조회 (없으면 생성) */
export function getProgress(db: LocalDB, skillId: string): SkillProgress {
  let p = db.progress[skillId]
  if (!p) {
    p = emptySkillProgress(skillId)
    db.progress[skillId] = p
  }
  return p
}

export interface GradedResult {
  isCorrect: boolean
  correctAnswer: number
  errorTypes: ErrorClassification[]
}

/**
 * 학습 기록 저장 + 숙달도 갱신 + 복습 일정 반영 (원자적: 한 번의 save로 처리)
 * 명세 13.4의 "가능한 한 원자적 트랜잭션" 원칙을 로컬에서 적용
 */
export function recordAttempt(
  db: LocalDB,
  problem: GeneratedProblem,
  userAnswer: number | null,
  graded: GradedResult,
  durationMs: number,
): AttemptRecord {
  const now = new Date().toISOString()
  const attempt: AttemptRecord = {
    attemptId: `a_${Date.now().toString(36)}_${Math.floor(Math.random() * 2 ** 32).toString(36)}`,
    questionId: problem.questionId,
    skillId: problem.skillId,
    operator: problem.operator,
    operands: problem.operands,
    userAnswer,
    correctAnswer: graded.correctAnswer,
    isCorrect: graded.isCorrect,
    durationMs,
    errorTypes: graded.errorTypes,
    attemptedAt: now,
  }
  db.attempts.push(attempt)

  // 스킬 진행 상태 갱신
  const p = getProgress(db, problem.skillId)
  p.attempts += 1
  if (graded.isCorrect) p.correct += 1
  p.recentResults.push(graded.isCorrect)
  p.recentResults = p.recentResults.slice(-20)
  p.recentDurationsMs.push(durationMs)
  p.recentDurationsMs = p.recentDurationsMs.slice(-20)
  p.medianDurationMs = median(p.recentDurationsMs)
  if (!graded.isCorrect) {
    for (const e of graded.errorTypes) {
      p.errorHistory.push({ errorType: e.type, at: now })
    }
    p.errorHistory = p.errorHistory.slice(-50)
  }
  p.lastLearnedAt = now

  // 숙달도 전이
  const acc = recentAccuracy(p)
  p.mastery = updateMastery(
    p.mastery,
    {
      attempts: p.attempts,
      recentAccuracy: acc,
      reviewSuccess: null, // 일반 시도는 복습 판정이 아님
    },
    DEFAULT_POLICY,
  )

  // 간격 복습 일정 반영 (정답 → 간격 진행, 오답 → 1일로 초기화)
  const plan = nextReview(new Date(), p.reviewIntervalIndex, graded.isCorrect, DEFAULT_POLICY)
  p.reviewIntervalIndex = plan.newIntervalIndex
  p.nextReviewAt = plan.nextReviewAt.toISOString()

  // 오답 노트
  if (!graded.isCorrect) {
    db.wrongs.unshift({
      problem: { ...problem, answer: graded.correctAnswer },
      userAnswer,
      at: now,
      fixed: false,
    })
    db.wrongs = db.wrongs.slice(0, 200)
  } else {
    // 같은 문제를 나중에 맞혔으면 교정 표시
    const w = db.wrongs.find((x) => x.problem.questionId === problem.questionId && !x.fixed)
    if (w) w.fixed = true
  }

  saveDB(db)
  return attempt
}

/** 세션 기록 */
export function recordSession(db: LocalDB, session: LearningSession): void {
  db.sessions.push(session)
  saveDB(db)
}

/** 대시보드용 집계 */
export interface DashboardStats {
  totalAttempts: number
  firstTryAccuracy: number
  medianDurationMs: number | null
  totalMinutes: number
  sessionCount: number
  byOperator: { operator: string; accuracy: number; count: number }[]
  weakSkills: { skillId: string; accuracy: number; attempts: number }[]
  masteredSkills: string[]
  reviewDueCount: number
  trend: { date: string; accuracy: number; count: number }[]
}

export function computeStats(db: LocalDB): DashboardStats {
  const attempts = db.attempts
  const totalAttempts = attempts.length
  const correct = attempts.filter((a) => a.isCorrect).length
  const durations = attempts.map((a) => a.durationMs).filter((d) => d > 0)

  const byOp = new Map<string, { c: number; n: number }>()
  for (const a of attempts) {
    const e = byOp.get(a.operator) ?? { c: 0, n: 0 }
    e.n += 1
    if (a.isCorrect) e.c += 1
    byOp.set(a.operator, e)
  }
  const opLabel: Record<string, string> = { add: '덧셈', sub: '뺄셈', mul: '곱셈', div: '나눗셈' }

  const weakSkills = Object.values(db.progress)
    .filter((p) => p.attempts >= 5)
    .map((p) => ({
      skillId: p.skillId,
      accuracy: p.correct / p.attempts,
      attempts: p.attempts,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)

  const now = Date.now()
  const reviewDueCount = Object.values(db.progress).filter(
    (p) => p.nextReviewAt && new Date(p.nextReviewAt).getTime() <= now,
  ).length

  // 최근 14일 추세
  const trendMap = new Map<string, { c: number; n: number }>()
  for (const a of attempts) {
    const d = a.attemptedAt.slice(0, 10)
    const e = trendMap.get(d) ?? { c: 0, n: 0 }
    e.n += 1
    if (a.isCorrect) e.c += 1
    trendMap.set(d, e)
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14)
    .map(([date, e]) => ({ date: date.slice(5), accuracy: e.c / e.n, count: e.n }))

  const totalMs = db.sessions.reduce((s, x) => {
    if (!x.endedAt) return s
    return s + (new Date(x.endedAt).getTime() - new Date(x.startedAt).getTime())
  }, 0)

  return {
    totalAttempts,
    firstTryAccuracy: totalAttempts ? correct / totalAttempts : 0,
    medianDurationMs: median(durations),
    totalMinutes: Math.round(totalMs / 60000),
    sessionCount: db.sessions.length,
    byOperator: [...byOp.entries()].map(([op, e]) => ({
      operator: opLabel[op] ?? op,
      accuracy: e.c / e.n,
      count: e.n,
    })),
    weakSkills,
    masteredSkills: Object.values(db.progress)
      .filter((p) => p.mastery === 'provisional_mastery' || p.mastery === 'retained')
      .map((p) => p.skillId),
    reviewDueCount,
    trend,
  }
}
