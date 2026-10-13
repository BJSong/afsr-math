import { describe, expect, it } from 'vitest'
import { classifyError, remediationGuide } from '../../lib/adaptive/error-analysis'

describe('classifyError', () => {
  it('연산자 혼동: 8+5=3 → 뺄셈으로 계산한 값과 일치 (확정)', () => {
    const r = classifyError({ operator: 'add', operands: [8, 5], correctAnswer: 13, userAnswer: 3 })
    const op = r.find((x) => x.type === 'operator-confusion')
    expect(op).toBeTruthy()
    expect(op!.estimated).toBe(false)
  })
  it('자리값 오류: 42+35=770 → 10배 (추정)', () => {
    const r = classifyError({ operator: 'add', operands: [42, 35], correctAnswer: 77, userAnswer: 770 })
    expect(r.some((x) => x.type === 'place-value')).toBe(true)
    expect(r.every((x) => x.estimated)).toBe(true)
  })
  it('받아올림 오류 의심: 48+27=65 → 차이 10 (추정)', () => {
    const r = classifyError({ operator: 'add', operands: [48, 27], correctAnswer: 75, userAnswer: 65 })
    expect(r.some((x) => x.type === 'carry')).toBe(true)
  })
  it('받아내림 오류 의심: 52-37=25 → 차이 -10 (추정)', () => {
    const r = classifyError({ operator: 'sub', operands: [52, 37], correctAnswer: 15, userAnswer: 25 })
    expect(r.some((x) => x.type === 'borrow')).toBe(true)
  })
  it('패턴 없으면 기본 계산 오류 (추정)', () => {
    const r = classifyError({ operator: 'mul', operands: [7, 8], correctAnswer: 56, userAnswer: 54 })
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('basic-calc')
    expect(r[0].estimated).toBe(true)
  })
})

describe('remediationGuide', () => {
  it('오류 유형별 맞춤 안내', () => {
    const g = remediationGuide('add', classifyError({ operator: 'add', operands: [8, 5], correctAnswer: 13, userAnswer: 3 }))
    expect(g.concept).toContain('연산 기호')
    const g2 = remediationGuide('add', classifyError({ operator: 'add', operands: [48, 27], correctAnswer: 75, userAnswer: 65 }))
    expect(g2.concept).toContain('받아올림')
  })
})
