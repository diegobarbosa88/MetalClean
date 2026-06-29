import { z } from 'zod'

export const CreateMatchSchema = z.object({
  workerId: z.string().uuid(),
  applicationId: z.string().uuid().optional().nullable(),
  jobId: z.string().uuid().optional().nullable(),
  confirmedHourlyRate: z.number().min(1).max(500),
  currency: z.string().length(3).default('EUR'),
  workLocationCity: z.string().min(2).max(100),
  workLocationCountry: z.string().length(2).default('PT'),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  housingIncluded: z.boolean().default(false),
})

export const CompleteMatchSchema = z.object({
  actualEndDate: z.string().date().optional().nullable(),
})

export const CancelMatchSchema = z.object({
  cancellationReason: z.string().max(500).optional().nullable(),
})

export type CreateMatchInput = z.infer<typeof CreateMatchSchema>
export type CompleteMatchInput = z.infer<typeof CompleteMatchSchema>
export type CancelMatchInput = z.infer<typeof CancelMatchSchema>
