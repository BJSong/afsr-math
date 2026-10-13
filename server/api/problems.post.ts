/**
 * POST /api/problems — 문제 출제 (서버 측 생성)
 *
 * 정답은 응답에서 제거하고 서버 보관소에만 저장한다.
 * 클라이언트는 /api/attempts 로 채점 요청 후 정답을 받는다. (명세 13.4)
 */
import { generateProblemSet } from '../../lib/generator/problem-generator'
import { generateThinkingSet } from '../../lib/thinking/problems'
import { problemsRequestSchema } from '../../lib/validation'
import { issueQuestions } from '../utils/problem-store'
import { checkRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const rl = checkRateLimit(`problems:${getRequestIP(event) ?? 'unknown'}`, 60, 60_000)
  if (!rl.allowed) {
    throw createError({ statusCode: 429, message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' })
  }

  const body = await readBody(event)
  const parsed = problemsRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '출제 조건이 올바르지 않습니다.', data: parsed.error.flatten() })
  }
  const req = parsed.data

  try {
    const problems =
      req.kind === 'thinking'
        ? generateThinkingSet(req.template, req.count, req.seed)
        : generateProblemSet(
            {
              operator: req.operator,
              digitsA: req.digitsA,
              digitsB: req.digitsB,
              difficulty: req.difficulty,
              carry: req.carry,
              allowNegative: req.allowNegative,
              allowRemainder: req.allowRemainder,
              count: req.count,
              seed: req.seed,
            },
            req.seed,
          )

    // 정답 보관 (서버 측) — 응답에서는 제거
    issueQuestions(problems)
    return problems.map(({ answer, remainder, ...rest }) => rest)
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'ImpossibleProblemError') {
      throw createError({ statusCode: 422, message: e.message })
    }
    throw e
  }
})
