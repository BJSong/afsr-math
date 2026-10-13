import { describe, expect, it } from 'vitest'
import { dueReviews, isReviewDue, nextReview } from '../../lib/adaptive/spaced-repetition'
import { DEFAULT_POLICY } from '../../lib/policy'
import { emptySkillProgress } from '../../lib/types'

describe('nextReview', () => {
  const from = new Date('2026-10-13T00:00:00Z')
  it('성공 시 간격이 1→3→7→14→30일로 진행', () => {
    let idx = 0
    const expected = [3, 7, 14, 30, 30]
    for (const days of expected) {
      const r = nextReview(from, idx, true)
      expect(r.intervalDays).toBe(days)
      idx = r.newIntervalIndex
    }
  })
  it('실패 시 1일로 초기화', () => {
    const r = nextReview(from, 3, false)
    expect(r.intervalDays).toBe(1)
    expect(r.newIntervalIndex).toBe(0)
  })
  it('다음 복습일이 정확히 계산된다', () => {
    const r = nextReview(from, 0, true)
    expect(r.nextReviewAt.toISOString()).toBe('2026-10-16T00:00:00.000Z')
  })
  it('기본 간격은 정책과 일치', () => {
    expect(DEFAULT_POLICY.reviewIntervalsDays).toEqual([1, 3, 7, 14, 30])
  })
})

describe('isReviewDue / dueReviews', () => {
  it('예정일이 지나면 due', () => {
    const p = emptySkillProgress('add-basic')
    p.nextReviewAt = new Date(Date.now() - 1000).toISOString()
    expect(isReviewDue(p)).toBe(true)
  })
  it('예정일이 없으면 due 아님', () => {
    expect(isReviewDue(emptySkillProgress('add-basic'))).toBe(false)
  })
  it('dueReviews는 예정일 순 정렬', () => {
    const a = { ...emptySkillProgress('a'), nextReviewAt: new Date(Date.now() - 2000).toISOString() }
    const b = { ...emptySkillProgress('b'), nextReviewAt: new Date(Date.now() - 5000).toISOString() }
    const c = { ...emptySkillProgress('c'), nextReviewAt: new Date(Date.now() + 5000).toISOString() }
    const due = dueReviews([a, b, c])
    expect(due.map((p) => p.skillId)).toEqual(['b', 'a'])
  })
})
