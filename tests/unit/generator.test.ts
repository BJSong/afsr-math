import { describe, expect, it } from 'vitest'
import {
  ImpossibleProblemError,
  countBorrows,
  countCarries,
  countMulCarries,
  digitCount,
  generateProblem,
  generateProblemSet,
  randomInDigitRange,
  validateOptions,
} from '../../lib/generator/problem-generator'
import { mulberry32, randInt } from '../../lib/generator/rng'
import type { ProblemOptions } from '../../lib/types'

const baseOpts: ProblemOptions = {
  operator: 'add',
  digitsA: { min: 2, max: 2 },
  digitsB: { min: 1, max: 1 },
  difficulty: 'medium',
  carry: 'any',
  allowNegative: false,
  allowRemainder: false,
  count: 10,
}

describe('digitCount', () => {
  it('자릿수를 정확히 센다', () => {
    expect(digitCount(0)).toBe(1)
    expect(digitCount(5)).toBe(1)
    expect(digitCount(42)).toBe(2)
    expect(digitCount(100)).toBe(3)
    expect(digitCount(9999)).toBe(4)
  })
})

describe('countCarries / countBorrows / countMulCarries', () => {
  it('받아올림 횟수', () => {
    expect(countCarries(5, 7)).toBe(1)
    expect(countCarries(48, 27)).toBe(1) // 8+7 올림, 4+2+1 안 올림
    expect(countCarries(99, 99)).toBe(2)
    expect(countCarries(11, 22)).toBe(0)
  })
  it('받아내림 횟수', () => {
    expect(countBorrows(52, 37)).toBe(1)
    expect(countBorrows(100, 1)).toBe(2)
    expect(countBorrows(55, 11)).toBe(0)
  })
  it('곱셈 부분곱 올림 횟수', () => {
    expect(countMulCarries(3, 4)).toBe(1) // 12
    expect(countMulCarries(2, 3)).toBe(0)
    expect(countMulCarries(48, 25)).toBe(3) // 40,20,16 올림 / 8 제외
  })
})

describe('validateOptions', () => {
  it('자릿수 범위 오류를 검출한다', () => {
    expect(() =>
      validateOptions({ ...baseOpts, digitsA: { min: 0, max: 2 } }),
    ).toThrow(ImpossibleProblemError)
    expect(() =>
      validateOptions({ ...baseOpts, digitsA: { min: 3, max: 5 } }),
    ).toThrow(ImpossibleProblemError)
  })
  it('1자리-1자리 뺄셈 + 받아내림 필수 + 음수 불가는 불가능', () => {
    expect(() =>
      validateOptions({
        ...baseOpts,
        operator: 'sub',
        digitsA: { min: 1, max: 1 },
        digitsB: { min: 1, max: 1 },
        carry: 'required',
        allowNegative: false,
      }),
    ).toThrow(ImpossibleProblemError)
  })
  it('불가능한 나눗셈 자릿수 조합을 검출한다', () => {
    // 피제수 1자리, 제수 2자리 → 불가능
    expect(() =>
      validateOptions({
        ...baseOpts,
        operator: 'div',
        digitsA: { min: 1, max: 1 },
        digitsB: { min: 2, max: 2 },
      }),
    ).toThrow(ImpossibleProblemError)
  })
  it('가능한 조합은 통과한다', () => {
    expect(() =>
      validateOptions({
        ...baseOpts,
        operator: 'div',
        digitsA: { min: 2, max: 2 },
        digitsB: { min: 1, max: 1 },
      }),
    ).not.toThrow()
  })
})

describe('generateProblem — 덧셈/뺄셈', () => {
  it('자릿수와 받아올림 조건을 만족한다', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 30; i++) {
      const p = generateProblem(
        { ...baseOpts, operator: 'add', carry: 'required', difficulty: 'easy' },
        Math.floor(rng() * 2 ** 31),
      )
      expect(p.operandDigits[0]).toBe(2)
      expect(p.operandDigits[1]).toBe(1)
      expect(p.answer).toBe(p.operands[0] + p.operands[1])
      expect(p.features.carries).toBeGreaterThan(0)
    }
  })
  it('받아올림 없음 조건을 만족한다', () => {
    const p = generateProblem({ ...baseOpts, operator: 'add', carry: 'none', difficulty: 'easy' }, 7)
    expect(p.features.carries).toBe(0)
    expect(p.answer).toBe(p.operands[0] + p.operands[1])
  })
  it('음수 불허 뺄셈은 항상 0 이상', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateProblem(
        { ...baseOpts, operator: 'sub', digitsA: { min: 2, max: 2 }, digitsB: { min: 2, max: 2 }, allowNegative: false },
        1000 + i,
      )
      expect(p.answer).toBeGreaterThanOrEqual(0)
      expect(p.answer).toBe(p.operands[0] - p.operands[1])
    }
  })
  it('음수 허용 뺄셈은 음수가 나올 수 있다', () => {
    let sawNegative = false
    for (let i = 0; i < 100; i++) {
      const p = generateProblem(
        { ...baseOpts, operator: 'sub', digitsA: { min: 1, max: 1 }, digitsB: { min: 1, max: 1 }, allowNegative: true },
        2000 + i,
      )
      if (p.answer < 0) sawNegative = true
    }
    expect(sawNegative).toBe(true)
  })
})

describe('generateProblem — 곱셈/나눗셈', () => {
  it('곱셈 정답이 정확하다', () => {
    const p = generateProblem(
      { ...baseOpts, operator: 'mul', digitsA: { min: 2, max: 2 }, digitsB: { min: 2, max: 2 }, difficulty: 'hard' },
      99,
    )
    expect(p.answer).toBe(p.operands[0] * p.operands[1])
    expect(p.operandDigits).toEqual([2, 2])
  })
  it('나눗셈은 역생성으로 자릿수를 만족하고 0으로 나누지 않는다', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateProblem(
        { ...baseOpts, operator: 'div', digitsA: { min: 2, max: 3 }, digitsB: { min: 1, max: 1 }, allowRemainder: true },
        3000 + i,
      )
      const [dividend, divisor] = p.operands
      expect(divisor).toBeGreaterThan(0)
      expect(digitCount(dividend)).toBeGreaterThanOrEqual(2)
      expect(digitCount(dividend)).toBeLessThanOrEqual(3)
      expect(dividend).toBe(divisor * p.answer + (p.remainder ?? 0))
      expect((p.remainder ?? 0)).toBeLessThan(divisor)
    }
  })
  it('나머지 불허 나눗셈은 나누어떨어진다', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateProblem(
        { ...baseOpts, operator: 'div', digitsA: { min: 2, max: 2 }, digitsB: { min: 1, max: 1 }, allowRemainder: false },
        4000 + i,
      )
      expect(p.remainder).toBeNull()
      expect(p.operands[0] % p.operands[1]).toBe(0)
      expect(p.answer).toBe(p.operands[0] / p.operands[1])
    }
  })
})

describe('generateProblemSet', () => {
  it('요청한 개수만큼 중복 없이 생성한다', () => {
    const list = generateProblemSet({ ...baseOpts, count: 20 }, 12345)
    expect(list).toHaveLength(20)
    const sigs = new Set(list.map((p) => `${p.operator}:${p.operands.join(',')}`))
    expect(sigs.size).toBe(20)
  })
  it('혼합 연산은 여러 연산자를 포함한다', () => {
    const list = generateProblemSet({ ...baseOpts, operator: 'mixed', count: 40 }, 777)
    const ops = new Set(list.map((p) => p.operator))
    expect(ops.size).toBeGreaterThan(1)
  })
  it('메타데이터가 명세 6.3을 만족한다', () => {
    const p = generateProblem(baseOpts, 5)
    expect(p.questionId).toBeTruthy()
    expect(p.skillId).toBeTruthy()
    expect(p.generatedAt).toBeTruthy()
    expect(p.prompt).toContain('=')
    expect(Array.isArray(p.conceptTags)).toBe(true)
    expect(Array.isArray(p.strategyTags)).toBe(true)
    expect(p.operandDigits).toHaveLength(2)
  })
  it('같은 시드는 같은 문제를 만든다 (재현성)', () => {
    const a = generateProblemSet({ ...baseOpts, count: 5 }, 999)
    const b = generateProblemSet({ ...baseOpts, count: 5 }, 999)
    expect(a.map((p) => p.prompt)).toEqual(b.map((p) => p.prompt))
  })
})

describe('randomInDigitRange', () => {
  it('범위 내 자릿수를 지킨다', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 200; i++) {
      const n = randomInDigitRange(rng, { min: 2, max: 3 })
      expect(digitCount(n)).toBeGreaterThanOrEqual(2)
      expect(digitCount(n)).toBeLessThanOrEqual(3)
    }
  })
  it('randInt 경계', () => {
    const rng = mulberry32(2)
    for (let i = 0; i < 100; i++) {
      const n = randInt(rng, 3, 3)
      expect(n).toBe(3)
    }
  })
})
