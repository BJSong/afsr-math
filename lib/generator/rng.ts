/**
 * 시드 기반 난수 생성기 — 테스트 재현성을 위해 Math.random 대신 사용
 */
export type Rng = () => number

/** mulberry32: 작고 결정적인 PRNG */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** [min, max] 정수 (양 끝 포함) */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max < min) throw new Error(`randInt: max(${max}) < min(${min})`)
  return min + Math.floor(rng() * (max - min + 1))
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: 빈 배열')
  const v = arr[Math.floor(rng() * arr.length)]
  if (v === undefined) throw new Error('pick: 인덱스 오류')
  return v
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 31) >>> 0
}
