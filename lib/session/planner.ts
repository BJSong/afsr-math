/**
 * 학습 세션 플래너 (명세 9)
 *
 * 기본 10분: 2분 기초 인출 → 3분 취약 집중 → 3분 혼합 유창성 → 2분 오답 교정/복습
 * - 시간은 변경 가능 (총 시간에 비례 배분)
 * - 시간 제한은 강제 종료 조건이 아님
 * - 새 개념 학습에서는 정확성·이해를 우선 (세션 종류로 구분)
 */
import type { AdaptivePolicy } from '../adaptive-types'
import type { SessionSegment, SessionSegmentKind } from '../types'
import { DEFAULT_POLICY } from '../policy'

export const SEGMENT_LABEL: Record<SessionSegmentKind, string> = {
  warmup: '기초 연산 인출',
  'weak-focus': '취약 유형 집중',
  'mixed-fluency': '혼합 유창성 훈련',
  'review-fix': '오답 교정 및 복습',
}

/** 문제당 예상 풀이 시간(초) — 조정 가능한 가정치 */
const SECONDS_PER_PROBLEM = 30

export interface PlanInput {
  weakSkillIds: string[]
  reviewDueSkillIds: string[]
  fixSkillIds: string[]
  mixedSkillIds?: string[]
}

export function planSession(
  input: PlanInput,
  totalMinutes = DEFAULT_POLICY.sessionPlan.totalMinutes,
  policy: AdaptivePolicy = DEFAULT_POLICY,
): SessionSegment[] {
  const baseTotal = policy.sessionPlan.segments.reduce((s, x) => s + x.minutes, 0)
  const scale = totalMinutes / baseTotal

  const pickSkills = (kind: SessionSegmentKind): string[] => {
    switch (kind) {
      case 'warmup':
        return [...(input.mixedSkillIds ?? []), ...input.weakSkillIds].slice(0, 3)
      case 'weak-focus':
        return input.weakSkillIds.slice(0, 3)
      case 'mixed-fluency':
        return (input.mixedSkillIds ?? input.weakSkillIds).slice(0, 4)
      case 'review-fix':
        return [...input.fixSkillIds, ...input.reviewDueSkillIds].slice(0, 3)
    }
  }

  return policy.sessionPlan.segments.map((seg) => {
    const minutes = Math.max(1, Math.round(seg.minutes * scale))
    return {
      kind: seg.kind,
      minutes,
      skillIds: pickSkills(seg.kind),
      targetCount: Math.max(2, Math.round((minutes * 60) / SECONDS_PER_PROBLEM)),
    } satisfies SessionSegment
  })
}
