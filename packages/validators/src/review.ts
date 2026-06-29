import { z } from 'zod'

const scoreField = z.number().int().min(1).max(5)

export const SubmitWorkerReviewSchema = z.object({
  matchId: z.string().uuid(),
  scoreAttendance: scoreField,
  scoreTechnicalQuality: scoreField,
  scoreSafetyCompliance: scoreField,
  scoreAttitudeTeamwork: scoreField,
  writtenReview: z.string().max(1000).optional().nullable(),
})

export const SubmitCompanyReviewSchema = z.object({
  matchId: z.string().uuid(),
  scorePaymentPunctuality: scoreField,
  scoreRateCompliance: scoreField,
  scoreSafetyConditions: scoreField,
  scoreHousingAllowances: scoreField.optional().nullable(),
  writtenReview: z.string().max(1000).optional().nullable(),
})

export const ReviewResponseSchema = z.object({
  responseText: z.string().min(1).max(500),
})

export const ReportReviewSchema = z.object({
  reason: z.enum([
    'defamation',
    'false_information',
    'harassment',
    'spam',
    'inappropriate_content',
    'other',
  ]),
  description: z.string().max(1000).optional().nullable(),
})

export type SubmitWorkerReviewInput = z.infer<typeof SubmitWorkerReviewSchema>
export type SubmitCompanyReviewInput = z.infer<typeof SubmitCompanyReviewSchema>
export type ReviewResponseInput = z.infer<typeof ReviewResponseSchema>
export type ReportReviewInput = z.infer<typeof ReportReviewSchema>
