/**
 * 서버 입력 검증용 Zod 스키마 (명세 13.5)
 * 클라이언트와 서버가 동일한 스키마를 공유한다.
 */
import { z } from 'zod'

const digitRangeSchema = z.object({
  min: z.number().int().min(1).max(4),
  max: z.number().int().min(1).max(4),
}).refine((r) => r.min <= r.max, { message: '자릿수 min은 max보다 클 수 없습니다.' })

export const problemOptionsSchema = z.object({
  operator: z.enum(['add', 'sub', 'mul', 'div', 'mixed']),
  digitsA: digitRangeSchema,
  digitsB: digitRangeSchema,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  carry: z.enum(['none', 'required', 'any']),
  allowNegative: z.boolean(),
  allowRemainder: z.boolean(),
  count: z.number().int().min(1).max(200).default(10),
  seed: z.number().int().optional(),
})

export const thinkingRequestSchema = z.object({
  template: z.enum(['make-ten', 'find-unknown', 'distributive', 'complement']),
  count: z.number().int().min(1).max(200).default(10),
  seed: z.number().int().optional(),
})

export const problemsRequestSchema = z.union([
  problemOptionsSchema.extend({ kind: z.literal('drill').optional() }),
  thinkingRequestSchema.extend({ kind: z.literal('thinking') }),
])

export const attemptRequestSchema = z.object({
  questionId: z.string().min(1).max(120),
  /** 답안 (숫자 또는 빈 답) */
  userAnswer: z.number().int().min(-99999999).max(99999999).nullable(),
  /** 풀이 시간 ms */
  durationMs: z.number().int().min(0).max(3600000),
})

export type ProblemsRequest = z.infer<typeof problemsRequestSchema>
export type AttemptRequest = z.infer<typeof attemptRequestSchema>
