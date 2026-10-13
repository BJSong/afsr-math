/**
 * 오답 분석 (명세 10)
 *
 * 최종 답안만으로 오류 원인을 확정할 수 없는 경우 estimated: true 로 표시한다.
 * 연산자 혼동(다른 연산자로 계산한 값과 정확히 일치)은 비교적 확정적이므로
 * estimated: false 로 둔다.
 */
import type { ErrorClassification, ErrorType, Operator } from '../types'

export const ERROR_LABEL: Record<ErrorType, string> = {
  'basic-calc': '기본 계산 오류',
  carry: '받아올림 오류',
  borrow: '받아내림 오류',
  'place-value': '자리값 오류',
  'operator-confusion': '연산자 혼동',
  order: '계산 순서 오류',
  'concept-gap': '개념 이해 부족 가능성',
}

export interface ErrorInput {
  operator: Operator
  operands: number[]
  correctAnswer: number
  userAnswer: number
}

function altOperatorAnswers(op: Operator, a: number, b: number): { op: string; value: number }[] {
  const out: { op: string; value: number }[] = []
  if (op !== 'add') out.push({ op: 'add', value: a + b })
  if (op !== 'sub') out.push({ op: 'sub', value: a - b })
  if (op !== 'mul') out.push({ op: 'mul', value: a * b })
  if (op !== 'div' && b !== 0 && a % b === 0) out.push({ op: 'div', value: a / b })
  return out
}

/** 단일 오답에 대한 휴리스틱 분류 (여러 유형이 동시에 감지될 수 있음) */
export function classifyError(input: ErrorInput): ErrorClassification[] {
  const { operator, operands, correctAnswer, userAnswer } = input
  const a = operands[0] ?? 0
  const b = operands[1] ?? 0
  const found: ErrorClassification[] = []

  // 1. 연산자 혼동: 다른 연산의 정답과 정확히 일치
  const confused = altOperatorAnswers(operator, a, b).find((x) => x.value === userAnswer)
  if (confused) {
    found.push({
      type: 'operator-confusion',
      label: ERROR_LABEL['operator-confusion'],
      estimated: false,
      detail: `${a} ${operator} ${b}를(을) 다른 연산으로 계산한 값(${userAnswer})과 일치합니다.`,
    })
  }

  // 2. 자리값 오류: 10배/1/10배
  if (
    (correctAnswer !== 0 && userAnswer === correctAnswer * 10) ||
    (correctAnswer % 10 === 0 && correctAnswer !== 0 && userAnswer === correctAnswer / 10)
  ) {
    found.push({
      type: 'place-value',
      label: ERROR_LABEL['place-value'],
      estimated: true,
      detail: '정답의 10배 또는 1/10과 일치합니다. 자리값 확인이 필요합니다.',
    })
  }

  // 3. 받아올림/받아내림 오류: 정답과의 차이가 10의 배수
  const diff = correctAnswer - userAnswer
  if (operator === 'add' && diff !== 0 && diff % 10 === 0 && Math.abs(diff) <= 200) {
    found.push({
      type: 'carry',
      label: ERROR_LABEL['carry'],
      estimated: true,
      detail: `받아올림 누락/오적용이 의심됩니다. (차이: ${diff})`,
    })
  }
  if (operator === 'sub' && diff !== 0 && diff % 10 === 0 && Math.abs(diff) <= 200) {
    found.push({
      type: 'borrow',
      label: ERROR_LABEL['borrow'],
      estimated: true,
      detail: `받아내림 누락/오적용이 의심됩니다. (차이: ${diff})`,
    })
  }

  // 4. 아무 패턴도 없으면 기본 계산 오류 (추정)
  if (found.length === 0) {
    found.push({
      type: 'basic-calc',
      label: ERROR_LABEL['basic-calc'],
      estimated: true,
      detail: '특정 패턴이 감지되지 않았습니다. 계산 과정을 함께 확인해 보세요.',
    })
  }
  return found
}

/**
 * 오답 처리 파이프라인용 안내 생성 (명세 10)
 * 1 정답 확인 → 2 오류 패턴 분석 → 3 관련 개념 설명 → 4 전략 안내 → 5 유사 문제 → 6 복습 반영
 */
export function remediationGuide(
  operator: Operator,
  errors: ErrorClassification[],
): { concept: string; strategy: string } {
  const types = new Set(errors.map((e) => e.type))
  let concept = ''
  let strategy = ''
  if (types.has('operator-confusion')) {
    concept = '문제의 연산 기호(+ − × ÷)를 먼저 소리 내어 읽고, 무엇을 구하는지 확인해요.'
    strategy = '식을 쓰기 전에 연산 기호에 동그라미를 쳐 보세요.'
  } else if (types.has('carry')) {
    concept = '받아올림: 한 자리에서 10이 넘으면 윗자리로 1을 올려줍니다.'
    strategy = '올려준 1을 작게 써 놓고 더하는 습관을 들여보세요.'
  } else if (types.has('borrow')) {
    concept = '받아내림: 윗자리에서 10을 빌려와 계산합니다.'
    strategy = '빌려온 자리는 숫자를 지우고 새로 써서 계산하세요.'
  } else if (types.has('place-value')) {
    concept = '자리값: 각 자리 숫자가 나타내는 크기를 확인해요. (예: 42의 4는 40)'
    strategy = '답의 자릿수가 문제와 맞는지 마지막에 확인하세요.'
  } else {
    const opWord = { add: '덧셈', sub: '뺄셈', mul: '곱셈', div: '나눗셈' }[operator]
    concept = `${opWord}의 기본 계산 과정을 단계별로 다시 확인해요.`
    strategy = '급하게 답을 쓰지 말고, 한 단계씩 검산하는 습관을 들여보세요.'
  }
  return { concept, strategy }
}
