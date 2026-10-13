/**
 * AFSR Math 공유 타입 정의
 * 프레임워크에 의존하지 않는 순수 TypeScript 모듈
 */

export type Operator = 'add' | 'sub' | 'mul' | 'div'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type CarryMode = 'none' | 'required' | 'any'
export type MasteryState =
  | 'new'
  | 'learning'
  | 'practicing'
  | 'provisional_mastery'
  | 'retained'

export const OPERATOR_SYMBOL: Record<Operator, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
}

export const OPERATOR_LABEL: Record<Operator, string> = {
  add: '덧셈',
  sub: '뺄셈',
  mul: '곱셈',
  div: '나눗셈',
}

export interface DigitRange {
  min: number
  max: number
}

export interface ProblemOptions {
  operator: Operator | 'mixed'
  digitsA: DigitRange
  digitsB: DigitRange
  difficulty: Difficulty
  carry: CarryMode
  allowNegative: boolean
  allowRemainder: boolean
  count?: number
  seed?: number
}

export interface ProblemFeatures {
  carries: number
  borrows: number
  mulCarries: number
  columns: number
  remainder: boolean
  mixed: boolean
}

/** 명세 6.3 — 문제 메타데이터 */
export interface GeneratedProblem {
  questionId: string
  skillId: string
  operator: Operator
  operands: number[]
  answer: number
  /** 나머지가 허용된 나눗셈에서만 설정, 그 외 null */
  remainder: number | null
  operandDigits: [number, number]
  difficulty: Difficulty
  conceptTags: string[]
  strategyTags: string[]
  prerequisiteSkills: string[]
  generatedAt: string
  /** 화면 표시용, 예: "48 × 25 = ?" */
  prompt: string
  features: ProblemFeatures
  /** 수학적 사고 훈련용 힌트 (선택) */
  hint?: string
}

/** 명세 7 — Skill 정의 */
export interface Skill {
  skillId: string
  name: string
  description: string
  operation: Operator | 'thinking'
  difficulty: Difficulty
  prerequisites: string[]
  relatedSkills: string[]
  assessmentRules: string
}

export type ErrorType =
  | 'basic-calc'
  | 'carry'
  | 'borrow'
  | 'place-value'
  | 'operator-confusion'
  | 'order'
  | 'concept-gap'

export interface ErrorClassification {
  type: ErrorType
  label: string
  /** 최종 답안만으로 원인을 확정할 수 없으면 true (명세 10) */
  estimated: boolean
  detail: string
}

export interface AttemptRecord {
  attemptId: string
  questionId: string
  skillId: string
  operator: Operator
  operands: number[]
  userAnswer: number | null
  correctAnswer: number
  isCorrect: boolean
  durationMs: number
  errorTypes: ErrorClassification[]
  attemptedAt: string
}

/** 명세 8.1 — Skill별 학습 상태 */
export interface SkillProgress {
  skillId: string
  attempts: number
  correct: number
  /** 최근 시도 결과 (최대 20개, 오래된 순) */
  recentResults: boolean[]
  /** 최근 풀이 시간 ms (최대 20개) */
  recentDurationsMs: number[]
  medianDurationMs: number | null
  errorHistory: { errorType: ErrorType; at: string }[]
  conceptUnderstood: boolean
  strategyUnderstood: boolean
  transferAttempted: boolean
  transferSolved: boolean
  lastLearnedAt: string | null
  nextReviewAt: string | null
  reviewIntervalIndex: number
  mastery: MasteryState
}

export function emptySkillProgress(skillId: string): SkillProgress {
  return {
    skillId,
    attempts: 0,
    correct: 0,
    recentResults: [],
    recentDurationsMs: [],
    medianDurationMs: null,
    errorHistory: [],
    conceptUnderstood: false,
    strategyUnderstood: false,
    transferAttempted: false,
    transferSolved: false,
    lastLearnedAt: null,
    nextReviewAt: null,
    reviewIntervalIndex: 0,
    mastery: 'new',
  }
}

export type SessionSegmentKind = 'warmup' | 'weak-focus' | 'mixed-fluency' | 'review-fix'

export interface SessionSegment {
  kind: SessionSegmentKind
  minutes: number
  skillIds: string[]
  /** 권장 문제 수 (문제당 약 30초 가정 — 조정 가능) */
  targetCount: number
}

export interface LearningSession {
  sessionId: string
  mode: 'drill' | 'adaptive' | 'thinking'
  startedAt: string
  endedAt: string | null
  segments: SessionSegment[]
  attemptIds: string[]
}

export interface UserSettings {
  nickname: string
  defaultMinutes: number
  soundOn: boolean
  timerOn: boolean
  /** 검증되지 않은 알고리즘이 아님을 표시하기 위한 동의 플래그 (온보딩용) */
  understoodExperimental: boolean
}
