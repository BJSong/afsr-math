/**
 * 적응형 정책 타입 (policy.ts가 참조, 순환 import 방지용 분리)
 */
import type { SessionSegmentKind } from './types'

export interface AdaptivePolicy {
  priorityWeights: {
    error: number
    review: number
    fluency: number
    transfer: number
  }
  thresholds: {
    expandAccuracy: number
    holdAccuracy: number
    reteachAccuracy: number
    minAttemptsForMastery: number
    minRecentForDecision: number
    fluencyTargetMsDefault: number
    slowRatio: number
    fastRatio: number
    regressionAccuracy: number
  }
  reviewIntervalsDays: number[]
  sessionPlan: {
    totalMinutes: number
    segments: { kind: SessionSegmentKind; minutes: number }[]
  }
  difficultyThresholds: {
    easyBelow: number
    mediumBelow: number
  }
}
