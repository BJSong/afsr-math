/**
 * AFSR Math 학습 정책 (설정 가능한 값)
 *
 * 중요: 이 파일의 가중치·임계값·간격은 "초기 설계 가설"이다.
 * 교육 연구에서 입증된 값이 아니므로, UI·문서에서 과학적으로 검증된
 * 사실처럼 표현하지 않는다. 학습 데이터가 쌓이면 조정한다. (명세 2.3, 8.2)
 */
import type { AdaptivePolicy } from './adaptive-types'

export const DEFAULT_POLICY: AdaptivePolicy = {
  priorityWeights: {
    error: 0.35,
    review: 0.25,
    fluency: 0.2,
    transfer: 0.2,
  },
  thresholds: {
    /** 이 정확도 이상이면 난이도/범위 점진적 확장 */
    expandAccuracy: 0.9,
    /** 이 정확도 이상이면 동일 수준 연습 유지 */
    holdAccuracy: 0.8,
    /** 이 정확도 미만이면 개념/전략 재학습 */
    reteachAccuracy: 0.8,
    /** 숙달 판정에 필요한 최소 시도 횟수 (소수로 숙달 확정 금지) */
    minAttemptsForMastery: 20,
    /** 난이도 조정 판단에 필요한 최소 최근 시도 수 */
    minRecentForDecision: 5,
    /** 스킬별 목표 풀이 시간(ms). 기본값, 스킬별로 override 가능 */
    fluencyTargetMsDefault: 8000,
    /** 목표 시간의 몇 배보다 느리면 "정확하지만 느림"으로 판단 */
    slowRatio: 1.5,
    /** 목표 시간의 몇 배보다 빠르면서 오답이 많으면 "시간 압박 제거" */
    fastRatio: 0.6,
    /** 최근 정확도가 이 값 미만이면 숙달 단계 강등 */
    regressionAccuracy: 0.6,
  },
  /** 명세 8.4 — 기본 복습 간격 (일) */
  reviewIntervalsDays: [1, 3, 7, 14, 30],
  /** 명세 9 — 기본 10분 세션 구성 */
  sessionPlan: {
    totalMinutes: 10,
    segments: [
      { kind: 'warmup', minutes: 2 },
      { kind: 'weak-focus', minutes: 3 },
      { kind: 'mixed-fluency', minutes: 3 },
      { kind: 'review-fix', minutes: 2 },
    ],
  },
  /** 난이도 점수 판정 기준 (명세 6.2 — 코드와 테스트로 정의) */
  difficultyThresholds: {
    easyBelow: 2.5,
    mediumBelow: 5,
  },
}

/** 정책 병합: 저장된 사용자 정책과 기본 정책 결합 */
export function resolvePolicy(partial?: Partial<AdaptivePolicy>): AdaptivePolicy {
  if (!partial) return structuredClone(DEFAULT_POLICY)
  return {
    priorityWeights: { ...DEFAULT_POLICY.priorityWeights, ...partial.priorityWeights },
    thresholds: { ...DEFAULT_POLICY.thresholds, ...partial.thresholds },
    reviewIntervalsDays: partial.reviewIntervalsDays ?? [...DEFAULT_POLICY.reviewIntervalsDays],
    sessionPlan: partial.sessionPlan ?? structuredClone(DEFAULT_POLICY.sessionPlan),
    difficultyThresholds: {
      ...DEFAULT_POLICY.difficultyThresholds,
      ...partial.difficultyThresholds,
    },
  }
}
