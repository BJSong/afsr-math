/**
 * 난이도 판정 (명세 6.2)
 *
 * 자릿수만으로 판단하지 않고, 받아올림/받아내림 횟수, 중간 계산 복잡도,
 * 계산 단계 수, 연산 혼합 여부 등을 점수화한다.
 * 판정 기준은 아래 주석과 tests/unit/difficulty.test.ts에 명시한다.
 *
 * 난이도 점수 = 자릿수 기반점 + 받아올림/내림 가산 + 곱셈 부분곱 올림 가산
 *             + 나눗셈 제수 자릿수 가산 + 나머지 가산 + 혼합 가산
 *
 *  - 기반점: (a자릿수 + b자릿수 - 2) × 1.0
 *      1자리+1자리=0, 2자리+2자리=2, 3자리+1자리=2, 4자리+4자리=6
 *  - 받아올림 1회당 +1.5, 받아내림 1회당 +1.5
 *  - 곱셈 한 자리 곱에서 올림 발생 1건당 +1.0
 *  - 나눗셈: (제수 자릿수 - 1) × 1.0, 나머지 있으면 +0.5
 *  - 혼합 연산 세트에서 출제되면 +1.0
 *
 * 판정: score < 2.5 → 쉬움, < 5 → 보통, 그 외 → 어려움
 * (임계값은 shared/policy.ts → difficultyThresholds 에서 변경 가능)
 */
import type { Difficulty, Operator, ProblemFeatures } from '../types'
import { DEFAULT_POLICY } from '../policy'

export interface DifficultyInput extends ProblemFeatures {
  operandDigits: [number, number]
}

function rawScore(op: Operator, input: DifficultyInput): number {
  const [da, db] = input.operandDigits
  let score = (da + db - 2) * 1.0
  score += input.carries * 1.5
  score += input.borrows * 1.5
  score += input.mulCarries * 1.0
  if (op === 'div') {
    score += Math.max(0, db - 1) * 1.0
    if (input.remainder) score += 0.5
  }
  if (input.mixed) score += 1.0
  return score
}

export function estimateDifficulty(op: Operator, input: DifficultyInput): Difficulty {
  return estimateDifficultyWithScore(op, input).difficulty
}

/** 디버깅/테스트용: 점수와 함께 반환 */
export function estimateDifficultyWithScore(
  op: Operator,
  input: DifficultyInput,
): { difficulty: Difficulty; score: number } {
  const score = rawScore(op, input)
  const t = DEFAULT_POLICY.difficultyThresholds
  const difficulty: Difficulty =
    score < t.easyBelow ? 'easy' : score < t.mediumBelow ? 'medium' : 'hard'
  return { difficulty, score }
}
