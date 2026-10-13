import { describe, expect, it } from 'vitest'
import { updateMastery } from '../../lib/adaptive/mastery'
import { DEFAULT_POLICY } from '../../lib/policy'

describe('updateMastery', () => {
  it('new → learning (첫 시도)', () => {
    expect(
      updateMastery('new', { attempts: 1, recentAccuracy: 1, reviewSuccess: null }),
    ).toBe('learning')
  })
  it('learning → practicing (10회 이상, 정확도 80% 이상)', () => {
    expect(
      updateMastery('learning', { attempts: 10, recentAccuracy: 0.85, reviewSuccess: null }),
    ).toBe('practicing')
    expect(
      updateMastery('learning', { attempts: 10, recentAccuracy: 0.7, reviewSuccess: null }),
    ).toBe('learning')
  })
  it('소수 시도로는 provisional_mastery 불가', () => {
    expect(
      updateMastery('practicing', { attempts: 5, recentAccuracy: 1, reviewSuccess: null }),
    ).toBe('practicing')
  })
  it('practicing → provisional_mastery (20회 이상, 정확도 90% 이상)', () => {
    expect(
      updateMastery(
        'practicing',
        { attempts: DEFAULT_POLICY.thresholds.minAttemptsForMastery, recentAccuracy: 0.95, reviewSuccess: null },
      ),
    ).toBe('provisional_mastery')
  })
  it('provisional_mastery → retained (복습 성공)', () => {
    expect(
      updateMastery('provisional_mastery', { attempts: 25, recentAccuracy: 0.95, reviewSuccess: true }),
    ).toBe('retained')
  })
  it('복습 실패 시 강등', () => {
    expect(
      updateMastery('retained', { attempts: 30, recentAccuracy: 0.9, reviewSuccess: false }),
    ).toBe('practicing')
    expect(
      updateMastery('provisional_mastery', { attempts: 25, recentAccuracy: 0.9, reviewSuccess: false }),
    ).toBe('practicing')
  })
  it('정확도 급락 시 강등', () => {
    expect(
      updateMastery('practicing', { attempts: 25, recentAccuracy: 0.5, reviewSuccess: null }),
    ).toBe('learning')
  })
})
