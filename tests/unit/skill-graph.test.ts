import { describe, expect, it } from 'vitest'
import {
  SKILLS,
  getSkill,
  isMasteredState,
  prerequisitesMet,
  topologicalOrder,
  validateSkillGraph,
} from '../../lib/skills/skill-graph'
import type { Skill } from '../../lib/types'

describe('validateSkillGraph', () => {
  it('기본 그래프는 유효하다', () => {
    expect(() => validateSkillGraph()).not.toThrow()
  })
  it('존재하지 않는 선수 스킬 참조를 검출한다', () => {
    const bad: Skill[] = [
      { ...SKILLS[0], skillId: 'x', prerequisites: ['nope'] },
    ]
    expect(() => validateSkillGraph(bad)).toThrow()
  })
  it('순환 관계를 검출한다', () => {
    const cyclic: Skill[] = [
      { ...SKILLS[0], skillId: 'a', prerequisites: ['b'] },
      { ...SKILLS[1], skillId: 'b', prerequisites: ['a'] },
    ]
    expect(() => validateSkillGraph(cyclic)).toThrow(/순환/)
  })
  it('자기 참조를 검출한다', () => {
    const self: Skill[] = [{ ...SKILLS[0], prerequisites: [SKILLS[0].skillId] }]
    expect(() => validateSkillGraph(self)).toThrow()
  })
})

describe('topologicalOrder', () => {
  it('선수 스킬이 항상 먼저 나온다', () => {
    const order = topologicalOrder()
    const pos = new Map(order.map((id, i) => [id, i]))
    for (const s of SKILLS) {
      for (const p of s.prerequisites) {
        expect(pos.get(p)!).toBeLessThan(pos.get(s.skillId)!)
      }
    }
  })
  it('모든 스킬이 포함된다', () => {
    expect(topologicalOrder()).toHaveLength(SKILLS.length)
  })
})

describe('prerequisitesMet', () => {
  it('선수 학습 미충족 시 false', () => {
    expect(prerequisitesMet('add-multi', new Set(['add-basic']))).toBe(false)
  })
  it('선수 학습 충족 시 true', () => {
    expect(prerequisitesMet('add-multi', new Set(['add-basic', 'add-carry']))).toBe(true)
  })
  it('선수 없는 스킬은 항상 true', () => {
    expect(prerequisitesMet('add-basic', new Set())).toBe(true)
  })
})

describe('getSkill / isMasteredState', () => {
  it('스킬 조회', () => {
    expect(getSkill('mul-basic').name).toBe('구구단')
    expect(() => getSkill('unknown')).toThrow()
  })
  it('숙달 상태 판정', () => {
    expect(isMasteredState('provisional_mastery')).toBe(true)
    expect(isMasteredState('retained')).toBe(true)
    expect(isMasteredState('practicing')).toBe(false)
    expect(isMasteredState('new')).toBe(false)
  })
})
