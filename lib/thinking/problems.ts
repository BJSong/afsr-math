/**
 * 수학적 사고 훈련용 문제 템플릿 (명세 5.3)
 *
 * 계산 결과뿐 아니라 수학적 관계와 전략 선택 능력을 학습한다.
 * 각 템플릿은 GeneratedProblem을 반환하므로 서버 채점·학습 기록과 호환된다.
 */
import type { GeneratedProblem, Operator } from '../types'
import { OPERATOR_SYMBOL } from '../types'
import { mulberry32, pick, randInt, randomSeed, type Rng } from '../generator/rng'
import { digitCount } from '../generator/problem-generator'

export type ThinkingTemplate = 'make-ten' | 'find-unknown' | 'distributive' | 'complement'

export const THINKING_META: Record<
  ThinkingTemplate,
  { title: string; description: string; skillId: string }
> = {
  'make-ten': {
    title: '10 만들기',
    description: '10이 되는 짝을 먼저 찾아 계산을 간단히 해요.',
    skillId: 'think-make-ten',
  },
  'find-unknown': {
    title: '미지수 찾기',
    description: '□에 들어갈 수를 수의 관계를 이용해 구해요.',
    skillId: 'think-find-unknown',
  },
  distributive: {
    title: '분배법칙 활용',
    description: '곱셈을 나누어 계산하면 쉬워져요. (예: 48×25 = 48×100÷4)',
    skillId: 'think-distributive',
  },
  complement: {
    title: '보수 활용',
    description: '100·1000에 가까운 수로 바꾸어 계산해요.',
    skillId: 'think-complement',
  },
}

function base(op: Operator, operands: number[], answer: number, prompt: string): Omit<
  GeneratedProblem,
  'questionId' | 'skillId' | 'generatedAt'
> {
  const a = operands[0] ?? 0
  const b = operands[1] ?? 0
  return {
    operator: op,
    operands,
    answer,
    remainder: null,
    operandDigits: [digitCount(a), digitCount(b ?? 0)],
    difficulty: 'medium',
    conceptTags: [],
    strategyTags: [],
    prerequisiteSkills: [],
    prompt,
    features: { carries: 0, borrows: 0, mulCarries: 0, columns: 2, remainder: false, mixed: false },
  }
}

function withId(
  rng: Rng,
  p: Omit<GeneratedProblem, 'questionId' | 'skillId' | 'generatedAt'>,
  skillId: string,
): GeneratedProblem {
  return {
    ...p,
    questionId: `t_${Date.now().toString(36)}_${Math.floor(rng() * 2 ** 32).toString(36)}`,
    skillId,
    generatedAt: new Date().toISOString(),
  }
}

/** 10 만들기: 일의 자리 합이 10 이상인 덧셈 */
function makeTenOne(rng: Rng): GeneratedProblem {
  for (let i = 0; i < 500; i++) {
    const a = randInt(rng, 11, 99)
    const b = randInt(rng, 2, 9)
    if (a % 10 === 0 || b % 10 === 0) continue
    if ((a % 10) + b < 10) continue
    return withId(
      rng,
      {
        ...base('add', [a, b], a + b, `${a} + ${b} = ?`),
        difficulty: 'easy',
        conceptTags: ['덧셈', '받아올림', '자리값'],
        strategyTags: ['10만들기'],
        hint: `${a % 10}에 ${10 - (a % 10)}을 더하면 10이 돼요. ${b}를 쪼개 보세요.`,
      },
      'think-make-ten',
    )
  }
  throw new Error('10 만들기 문제 생성 실패')
}

/** 미지수 찾기: a + □ = b + c */
function findUnknownOne(rng: Rng): GeneratedProblem {
  const b = randInt(rng, 21, 89)
  const c = randInt(rng, 11, 29)
  const delta = pick(rng, [-2, -1, 1, 2])
  const a = b + delta
  const answer = b + c - a
  if (answer < 0) return findUnknownOne(rng)
  return withId(
    rng,
    {
      ...base('add', [a, b, c], answer, `${a} + □ = ${b} + ${c}`),
      difficulty: 'hard',
      conceptTags: ['등식', '수의 관계'],
      strategyTags: ['역연산'],
      hint: `양변이 같아지려면? ${b}와 ${a}의 차이에 주목해 보세요.`,
    },
    'think-find-unknown',
  )
}

/** 분배법칙: ×25, ×15, ×125 형태 */
function distributiveOne(rng: Rng): GeneratedProblem {
  const small = pick(rng, [15, 25, 125])
  const big = small === 125 ? randInt(rng, 12, 96) : randInt(rng, 12, 96)
  const [a, b] = rng() < 0.5 ? [big, small] : [small, big]
  const hint =
    small === 25
      ? `${a} × 100 ÷ 4 로 계산해 보세요.`
      : small === 125
        ? `${a} × 1000 ÷ 8 로 계산해 보세요.`
        : `${a} × 10 + ${a} × 5 로 나누어 보세요.`
  return withId(
    rng,
    {
      ...base('mul', [a, b], a * b, `${a} × ${b} = ?`),
      difficulty: 'hard',
      conceptTags: ['곱셈', '자리값'],
      strategyTags: ['분배법칙'],
      hint,
    },
    'think-distributive',
  )
}

/** 보수 활용: 100 - n, 1000 - n */
function complementOne(rng: Rng): GeneratedProblem {
  const base1000 = rng() < 0.3
  const round = base1000 ? 1000 : 100
  const b = randInt(rng, round === 100 ? 11 : 101, round - 1)
  return withId(
    rng,
    {
      ...base('sub', [round, b], round - b, `${round} − ${b} = ?`),
      difficulty: 'easy',
      conceptTags: ['뺄셈'],
      strategyTags: ['보수 활용'],
      hint: `${b}에 얼마를 더하면 ${round}이 될까요?`,
    },
    'think-complement',
  )
}

export function generateThinkingSet(
  template: ThinkingTemplate,
  count: number,
  seed: number = randomSeed(),
): GeneratedProblem[] {
  if (count < 1 || count > 200) throw new Error('문제 수는 1~200 사이여야 합니다.')
  const rng = mulberry32(seed)
  const one = { 'make-ten': makeTenOne, 'find-unknown': findUnknownOne, distributive: distributiveOne, complement: complementOne }[template]
  const seen = new Set<string>()
  const out: GeneratedProblem[] = []
  let guard = 0
  while (out.length < count) {
    if (++guard > count * 50) throw new Error('사고 훈련 문제 생성 실패')
    const p = one(rng)
    const sig = p.prompt
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(p)
  }
  return out
}
