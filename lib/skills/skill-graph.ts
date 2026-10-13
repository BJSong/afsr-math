/**
 * Skill Knowledge Graph (명세 7)
 *
 * 초기에는 정적 TypeScript 데이터로 관리한다.
 * - 선수 학습 그래프에 순환 관계가 없음을 검증한다 (validateSkillGraph)
 * - 학습 유형을 추가해도 핵심 엔진 수정 없이 SKILLS에 행만 추가하면 된다
 */
import type { Skill } from '../types'

export const SKILLS: Skill[] = [
  // ── 덧셈 ──
  { skillId: 'add-basic', name: '기본 덧셈', description: '한 자리 수의 덧셈 (받아올림 없음)', operation: 'add', difficulty: 'easy', prerequisites: [], relatedSkills: ['sub-basic', 'think-make-ten', 'think-commutative'], assessmentRules: '최근 10회 정확도 90% 이상' },
  { skillId: 'add-carry', name: '받아올림 덧셈', description: '받아올림이 있는 덧셈', operation: 'add', difficulty: 'easy', prerequisites: ['add-basic'], relatedSkills: ['add-multi', 'add-strategy', 'think-decompose'], assessmentRules: '최근 10회 정확도 90% 이상' },
  { skillId: 'add-multi', name: '다자리 덧셈', description: '두 자리 이상 수의 덧셈', operation: 'add', difficulty: 'medium', prerequisites: ['add-carry'], relatedSkills: ['sub-multi', 'think-associative'], assessmentRules: '최근 10회 정확도 85% 이상' },
  { skillId: 'add-strategy', name: '덧셈 전략', description: '10 만들기·보수 활용 등 효율적 계산 전략', operation: 'add', difficulty: 'medium', prerequisites: ['add-carry'], relatedSkills: ['think-make-ten', 'think-complement'], assessmentRules: '전략 선택 문항 포함 정확도 80% 이상' },
  // ── 뺄셈 ──
  { skillId: 'sub-basic', name: '기본 뺄셈', description: '한 자리 수의 뺄셈 (받아내림 없음)', operation: 'sub', difficulty: 'easy', prerequisites: ['add-basic'], relatedSkills: ['add-basic', 'think-complement'], assessmentRules: '최근 10회 정확도 90% 이상' },
  { skillId: 'sub-borrow', name: '받아내림 뺄셈', description: '받아내림이 있는 뺄셈', operation: 'sub', difficulty: 'easy', prerequisites: ['sub-basic', 'add-carry'], relatedSkills: ['sub-multi', 'sub-strategy'], assessmentRules: '최근 10회 정확도 90% 이상' },
  { skillId: 'sub-multi', name: '다자리 뺄셈', description: '두 자리 이상 수의 뺄셈', operation: 'sub', difficulty: 'medium', prerequisites: ['sub-borrow'], relatedSkills: ['add-multi', 'think-number-relation'], assessmentRules: '최근 10회 정확도 85% 이상' },
  { skillId: 'sub-strategy', name: '뺄셈 전략', description: '보수 활용·역연산 등 효율적 계산 전략', operation: 'sub', difficulty: 'medium', prerequisites: ['sub-borrow'], relatedSkills: ['think-inverse', 'think-complement'], assessmentRules: '전략 선택 문항 포함 정확도 80% 이상' },
  // ── 곱셈 ──
  { skillId: 'mul-basic', name: '구구단', description: '한 자리 수 × 한 자리 수', operation: 'mul', difficulty: 'easy', prerequisites: ['add-multi'], relatedSkills: ['div-basic', 'think-distributive'], assessmentRules: '최근 20회 정확도 90% 이상, 중앙 풀이시간 5초 이내' },
  { skillId: 'mul-multi', name: '다자리 곱셈', description: '두 자리 이상 수의 곱셈', operation: 'mul', difficulty: 'hard', prerequisites: ['mul-basic'], relatedSkills: ['div-multi', 'think-efficient-order'], assessmentRules: '최근 10회 정확도 85% 이상' },
  { skillId: 'mul-distributive', name: '분배법칙 곱셈', description: '분배법칙을 활용한 효율적 곱셈 (예: 48×25 = 48×100÷4)', operation: 'mul', difficulty: 'hard', prerequisites: ['mul-multi', 'think-distributive'], relatedSkills: ['think-associative'], assessmentRules: '전략 선택 문항 포함 정확도 80% 이상' },
  // ── 나눗셈 ──
  { skillId: 'div-basic', name: '기본 나눗셈', description: '구구단 범위의 나눗셈 (나머지 없음)', operation: 'div', difficulty: 'easy', prerequisites: ['mul-basic'], relatedSkills: ['div-remainder', 'think-inverse'], assessmentRules: '최근 10회 정확도 90% 이상' },
  { skillId: 'div-remainder', name: '몫과 나머지', description: '나머지가 있는 나눗셈', operation: 'div', difficulty: 'medium', prerequisites: ['div-basic'], relatedSkills: ['div-multi'], assessmentRules: '최근 10회 정확도 85% 이상' },
  { skillId: 'div-multi', name: '다자리 나눗셈', description: '두 자리 이상 수의 나눗셈', operation: 'div', difficulty: 'hard', prerequisites: ['div-remainder', 'mul-multi'], relatedSkills: ['think-efficient-order'], assessmentRules: '최근 10회 정확도 85% 이상' },
  // ── 수학적 사고 (명세 5.3) ──
  { skillId: 'think-make-ten', name: '10 만들기', description: '10이 되는 짝을 찾아 계산을 간단히 하기', operation: 'thinking', difficulty: 'easy', prerequisites: ['add-basic'], relatedSkills: ['add-strategy', 'think-decompose'], assessmentRules: '전략 적용 문항 정확도 80% 이상' },
  { skillId: 'think-decompose', name: '수 분해', description: '수를 쪼개어 계산하기 쉽게 만들기', operation: 'thinking', difficulty: 'medium', prerequisites: ['add-carry'], relatedSkills: ['add-strategy', 'think-make-ten'], assessmentRules: '전략 적용 문항 정확도 80% 이상' },
  { skillId: 'think-complement', name: '보수 활용', description: '9·99·999 등에 가까운 수의 보수 계산', operation: 'thinking', difficulty: 'medium', prerequisites: ['sub-basic'], relatedSkills: ['add-strategy', 'sub-strategy'], assessmentRules: '전략 적용 문항 정확도 80% 이상' },
  { skillId: 'think-commutative', name: '교환법칙', description: '순서를 바꾸어도 결과가 같음을 이해하고 활용', operation: 'thinking', difficulty: 'easy', prerequisites: ['add-basic'], relatedSkills: ['think-associative'], assessmentRules: '개념 확인 문항 정확도 80% 이상' },
  { skillId: 'think-associative', name: '결합법칙', description: '묶는 순서를 바꾸어 계산을 간단히 하기', operation: 'thinking', difficulty: 'medium', prerequisites: ['add-multi'], relatedSkills: ['think-commutative', 'mul-distributive'], assessmentRules: '개념 확인 문항 정확도 80% 이상' },
  { skillId: 'think-distributive', name: '분배법칙', description: '곱셈을 덧셈·뺄셈으로 나누어 계산하기', operation: 'thinking', difficulty: 'hard', prerequisites: ['mul-basic'], relatedSkills: ['mul-distributive'], assessmentRules: '전략 적용 문항 정확도 80% 이상' },
  { skillId: 'think-inverse', name: '역연산', description: '덧셈↔뺄셈, 곱셈↔나눗셈의 역관계 이해', operation: 'thinking', difficulty: 'medium', prerequisites: ['sub-basic', 'div-basic'], relatedSkills: ['think-find-unknown', 'sub-strategy'], assessmentRules: '개념 확인 문항 정확도 80% 이상' },
  { skillId: 'think-number-relation', name: '수의 관계', description: '수 사이의 크기·관계 파악', operation: 'thinking', difficulty: 'medium', prerequisites: ['add-multi', 'sub-multi'], relatedSkills: ['think-find-unknown'], assessmentRules: '개념 확인 문항 정확도 80% 이상' },
  { skillId: 'think-find-unknown', name: '미지수 찾기', description: '□가 들어간 식에서 미지수 구하기 (예: 47 + □ = 48 + 27)', operation: 'thinking', difficulty: 'hard', prerequisites: ['think-inverse'], relatedSkills: ['think-equality'], assessmentRules: '응용 문항 정확도 75% 이상' },
  { skillId: 'think-equality', name: '등식의 성질 기초', description: '등식 양변의 균형 이해', operation: 'thinking', difficulty: 'hard', prerequisites: ['think-find-unknown'], relatedSkills: [], assessmentRules: '개념 확인 문항 정확도 75% 이상' },
  { skillId: 'think-efficient-order', name: '효율적 계산 순서', description: '상황에 맞는 계산 순서·전략 선택', operation: 'thinking', difficulty: 'hard', prerequisites: ['mul-multi', 'div-multi'], relatedSkills: ['mul-distributive'], assessmentRules: '전략 선택 문항 정확도 80% 이상' },
]

export const SKILL_MAP: Map<string, Skill> = new Map(SKILLS.map((s) => [s.skillId, s]))

export function getSkill(skillId: string): Skill {
  const s = SKILL_MAP.get(skillId)
  if (!s) throw new Error(`알 수 없는 skillId: ${skillId}`)
  return s
}

/**
 * 그래프 검증: 존재하지 않는 선수 스킬 참조, 자기 참조, 순환 관계 검사.
 * 앱 시작 시 1회 호출한다.
 */
export function validateSkillGraph(skills: Skill[] = SKILLS): void {
  const ids = new Set(skills.map((s) => s.skillId))
  for (const s of skills) {
    for (const p of s.prerequisites) {
      if (!ids.has(p)) throw new Error(`[${s.skillId}] 존재하지 않는 선수 스킬 참조: ${p}`)
      if (p === s.skillId) throw new Error(`[${s.skillId}] 자기 참조`)
    }
  }
  // Kahn's algorithm — 순환 검출
  const indegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const s of skills) {
    indegree.set(s.skillId, s.prerequisites.length)
    for (const p of s.prerequisites) {
      outgoing.set(p, [...(outgoing.get(p) ?? []), s.skillId])
    }
  }
  const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id)
  let visited = 0
  while (queue.length > 0) {
    const id = queue.pop()!
    visited++
    for (const next of outgoing.get(id) ?? []) {
      indegree.set(next, indegree.get(next)! - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }
  if (visited !== skills.length) {
    throw new Error('Skill 그래프에 순환 관계가 있습니다.')
  }
}

/** 위상 정렬 순서 (선수 스킬이 먼저 나오도록) */
export function topologicalOrder(skills: Skill[] = SKILLS): string[] {
  validateSkillGraph(skills)
  const indegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const s of skills) {
    indegree.set(s.skillId, s.prerequisites.length)
    for (const p of s.prerequisites) {
      outgoing.set(p, [...(outgoing.get(p) ?? []), s.skillId])
    }
  }
  const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of outgoing.get(id) ?? []) {
      indegree.set(next, indegree.get(next)! - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }
  return order
}

/** 선수 학습 충족 여부 — 명세 8.2: 미충족 스킬은 출제 후보에서 제외 */
export function prerequisitesMet(
  skillId: string,
  mastered: Set<string>,
  skills: Skill[] = SKILLS,
): boolean {
  const map = new Map(skills.map((s) => [s.skillId, s]))
  const skill = map.get(skillId)
  if (!skill) throw new Error(`알 수 없는 skillId: ${skillId}`)
  return skill.prerequisites.every((p) => mastered.has(p))
}

/** 숙달된 것으로 간주하는 상태 집합 */
export function isMasteredState(mastery: string): boolean {
  return mastery === 'provisional_mastery' || mastery === 'retained'
}
