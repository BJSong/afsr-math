import { describe, expect, it } from 'vitest'
import {
  computePriority,
  recentAccuracy,
  recommendAction,
  selectNextSkills,
} from '../../lib/adaptive/engine'
import { DEFAULT_POLICY } from '../../lib/policy'
import { emptySkillProgress, type SkillProgress } from '../../lib/types'

function progressWith(over: Partial<SkillProgress>): SkillProgress {
  return { ...emptySkillProgress('add-carry'), ...over }
}

describe('recentAccuracy', () => {
  it('최근 윈도우 기준 정확도', () => {
    const p = progressWith({ recentResults: [true, true, false, true] })
    expect(recentAccuracy(p)).toBe(0.75)
  })
  it('기록 없으면 NaN', () => {
    expect(Number.isNaN(recentAccuracy(progressWith({})))).toBe(true)
  })
})

describe('computePriority', () => {
  it('오류가 많은 스킬의 우선순위가 높다', () => {
    const bad = progressWith({ skillId: 'add-carry', recentResults: [false, false, false, true, false] })
    const good = progressWith({ skillId: 'add-multi', recentResults: [true, true, true, true, true], transferSolved: true, nextReviewAt: new Date(Date.now() + 86400000).toISOString(), lastLearnedAt: new Date().toISOString() })
    const pb = computePriority(bad, DEFAULT_POLICY, new Date())
    const pg = computePriority(good, DEFAULT_POLICY, new Date())
    expect(pb.total).toBeGreaterThan(pg.total)
    expect(pb.error).toBeCloseTo(0.8, 5)
  })
  it('복습 예정일이 지난 스킬의 R이 1에 가깝다', () => {
    const p = progressWith({
      recentResults: [true, true, true, true, true],
      transferSolved: true,
      lastLearnedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      nextReviewAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    })
    const pr = computePriority(p, DEFAULT_POLICY, new Date())
    expect(pr.review).toBeGreaterThan(0.9)
  })
  it('가중치를 바꾸면 결과가 달라진다 (설정 가능)', () => {
    const p = progressWith({ recentResults: [false, false, false, false] })
    const a = computePriority(p, DEFAULT_POLICY, new Date())
    const custom = {
      ...DEFAULT_POLICY,
      priorityWeights: { error: 1, review: 0, fluency: 0, transfer: 0 },
    }
    const b = computePriority(p, custom, new Date())
    expect(b.total).toBeCloseTo(b.error, 10)
    expect(a.total).not.toBeCloseTo(b.total, 5)
  })
  it('모든 요소는 0~1 범위', () => {
    const p = progressWith({
      recentResults: [true, false],
      medianDurationMs: 60000,
      nextReviewAt: new Date(Date.now() - 86400000).toISOString(),
      lastLearnedAt: new Date(Date.now() - 86400000).toISOString(),
    })
    const pr = computePriority(p, DEFAULT_POLICY, new Date())
    for (const v of [pr.error, pr.review, pr.fluency, pr.transfer, pr.total]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('selectNextSkills', () => {
  it('선수 미충족 스킬은 제외된다', () => {
    const list = [
      progressWith({ skillId: 'add-basic', recentResults: [true, true] }),
      progressWith({ skillId: 'add-multi', recentResults: [false, false, false] }),
    ]
    const picked = selectNextSkills(list, DEFAULT_POLICY, new Date(), { count: 5 })
    // add-multi의 선수(add-carry)가 숙달되지 않았으므로 제외
    expect(picked.map((x) => x.skillId)).not.toContain('add-multi')
  })
  it('우선순위 내림차순 정렬', () => {
    const list = [
      progressWith({ skillId: 'add-basic', recentResults: [true, true, true, true], transferSolved: true }),
      progressWith({ skillId: 'sub-basic', recentResults: [false, false, false, false] }),
    ]
    // sub-basic의 선수 add-basic는 숙달 아님 → 기본 requirePrerequisites=true면 sub-basic 제외
    // 여기서는 선수 조건을 끄고 정렬만 확인
    const picked = selectNextSkills(list, DEFAULT_POLICY, new Date(), { count: 2, requirePrerequisites: false })
    expect(picked[0].skillId).toBe('sub-basic')
    expect(picked[0].priority.total).toBeGreaterThan(picked[1].priority.total)
  })
})

describe('recommendAction', () => {
  it('정확도 90% 이상 → expand', () => {
    const p = progressWith({ recentResults: Array(10).fill(true), medianDurationMs: 5000 })
    expect(recommendAction(p).action).toBe('expand')
  })
  it('정확도 80~89% → hold', () => {
    const p = progressWith({
      recentResults: [true, true, true, true, true, true, true, true, false, false],
      medianDurationMs: 5000,
    })
    expect(recommendAction(p).action).toBe('hold')
  })
  it('정확도 80% 미만 → reteach', () => {
    const p = progressWith({ recentResults: [true, false, false, true, false], medianDurationMs: 9000 })
    expect(recommendAction(p).action).toBe('reteach')
  })
  it('정확하지만 느림 → fluency-practice', () => {
    const p = progressWith({ recentResults: Array(10).fill(true), medianDurationMs: 20000 })
    expect(recommendAction(p).action).toBe('fluency-practice')
  })
  it('빠르지만 오답 많음 → remove-pressure', () => {
    const p = progressWith({
      recentResults: [true, false, true, false, false],
      medianDurationMs: 3000, // 목표 8000의 0.6배 = 4800보다 빠름
    })
    expect(recommendAction(p).action).toBe('remove-pressure')
  })
  it('근거 부족 시 hold', () => {
    const p = progressWith({ recentResults: [true, false] })
    const r = recommendAction(p)
    expect(r.action).toBe('hold')
    expect(r.reason).toContain('판단 근거 부족')
  })
})
