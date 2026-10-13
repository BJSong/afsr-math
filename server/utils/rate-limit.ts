/**
 * Rate Limiting (명세 13.5)
 *
 * 현재 구현: 인메모리 슬라이딩 윈도우 (local 모드 / 단일 인스턴스 개발용).
 * ⚠ 서버리스 운영(Vercel)에서는 인스턴스별 메모리에만 의존하는 방식이
 *   동작하지 않으므로, 운영 전환 시 Upstash Redis 기반으로 교체해야 한다.
 *   docs/DEPLOYMENT.md 참고.
 */
interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

/** windowMs 동안 maxHits회 허용 */
export function checkRateLimit(
  key: string,
  maxHits = 60,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    buckets.set(key, bucket)
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  if (bucket.hits.length >= maxHits) {
    return { allowed: false, remaining: 0 }
  }
  bucket.hits.push(now)
  return { allowed: true, remaining: maxHits - bucket.hits.length }
}
