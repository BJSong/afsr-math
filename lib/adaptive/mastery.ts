/**
 * 숙달 상태 전이 (명세 8.1)
 *
 * new → learning → practicing → provisional_mastery → retained
 * - 소수의 문제만으로 숙달을 확정하지 않는다 (minAttemptsForMastery)
 * - 복습 실패 시 단계 강등
 */
import type { AdaptivePolicy } from '../adaptive-types'
import type { MasteryState } from '../types'
import { DEFAULT_POLICY } from '../policy'

export interface MasteryStats {
  attempts: number
  recentAccuracy: number // NaN 가능 (시도 없음)
  /** 예정된 복습의 성공 여부 (해당 없으면 null) */
  reviewSuccess: boolean | null
}

export function updateMastery(
  current: MasteryState,
  stats: MasteryStats,
  policy: AdaptivePolicy = DEFAULT_POLICY,
): MasteryState {
  const t = policy.thresholds
  const { attempts, recentAccuracy: acc, reviewSuccess } = stats

  // 복습 결과에 따른 강등 (최우선)
  if (reviewSuccess === false) {
    if (current === 'retained' || current === 'provisional_mastery') return 'practicing'
    return 'learning'
  }

  switch (current) {
    case 'new':
      return attempts >= 1 ? 'learning' : 'new'
    case 'learning': {
      if (attempts >= 10 && acc >= t.holdAccuracy) return 'practicing'
      return 'learning'
    }
    case 'practicing': {
      // 정확도 하락 시 강등
      if (attempts >= 10 && acc < t.regressionAccuracy) return 'learning'
      if (attempts >= t.minAttemptsForMastery && acc >= t.expandAccuracy) {
        return 'provisional_mastery'
      }
      return 'practicing'
    }
    case 'provisional_mastery': {
      if (attempts >= 10 && acc < t.regressionAccuracy) return 'learning'
      if (reviewSuccess === true) return 'retained'
      return 'provisional_mastery'
    }
    case 'retained': {
      // retained는 복습 성공으로 유지, 실패는 위에서 처리됨
      return 'retained'
    }
  }
}

export const MASTERY_LABEL: Record<MasteryState, string> = {
  new: '새로운 유형',
  learning: '학습 중',
  practicing: '연습 중',
  provisional_mastery: '가숙달',
  retained: '장기 유지',
}
