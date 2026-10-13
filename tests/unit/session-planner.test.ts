import { describe, expect, it } from 'vitest'
import { planSession } from '../../lib/session/planner'

describe('planSession', () => {
  it('기본 10분 세션은 2/3/3/2 구성', () => {
    const segs = planSession({ weakSkillIds: ['add-carry'], reviewDueSkillIds: [], fixSkillIds: [] })
    expect(segs.map((s) => s.minutes)).toEqual([2, 3, 3, 2])
    expect(segs.map((s) => s.kind)).toEqual(['warmup', 'weak-focus', 'mixed-fluency', 'review-fix'])
  })
  it('시간 변경 시 비례 배분', () => {
    const segs = planSession({ weakSkillIds: [], reviewDueSkillIds: [], fixSkillIds: [] }, 20)
    expect(segs.reduce((s, x) => s + x.minutes, 0)).toBe(20)
  })
  it('취약 스킬이 weak-focus에 배정된다', () => {
    const segs = planSession({ weakSkillIds: ['sub-borrow', 'mul-basic'], reviewDueSkillIds: [], fixSkillIds: [] })
    const weak = segs.find((s) => s.kind === 'weak-focus')!
    expect(weak.skillIds).toContain('sub-borrow')
  })
  it('오답 교정 스킬이 review-fix에 배정된다', () => {
    const segs = planSession({ weakSkillIds: [], reviewDueSkillIds: ['add-carry'], fixSkillIds: ['div-basic'] })
    const fix = segs.find((s) => s.kind === 'review-fix')!
    expect(fix.skillIds).toContain('div-basic')
    expect(fix.skillIds).toContain('add-carry')
  })
  it('목표 문제 수가 양수', () => {
    const segs = planSession({ weakSkillIds: [], reviewDueSkillIds: [], fixSkillIds: [] })
    for (const s of segs) expect(s.targetCount).toBeGreaterThan(0)
  })
})
