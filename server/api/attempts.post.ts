/**
 * POST /api/attempts — 답안 제출 및 서버 측 채점 (명세 13.4)
 *
 * 클라이언트가 보낸 isCorrect/score를 절대 신뢰하지 않는다.
 * 서버 보관소의 정답과 직접 비교하고, 중복 제출은 재집계하지 않는다.
 */
import { classifyError } from '../../lib/adaptive/error-analysis'
import { attemptRequestSchema } from '../../lib/validation'
import { getQuestion, markGraded } from '../utils/problem-store'
import { checkRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const rl = checkRateLimit(`attempts:${getRequestIP(event) ?? 'unknown'}`, 120, 60_000)
  if (!rl.allowed) {
    throw createError({ statusCode: 429, message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' })
  }

  const body = await readBody(event)
  const parsed = attemptRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '답안 형식이 올바르지 않습니다.' })
  }
  const { questionId, userAnswer, durationMs } = parsed.data

  const q = getQuestion(questionId)
  if (!q) {
    // 출제되지 않은 문제에 대한 채점 요청 → 세션 검증 실패
    throw createError({
      statusCode: 404,
      message: '출제 기록이 없는 문제입니다. 문제를 다시 받아보세요.',
    })
  }

  // 중복 제출 방지: 이미 채점된 문제는 재집계 없이 이전 결과 반환
  if (q.graded && q.lastResult) {
    return { ...q.lastResult, remainder: q.remainder, skillId: q.skillId, duplicate: true as const }
  }

  const isCorrect = userAnswer != null && userAnswer === q.answer
  const errorTypes =
    !isCorrect && userAnswer != null
      ? classifyError({
          operator: q.operator,
          operands: q.operands,
          correctAnswer: q.answer,
          userAnswer,
        })
      : []

  const result = { isCorrect, correctAnswer: q.answer }
  markGraded(questionId, result)

  return {
    ...result,
    remainder: q.remainder,
    skillId: q.skillId,
    errorTypes,
    durationMs,
    duplicate: false as const,
  }
})
