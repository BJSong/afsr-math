/**
 * Skill → 출제 요청 매핑 (맞춤 학습용)
 *
 * 각 스킬의 특성에 맞는 ProblemOptions/사고 템플릿을 반환한다.
 * 스킬을 추가해도 이 파일의 매핑만 확장하면 된다.
 */
import type { ProblemsRequest } from '../validation'

function drill(
  operator: 'add' | 'sub' | 'mul' | 'div',
  digitsA: [number, number],
  digitsB: [number, number],
  difficulty: 'easy' | 'medium' | 'hard',
  carry: 'none' | 'required' | 'any' = 'any',
  extra: Record<string, unknown> = {},
): ProblemsRequest {
  return {
    operator,
    digitsA: { min: digitsA[0], max: digitsA[1] },
    digitsB: { min: digitsB[0], max: digitsB[1] },
    difficulty,
    carry,
    allowNegative: false,
    allowRemainder: false,
    count: 7,
    ...extra,
  } as ProblemsRequest
}

function thinking(
  template: 'make-ten' | 'find-unknown' | 'distributive' | 'complement',
  count = 7,
): ProblemsRequest {
  return { kind: 'thinking', template, count }
}

export function skillToRequest(skillId: string): ProblemsRequest {
  switch (skillId) {
    case 'add-basic': return drill('add', [1, 1], [1, 1], 'easy', 'none')
    case 'add-carry': return drill('add', [1, 2], [1, 2], 'easy', 'required')
    case 'add-multi': return drill('add', [2, 3], [1, 3], 'medium')
    case 'add-strategy': return thinking('make-ten')
    case 'sub-basic': return drill('sub', [1, 1], [1, 1], 'easy', 'none')
    case 'sub-borrow': return drill('sub', [1, 2], [1, 2], 'easy', 'required')
    case 'sub-multi': return drill('sub', [2, 3], [1, 3], 'medium')
    case 'sub-strategy': return thinking('complement')
    case 'mul-basic': return drill('mul', [1, 1], [1, 1], 'easy')
    case 'mul-multi': return drill('mul', [2, 2], [1, 2], 'medium')
    case 'mul-distributive': return thinking('distributive')
    case 'div-basic': return drill('div', [1, 2], [1, 1], 'easy')
    case 'div-remainder': return drill('div', [2, 2], [1, 1], 'medium', 'any', { allowRemainder: true })
    case 'div-multi': return drill('div', [2, 3], [1, 2], 'medium')
    case 'think-make-ten': return thinking('make-ten')
    case 'think-decompose': return thinking('make-ten')
    case 'think-complement': return thinking('complement')
    case 'think-commutative': return drill('add', [1, 2], [1, 2], 'easy')
    case 'think-associative': return drill('add', [2, 2], [1, 2], 'medium')
    case 'think-distributive': return thinking('distributive')
    case 'think-inverse': return drill('sub', [1, 2], [1, 2], 'easy')
    case 'think-number-relation': return drill('sub', [2, 3], [1, 2], 'medium')
    case 'think-find-unknown': return thinking('find-unknown')
    case 'think-equality': return thinking('find-unknown')
    case 'think-efficient-order': return drill('mul', [2, 2], [1, 2], 'hard')
    default: return drill('add', [1, 2], [1, 2], 'easy')
  }
}
