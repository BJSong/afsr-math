/**
 * 간격 복습 (명세 8.4, Spaced Practice)
 *
 * 기본 간격: 1일 → 3일 → 7일 → 14일 → 30일
 * - 복습 성공 → 다음 단계로 진행
 * - 복습 실패 → 간격 초기화 (1일)
 * - 같은 문제 반복보다 같은 개념의 새로운 문제를 우선 (출제 시 적용)
 */
import type { AdaptivePolicy } from '../adaptive-types'
import type { SkillProgress } from '../types'
import { DEFAULT_POLICY } from '../policy'

export interface ReviewPlan {
  nextReviewAt: Date
  newIntervalIndex: number
  intervalDays: number
}

export function nextReview(
  from: Date,
  intervalIndex: number,
  success: boolean,
  policy: AdaptivePolicy = DEFAULT_POLICY,
): ReviewPlan {
  const ladder = policy.reviewIntervalsDays
  const newIntervalIndex = success
    ? Math.min(intervalIndex + 1, ladder.length - 1)
    : 0
  const intervalDays = ladder[newIntervalIndex] ?? 1
  return {
    nextReviewAt: new Date(from.getTime() + intervalDays * 86400000),
    newIntervalIndex,
    intervalDays,
  }
}

/** 복습 예정일이 지났는지 */
export function isReviewDue(p: SkillProgress, now: Date = new Date()): boolean {
  if (!p.nextReviewAt) return false
  return new Date(p.nextReviewAt).getTime() <= now.getTime()
}

/** 복습 대상 스킬 목록 (예정일 순 정렬) */
export function dueReviews(
  progresses: SkillProgress[],
  now: Date = new Date(),
): SkillProgress[] {
  return progresses
    .filter((p) => isReviewDue(p, now))
    .sort(
      (a, b) =>
        new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime(),
    )
}
