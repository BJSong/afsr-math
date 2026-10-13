/**
 * 적응형 학습 엔진 (명세 8)
 *
 * 출제 우선순위: P(s) = wE·E + wR·R + wF·F + wT·T   (기본 0.35/0.25/0.20/0.20)
 * 각 요소는 0~1로 정규화, 가중치는 정책에서 변경 가능.
 *
 * ⚠ 이 공식은 초기 설계 가설이며, 교육 연구에서 검증된 값이 아니다.
 *    학습 데이터에 따라 조정 가능하도록 모든 상수는 AdaptivePolicy에 둔다.
 */
import type { AdaptivePolicy } from '../adaptive-types'
import type { SkillProgress } from '../types'
import { DEFAULT_POLICY } from '../policy'
import { isMasteredState, prerequisitesMet } from '../skills/skill-graph'

const DAY_MS = 86400000
const RECENT_WINDOW = 10

export function recentAccuracy(p: SkillProgress, window = RECENT_WINDOW): number {
  const r = p.recentResults.slice(-window)
  if (r.length === 0) return NaN
  return r.filter(Boolean).length / r.length
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  if (s.length % 2 === 1) return s[mid] ?? null
  return ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2
}

export interface PriorityBreakdown {
  error: number
  review: number
  fluency: number
  transfer: number
  total: number
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

/**
 * E: 최근 오류 수준 — 최근 정답률이 낮을수록 1에 가까움
 * 시도 기록이 없으면 중립값 0.4 (새 스킬이 완전히 무시되지 않도록)
 */
function errorComponent(p: SkillProgress): number {
  const acc = recentAccuracy(p)
  if (Number.isNaN(acc)) return 0.4
  return clamp01(1 - acc)
}

/**
 * R: 복습 필요성 — 복습 예정일을 지날수록 1에 가까움
 * 예정일이 없으면(한 번도 복습 안 함) 0.2
 */
function reviewComponent(p: SkillProgress, now: Date): number {
  if (!p.nextReviewAt) return 0.2
  const intervalDays = Math.max(
    1,
    (now.getTime() - new Date(p.lastLearnedAt ?? now.toISOString()).getTime()) / DAY_MS,
  )
  const overdueDays = (now.getTime() - new Date(p.nextReviewAt).getTime()) / DAY_MS
  if (overdueDays <= 0) return 0
  return clamp01(0.5 + overdueDays / intervalDays)
}

/**
 * F: 계산 유창성 개선 필요성 — 정확하지만 목표 시간보다 느리면 1에 가까움
 * 정확도가 낮으면 유창성보다 정확성이 우선이므로 0
 */
function fluencyComponent(
  p: SkillProgress,
  policy: AdaptivePolicy = DEFAULT_POLICY,
): number {
  const acc = recentAccuracy(p)
  if (Number.isNaN(acc) || acc < policy.thresholds.holdAccuracy) return 0
  if (p.medianDurationMs == null) return 0
  const target = policy.thresholds.fluencyTargetMsDefault
  const ratio = p.medianDurationMs / target
  return clamp01(ratio - 1) // 목표의 2배 느리면 1
}

/**
 * T: 개념 적용 및 전이 필요성
 * 전이 문제를 풀어보지 않았으면 0.5, 실패했으면 1.0, 성공했으면 0
 */
function transferComponent(p: SkillProgress): number {
  if (p.transferSolved) return 0
  if (p.transferAttempted) return 1.0
  return 0.5
}

export function computePriority(
  p: SkillProgress,
  policy: AdaptivePolicy = DEFAULT_POLICY,
  now: Date = new Date(),
): PriorityBreakdown {
  const w = policy.priorityWeights
  const wSum = w.error + w.review + w.fluency + w.transfer || 1
  const error = errorComponent(p)
  const review = reviewComponent(p, now)
  const fluency = fluencyComponent(p, policy)
  const transfer = transferComponent(p)
  const total = (w.error * error + w.review * review + w.fluency * fluency + w.transfer * transfer) / wSum
  return { error, review, fluency, transfer, total }
}

export interface SelectOptions {
  count: number
  /** 선수 학습 미충족 스킬 제외 여부 (기본 true, 명세 8.2) */
  requirePrerequisites?: boolean
}

/**
 * 우선순위 순으로 다음 학습 스킬 선택.
 * 선수 학습을 충족하지 않은 스킬은 후보에서 제외한다.
 */
export function selectNextSkills(
  progresses: SkillProgress[],
  policy: AdaptivePolicy = DEFAULT_POLICY,
  now: Date = new Date(),
  opts: SelectOptions = { count: 3 },
): { skillId: string; priority: PriorityBreakdown }[] {
  const mastered = new Set(
    progresses.filter((p) => isMasteredState(p.mastery)).map((p) => p.skillId),
  )
  const requirePrereq = opts.requirePrerequisites ?? true
  return progresses
    .filter((p) => !requirePrereq || prerequisitesMet(p.skillId, mastered))
    .map((p) => ({ skillId: p.skillId, priority: computePriority(p, policy, now) }))
    .sort((a, b) => b.priority.total - a.priority.total)
    .slice(0, opts.count)
}

export type DifficultyAction =
  | 'expand' // 점진적 확장 (정확도 90% 이상)
  | 'hold' // 동일 수준 연습 (80~89%)
  | 'reteach' // 개념/전략 재학습 (80% 미만)
  | 'fluency-practice' // 정확하지만 느림 → 유창성 연습
  | 'remove-pressure' // 빠르지만 오답 많음 → 시간 압박 제거

export interface ActionReason {
  action: DifficultyAction
  reason: string
}

/**
 * 명세 8.3 — 난이도 조절 정책 (임계값은 정책에서 변경 가능)
 * 판단 근거가 되는 최소 시도 수에 못 미치면 'hold'를 반환한다.
 */
export function recommendAction(
  p: SkillProgress,
  policy: AdaptivePolicy = DEFAULT_POLICY,
): ActionReason {
  const t = policy.thresholds
  const recent = p.recentResults.slice(-RECENT_WINDOW)
  if (recent.length < t.minRecentForDecision) {
    return { action: 'hold', reason: `판단 근거 부족 (최근 시도 ${recent.length}회)` }
  }
  const acc = recent.filter(Boolean).length / recent.length
  const medianMs = p.medianDurationMs
  const targetMs = t.fluencyTargetMsDefault
  const isFast = medianMs != null && medianMs < targetMs * t.fastRatio
  const isSlow = medianMs != null && medianMs > targetMs * t.slowRatio

  // 빠르지만 오답이 많음 → 시간 압박 제거 (재학습보다 우선)
  if (isFast && acc < t.holdAccuracy) {
    return {
      action: 'remove-pressure',
      reason: `빠르게 풀지만 정확도 ${(acc * 100).toFixed(0)}% — 시간 측정·제한을 끄고 정확성부터`,
    }
  }
  if (acc >= t.expandAccuracy) {
    if (isSlow) {
      return {
        action: 'fluency-practice',
        reason: `정확도 ${(acc * 100).toFixed(0)}%로 높지만 풀이가 느림 — 유창성 연습`,
      }
    }
    return { action: 'expand', reason: `정확도 ${(acc * 100).toFixed(0)}% — 범위·난이도 점진적 확장` }
  }
  if (acc >= t.holdAccuracy) {
    return { action: 'hold', reason: `정확도 ${(acc * 100).toFixed(0)}% — 동일 수준 연습 유지` }
  }
  return {
    action: 'reteach',
    reason: `정확도 ${(acc * 100).toFixed(0)}% — 개념 설명·전략 재학습 후 변형 문제`,
  }
}
