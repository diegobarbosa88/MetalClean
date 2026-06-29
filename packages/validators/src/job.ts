import { z } from 'zod'

const specialtyEnum = z.enum([
  'tig_welder',
  'mig_mag_welder',
  'electrode_welder',
  'boilermaker',
  'pipe_fitter',
  'structural_fitter',
  'cnc_operator',
  'other',
])

export const CreateJobSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(5000),
  specialtyRequired: specialtyEnum,
  specialtiesAccepted: z.array(specialtyEnum).optional().default([]),
  requiredCertifications: z
    .array(
      z.object({
        standard: z.string().min(1).max(50),
        processCode: z.string().max(20).optional(),
        materialGroup: z.string().max(20).optional(),
      })
    )
    .optional()
    .default([]),
  minYearsExperience: z.number().int().min(0).max(60).optional().nullable(),
  ownToolsRequired: z.boolean().default(false),
  hourlyRateMin: z.number().min(1).max(500),
  hourlyRateMax: z.number().min(1).max(500).optional().nullable(),
  currency: z.string().length(3).default('EUR'),
  rateIncludesTax: z.boolean().default(false),
  subsidenceDaily: z.number().min(0).max(200).optional().nullable(),
  housingIncluded: z.boolean().default(false),
  housingQuality: z
    .enum(['shared_room', 'single_room', 'apartment', 'hotel'])
    .optional()
    .nullable(),
  transportIncluded: z.boolean().default(false),
  projectName: z.string().max(150).optional().nullable(),
  workLocationCity: z.string().min(2).max(100),
  workLocationCountry: z.string().length(2).default('PT'),
  startDate: z.string().date().optional().nullable(),
  estimatedDurationWeeks: z.number().int().min(1).max(520).optional().nullable(),
  shiftPattern: z.enum(['day', 'night', 'rotating', 'offshore']).optional().nullable(),
  materialTypes: z
    .array(z.enum(['carbon_steel', 'stainless', 'duplex', 'aluminium', 'titanium', 'inconel', 'other']))
    .optional()
    .default([]),
})

export const UpdateJobStatusSchema = z.object({
  status: z.enum(['published', 'paused', 'filled', 'cancelled']),
})

export const JobSearchSchema = z.object({
  specialty: specialtyEnum.optional(),
  country: z.string().length(2).optional(),
  city: z.string().optional(),
  minRate: z.number().min(0).optional(),
  housingIncluded: z.boolean().optional(),
  materialType: z.string().optional(),
  shiftPattern: z.enum(['day', 'night', 'rotating', 'offshore']).optional(),
  q: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
})

export type CreateJobInput = z.infer<typeof CreateJobSchema>
export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>
export type JobSearchInput = z.infer<typeof JobSearchSchema>
