import { describe, expect, it } from 'vitest'
import { estimateDifficultyWithScore } from '../../lib/generator/difficulty'
import type { DifficultyInput } from '../../lib/generator/difficulty'

function input(over: Partial<DifficultyInput>): DifficultyInput {
  return {
    carries: 0,
    borrows: 0,
    mulCarries: 0,
    columns: 1,
    remainder: false,
    mixed: false,
    operandDigits: [1, 1],
    ...over,
  }
}

describe('estimateDifficulty', () => {
  it('1자리+1자리 받아올림 없음 → 쉬움 (점수 0)', () => {
    const { difficulty, score } = estimateDifficultyWithScore('add', input({}))
    expect(score).toBe(0)
    expect(difficulty).toBe('easy')
  })
  it('5+7 (받아올림 1회) → 쉬움 (점수 1.5)', () => {
    const { difficulty, score } = estimateDifficultyWithScore('add', input({ carries: 1 }))
    expect(score).toBe(1.5)
    expect(difficulty).toBe('easy')
  })
  it('48+27 (2+1자리, 받아올림 1회) → 보통 (점수 2.5)', () => {
    const { difficulty, score } = estimateDifficultyWithScore(
      'add',
      input({ carries: 1, columns: 2, operandDigits: [2, 1] }),
    )
    expect(score).toBe(2.5)
    expect(difficulty).toBe('medium')
  })
  it('48×25 (부분곱 올림 3회) → 어려움 (점수 5)', () => {
    const { difficulty, score } = estimateDifficultyWithScore(
      'mul',
      input({ mulCarries: 3, columns: 2, operandDigits: [2, 2] }),
    )
    expect(score).toBe(5)
    expect(difficulty).toBe('hard')
  })
  it('84÷4 (2자리÷1자리, 나머지 없음) → 쉬움 (점수 1)', () => {
    const { difficulty, score } = estimateDifficultyWithScore(
      'div',
      input({ columns: 2, operandDigits: [2, 1] }),
    )
    expect(score).toBe(1)
    expect(difficulty).toBe('easy')
  })
  it('나머지 있는 나눗셈은 +0.5', () => {
    const a = estimateDifficultyWithScore('div', input({ columns: 2, operandDigits: [2, 1] }))
    const b = estimateDifficultyWithScore(
      'div',
      input({ columns: 2, operandDigits: [2, 1], remainder: true }),
    )
    expect(b.score - a.score).toBe(0.5)
  })
  it('혼합 출제는 +1', () => {
    const a = estimateDifficultyWithScore('add', input({}))
    const b = estimateDifficultyWithScore('add', input({ mixed: true }))
    expect(b.score - a.score).toBe(1)
  })
  it('자릿수만으로 어려움이 결정되지 않는다: 1자리+1자리 받아올림 2회는 쉬움', () => {
    // 99+99 → 기반 0 + 2*1.5 = 3 → 보통. 자릿수가 작아도 받아올림이 많으면 올라간다
    const { difficulty } = estimateDifficultyWithScore('add', input({ carries: 2 }))
    expect(difficulty).toBe('medium')
  })
})
