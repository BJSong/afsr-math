/**
 * 문제 생성 엔진 (명세 6) — TypeScript 독립 모듈
 *
 * - 정확한 자릿수 준수, 연산별 정답 계산, 중복 출제 최소화
 * - 받아올림/받아내림 조건, 음수/나머지 허용 여부
 * - 0으로 나누기 방지, 출제 불가능 조건 검증, 무한 반복 방지
 * - 문제 유형별 메타데이터 생성
 *
 * 나눗셈은 역생성: 제수(d)와 몫(q)을 먼저 뽑고 피제수(d*q+r)를 계산한 뒤
 * 피제수 자릿수가 지정 범위를 만족하는지 반드시 검증한다.
 */
import type {
  DigitRange,
  Difficulty,
  GeneratedProblem,
  Operator,
  ProblemFeatures,
  ProblemOptions,
} from '../types'
import { OPERATOR_SYMBOL } from '../types'
import { mulberry32, pick, randInt, randomSeed, type Rng } from './rng'
import { estimateDifficulty } from './difficulty'

export class ImpossibleProblemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImpossibleProblemError'
  }
}

const MAX_GEN_ATTEMPTS = 2000
const MAX_DIFFICULTY_RETRY = 1200
export const MAX_PROBLEM_COUNT = 200

export function digitCount(n: number): number {
  const v = Math.abs(Math.trunc(n))
  if (v === 0) return 1
  return Math.floor(Math.log10(v)) + 1
}

/** [min,max] 자릿수 범위의 정수 1개 (첫 자리는 0이 될 수 없음, 1자리는 0 포함) */
export function randomInDigitRange(rng: Rng, range: DigitRange): number {
  const d = randInt(rng, range.min, range.max)
  const lo = d === 1 ? 0 : 10 ** (d - 1)
  const hi = 10 ** d - 1
  return randInt(rng, lo, hi)
}

/** 세로셈 기준 받아올림 횟수 (a + b) */
export function countCarries(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  let carry = 0
  let count = 0
  while (x > 0 || y > 0) {
    const s = (x % 10) + (y % 10) + carry
    if (s >= 10) {
      count++
      carry = 1
    } else {
      carry = 0
    }
    x = Math.floor(x / 10)
    y = Math.floor(y / 10)
  }
  return count
}

/** 세로셈 기준 받아내림 횟수 (a - b, a >= b >= 0 가정) */
export function countBorrows(a: number, b: number): number {
  let x = a
  let y = b
  let borrow = 0
  let count = 0
  while (x > 0 || y > 0) {
    const dx = (x % 10) - borrow
    const dy = y % 10
    if (dx < dy) {
      count++
      borrow = 1
    } else {
      borrow = 0
    }
    x = Math.floor(x / 10)
    y = Math.floor(y / 10)
  }
  return count
}

/** 곱셈 세로셈에서 한 자리 곱셈 중 올림이 발생하는 횟수 (난이도 휴리스틱) */
export function countMulCarries(a: number, b: number): number {
  const da = String(Math.abs(a)).split('').map(Number).reverse()
  const db = String(Math.abs(b)).split('').map(Number).reverse()
  let count = 0
  for (const y of db) for (const x of da) if (x * y >= 10) count++
  return count
}

function validateDigitRange(range: DigitRange, name: string): void {
  if (
    !Number.isInteger(range.min) ||
    !Number.isInteger(range.max) ||
    range.min < 1 ||
    range.max > 4 ||
    range.min > range.max
  ) {
    throw new ImpossibleProblemError(
      `${name} 자릿수는 1~4 사이의 정수 범위여야 합니다.`,
    )
  }
}

/** 나눗셈 역생성 가능 여부: (제수, 몫, 나머지) 삼중항이 하나라도 존재하는지 탐색 */
function divisionFeasible(opts: ProblemOptions): boolean {
  const minD = opts.digitsB.min === 1 ? 1 : 10 ** (opts.digitsB.min - 1)
  const maxD = 10 ** opts.digitsB.max - 1
  const minDividend = opts.digitsA.min === 1 ? 0 : 10 ** (opts.digitsA.min - 1)
  const maxDividend = 10 ** opts.digitsA.max - 1
  for (let d = minD; d <= Math.min(maxD, minD + 400); d++) {
    if (d === 0) continue
    const qMin = Math.max(1, Math.ceil(minDividend / d))
    const qMax = Math.floor(maxDividend / d)
    if (qMin <= qMax) return true
  }
  // 제수 범위가 넓을 때 샘플링으로 추가 확인
  for (let i = 0; i < 50; i++) {
    const d = minD + Math.floor(Math.random() * (maxD - minD + 1))
    if (d === 0) continue
    const qMin = Math.max(1, Math.ceil(minDividend / d))
    const qMax = Math.floor(maxDividend / d)
    if (qMin <= qMax) return true
  }
  return false
}

/** 출제 불가능 조건 검증 — 불가능하면 ImpossibleProblemError */
export function validateOptions(opts: ProblemOptions): void {
  validateDigitRange(opts.digitsA, '첫 번째 숫자')
  validateDigitRange(opts.digitsB, '두 번째 숫자')
  const count = opts.count ?? 10
  if (!Number.isInteger(count) || count < 1 || count > MAX_PROBLEM_COUNT) {
    throw new ImpossibleProblemError(`문제 수는 1~${MAX_PROBLEM_COUNT} 사이여야 합니다.`)
  }

  const ops: Operator[] =
    opts.operator === 'mixed' ? ['add', 'sub', 'mul', 'div'] : [opts.operator]

  for (const op of ops) {
    if (op === 'sub' && !opts.allowNegative) {
      // a >= b 를 만족해야 함: 가능한 가장 큰 a >= 가능한 가장 작은 b 필요
      const maxA = 10 ** opts.digitsA.max - 1
      const minB = opts.digitsB.min === 1 ? 0 : 10 ** (opts.digitsB.min - 1)
      if (maxA < minB) {
        throw new ImpossibleProblemError(
          '뺄셈에서 음수를 허용하지 않으면 첫 번째 숫자가 두 번째 숫자보다 작을 수밖에 없는 자릿수 조합입니다.',
        )
      }
      if (
        opts.carry === 'required' &&
        opts.digitsA.max === 1 &&
        opts.digitsB.max === 1
      ) {
        // 1자리-1자리, a>=b 이면 받아내림 불가
        throw new ImpossibleProblemError(
          '1자리 − 1자리 뺄셈은 음수 없이 받아내림을 만들 수 없습니다.',
        )
      }
    }
    if (op === 'div' && !divisionFeasible(opts)) {
      throw new ImpossibleProblemError(
        '지정한 자릿수로는 나눗셈 문제를 만들 수 없습니다. (피제수 자릿수를 늘리거나 제수 자릿수를 줄여보세요)',
      )
    }
  }
}

function signature(p: GeneratedProblem): string {
  return `${p.operator}:${p.operands.join(',')}:${p.remainder ?? ''}`
}

function makeId(prefix: string, rng: Rng): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(rng() * 2 ** 32).toString(36)}`
}

/** 연산자·자릿수·특성에 맞는 Skill ID 매핑 (shared/skills/skill-graph.ts의 ID와 일치) */
export function skillIdFor(
  op: Operator,
  operandDigits: [number, number],
  conceptTags: string[],
  strategyTags: string[],
): string {
  const maxD = Math.max(...operandDigits)
  const strat = new Set(strategyTags)
  switch (op) {
    case 'add':
      if (strat.has('10만들기') || strat.has('보수 활용')) return 'add-strategy'
      if (conceptTags.includes('받아올림')) return 'add-carry'
      if (maxD >= 2) return 'add-multi'
      return 'add-basic'
    case 'sub':
      if (strat.has('보수 활용') || strat.has('역연산')) return 'sub-strategy'
      if (conceptTags.includes('받아내림')) return 'sub-borrow'
      if (maxD >= 2) return 'sub-multi'
      return 'sub-basic'
    case 'mul':
      if (strat.has('분배법칙')) return 'mul-distributive'
      if (maxD >= 2) return 'mul-multi'
      return 'mul-basic'
    case 'div':
      if (conceptTags.includes('나머지')) return 'div-remainder'
      if (maxD >= 2) return 'div-multi'
      return 'div-basic'
  }
}

interface Draft {
  operator: Operator
  operands: number[]
  answer: number
  remainder: number | null
  features: ProblemFeatures
  conceptTags: string[]
  strategyTags: string[]
}

function tryGenerateOne(rng: Rng, opts: ProblemOptions, op: Operator): Draft | null {
  const mixed = opts.operator === 'mixed'
  if (op === 'add') {
    const a = randomInDigitRange(rng, opts.digitsA)
    const b = randomInDigitRange(rng, opts.digitsB)
    const carries = countCarries(a, b)
    if (opts.carry === 'required' && carries === 0) return null
    if (opts.carry === 'none' && carries > 0) return null
    const conceptTags = ['덧셈']
    const strategyTags: string[] = []
    if (carries > 0) conceptTags.push('받아올림')
    if (Math.max(digitCount(a), digitCount(b)) >= 2) conceptTags.push('자리값')
    if (a % 10 !== 0 && b % 10 !== 0 && (a % 10) + (b % 10) >= 10)
      strategyTags.push('10만들기')
    if (b % 10 === 9 || b % 10 === 8) strategyTags.push('보수 활용')
    return {
      operator: op,
      operands: [a, b],
      answer: a + b,
      remainder: null,
      features: {
        carries,
        borrows: 0,
        mulCarries: 0,
        columns: Math.max(digitCount(a), digitCount(b)),
        remainder: false,
        mixed,
      },
      conceptTags,
      strategyTags,
    }
  }
  if (op === 'sub') {
    let a = randomInDigitRange(rng, opts.digitsA)
    let b = randomInDigitRange(rng, opts.digitsB)
    if (!opts.allowNegative && a < b) return null // 거부 샘플링 (검증 단계에서 가능성은 확인됨)
    const borrows = a >= b ? countBorrows(a, b) : 0
    if (opts.carry === 'required' && borrows === 0) return null
    if (opts.carry === 'none' && borrows > 0) return null
    const conceptTags = ['뺄셈']
    const strategyTags: string[] = []
    if (borrows > 0) conceptTags.push('받아내림')
    if (Math.max(digitCount(a), digitCount(b)) >= 2) conceptTags.push('자리값')
    if (a < 0 || b < 0) conceptTags.push('음수')
    if (b % 10 === 9 || b % 10 === 8) strategyTags.push('보수 활용')
    return {
      operator: op,
      operands: [a, b],
      answer: a - b,
      remainder: null,
      features: {
        carries: 0,
        borrows,
        mulCarries: 0,
        columns: Math.max(digitCount(a), digitCount(b)),
        remainder: false,
        mixed,
      },
      conceptTags,
      strategyTags,
    }
  }
  if (op === 'mul') {
    const a = randomInDigitRange(rng, opts.digitsA)
    const b = randomInDigitRange(rng, opts.digitsB)
    const mulCarries = countMulCarries(a, b)
    // 곱셈의 받아올림 조건: 부분곱 올림 횟수로 해석
    if (opts.carry === 'required' && mulCarries === 0) return null
    if (opts.carry === 'none' && mulCarries > 0) return null
    const conceptTags = ['곱셈', '구구단']
    const strategyTags: string[] = []
    if (Math.max(digitCount(a), digitCount(b)) >= 2) conceptTags.push('자리값')
    const big = Math.max(a, b)
    const small = Math.min(a, b)
    if (small === 25 || small === 125 || small === 15 || big % 100 === 0)
      strategyTags.push('분배법칙')
    return {
      operator: op,
      operands: [a, b],
      answer: a * b,
      remainder: null,
      features: {
        carries: 0,
        borrows: 0,
        mulCarries,
        columns: Math.max(digitCount(a), digitCount(b)),
        remainder: false,
        mixed,
      },
      conceptTags,
      strategyTags,
    }
  }
  // div — 역생성
  const minD = opts.digitsB.min === 1 ? 1 : 10 ** (opts.digitsB.min - 1) // 0으로 나누기 방지
  const maxD = 10 ** opts.digitsB.max - 1
  const minDividend = opts.digitsA.min === 1 ? 0 : 10 ** (opts.digitsA.min - 1)
  const maxDividend = 10 ** opts.digitsA.max - 1
  const d = randInt(rng, minD, maxD)
  if (d === 0) return null
  const qMin = Math.max(1, Math.ceil(minDividend / d))
  const qMax = Math.floor(maxDividend / d)
  if (qMin > qMax) return null
  const q = randInt(rng, qMin, qMax)
  let r = 0
  if (opts.allowRemainder && d > 1) {
    r = rng() < 0.6 ? randInt(rng, 1, d - 1) : 0
  }
  const dividend = d * q + r
  if (digitCount(dividend) < opts.digitsA.min || digitCount(dividend) > opts.digitsA.max)
    return null
  const conceptTags = ['나눗셈', '역연산']
  const strategyTags: string[] = []
  if (r > 0) conceptTags.push('나머지')
  if (digitCount(dividend) >= 2) conceptTags.push('자리값')
  return {
    operator: op,
    operands: [dividend, d],
    answer: q,
    remainder: opts.allowRemainder ? r : null,
    features: {
      carries: 0,
      borrows: 0,
      mulCarries: 0,
      columns: Math.max(digitCount(dividend), digitCount(d)),
      remainder: r > 0,
      mixed,
    },
    conceptTags,
    strategyTags,
  }
}

function draftToProblem(
  rng: Rng,
  opts: ProblemOptions,
  draft: Draft,
  difficulty: Difficulty,
  seen: Set<string>,
): GeneratedProblem {
  const a = draft.operands[0] ?? 0
  const b = draft.operands[1] ?? 0
  const operandDigits: [number, number] = [digitCount(a), digitCount(b)]
  const problem: GeneratedProblem = {
    questionId: makeId('q', rng),
    skillId: skillIdFor(draft.operator, operandDigits, draft.conceptTags, draft.strategyTags),
    operator: draft.operator,
    operands: draft.operands,
    answer: draft.answer,
    remainder: draft.remainder,
    operandDigits,
    difficulty,
    conceptTags: draft.conceptTags,
    strategyTags: draft.strategyTags,
    prerequisiteSkills: [],
    generatedAt: new Date().toISOString(),
    prompt: `${a} ${OPERATOR_SYMBOL[draft.operator]} ${b} = ?`,
    features: draft.features,
  }
  const sig = signature(problem)
  if (seen.has(sig)) throw new Error('duplicate')
  seen.add(sig)
  return problem
}

export interface GenerateContext {
  rng: Rng
  seen: Set<string>
}

export function createContext(seed?: number): GenerateContext {
  return { rng: mulberry32(seed ?? randomSeed()), seen: new Set<string>() }
}

/** 단일 문제 생성 (목표 난이도에 최대한 맞춤, 불가하면 가장 가까운 것) */
export function generateProblem(opts: ProblemOptions, seed?: number): GeneratedProblem {
  const list = generateProblemSet({ ...opts, count: 1 }, seed)
  const p = list[0]
  if (!p) throw new ImpossibleProblemError('문제를 생성할 수 없습니다.')
  return p
}

/** 문제 세트 생성 — 중복 최소화, 목표 난이도 우선 */
export function generateProblemSet(opts: ProblemOptions, seed?: number): GeneratedProblem[] {
  validateOptions(opts)
  const count = opts.count ?? 10
  const ctx = createContext(seed)
  const result: GeneratedProblem[] = []
  let guard = 0

  while (result.length < count) {
    if (++guard > MAX_GEN_ATTEMPTS) {
      throw new ImpossibleProblemError(
        `조건을 만족하는 서로 다른 문제를 ${count}개 만들 수 없습니다. (${result.length}개 생성됨 — 조건을 완화해 보세요)`,
      )
    }
    const op: Operator =
      opts.operator === 'mixed'
        ? pick(ctx.rng, ['add', 'sub', 'mul', 'div'] as const)
        : opts.operator

    // 1차: 목표 난이도에 맞는 초안 탐색
    let accepted: { draft: Draft; difficulty: Difficulty } | null = null
    let fallback: { draft: Draft; difficulty: Difficulty } | null = null
    for (let i = 0; i < MAX_DIFFICULTY_RETRY; i++) {
      const draft = tryGenerateOne(ctx.rng, opts, op)
      if (!draft) continue
      const a = draft.operands[0] ?? 0
      const b = draft.operands[1] ?? 0
      const difficulty = estimateDifficulty(op, {
        ...draft.features,
        operandDigits: [digitCount(a), digitCount(b)],
      })
      if (difficulty === opts.difficulty) {
        accepted = { draft, difficulty }
        break
      }
      if (!fallback) fallback = { draft, difficulty }
    }
    const chosen = accepted ?? fallback
    if (!chosen) continue
    try {
      result.push(draftToProblem(ctx.rng, opts, chosen.draft, chosen.difficulty, ctx.seen))
    } catch {
      // 중복 서명 — 다음 시도
      continue
    }
  }
  return result
}
