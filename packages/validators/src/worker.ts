import { z } from 'zod'

export const UpdateWorkerProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  headline: z.string().max(160).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationCountry: z.string().length(2).optional(),
  nationality: z.string().max(100).optional().nullable(),
  birthYear: z.number().int().min(1940).max(2005).optional().nullable(),
  primarySpecialty: z
    .enum([
      'tig_welder',
      'mig_mag_welder',
      'electrode_welder',
      'boilermaker',
      'pipe_fitter',
      'structural_fitter',
      'cnc_operator',
      'other',
    ])
    .optional(),
  secondarySpecialties: z
    .array(
      z.enum([
        'tig_welder',
        'mig_mag_welder',
        'electrode_welder',
        'boilermaker',
        'pipe_fitter',
        'structural_fitter',
        'cnc_operator',
        'other',
      ])
    )
    .optional(),
  yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
  availabilityStatus: z.enum(['available', 'working', 'not_looking']).optional(),
  availableFrom: z.string().date().optional().nullable(),
  preferredContractType: z.enum(['subcontract', 'permanent', 'both']).optional().nullable(),
  desiredHourlyRateMin: z.number().min(0).max(500).optional().nullable(),
  desiredHourlyRateMax: z.number().min(0).max(500).optional().nullable(),
  willingToRelocate: z.boolean().optional(),
  preferredLocations: z.array(z.string().max(50)).max(10).optional(),
  hasOwnTools: z.boolean().optional(),
  equipmentList: z.array(z.string().max(100)).max(20).optional(),
})

export const AddCertificationSchema = z.object({
  standard: z.string().min(1).max(50),
  processCode: z.string().max(20).optional().nullable(),
  materialGroup: z.string().max(20).optional().nullable(),
  position: z.string().max(20).optional().nullable(),
  issuedBy: z.string().min(1).max(100),
  issueDate: z.string().date(),
  expiryDate: z.string().date().optional().nullable(),
  certificateUrl: z.string().url().optional().nullable(),
})

export const WorkerSearchSchema = z.object({
  specialty: z
    .enum([
      'tig_welder',
      'mig_mag_welder',
      'electrode_welder',
      'boilermaker',
      'pipe_fitter',
      'structural_fitter',
      'cnc_operator',
      'other',
    ])
    .optional(),
  country: z.string().length(2).optional(),
  city: z.string().optional(),
  availability: z.enum(['available', 'working', 'not_looking']).optional(),
  minScore: z.number().min(1).max(5).optional(),
  hasOwnTools: z.boolean().optional(),
  certification: z.string().optional(),
  q: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
})

export type UpdateWorkerProfileInput = z.infer<typeof UpdateWorkerProfileSchema>
export type AddCertificationInput = z.infer<typeof AddCertificationSchema>
export type WorkerSearchInput = z.infer<typeof WorkerSearchSchema>
