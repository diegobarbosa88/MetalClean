import { z } from 'zod'

export const UpdateCompanyProfileSchema = z.object({
  companyName: z.string().min(2).max(150).optional(),
  bio: z.string().max(3000).optional().nullable(),
  taxId: z
    .string()
    .regex(/^[0-9]{9}$/, 'NIF deve ter 9 dígitos')
    .optional()
    .nullable(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  employeeCountRange: z
    .enum(['1-10', '11-50', '51-200', '201-500', '500+'])
    .optional()
    .nullable(),
  companyType: z
    .enum(['main_contractor', 'subcontractor', 'both', 'temp_agency', 'epc'])
    .optional()
    .nullable(),
  sectors: z
    .array(
      z.enum(['oil_gas', 'petrochemical', 'shipbuilding', 'civil', 'energy', 'food_beverage', 'pharma', 'other'])
    )
    .optional(),
  locationAddress: z.string().max(200).optional().nullable(),
  locationCity: z.string().min(2).max(100).optional(),
  locationCountry: z.string().length(2).optional(),
  website: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  currentProjectsSummary: z.string().max(500).optional().nullable(),
})

export const CompanySearchSchema = z.object({
  type: z
    .enum(['main_contractor', 'subcontractor', 'both', 'temp_agency', 'epc'])
    .optional(),
  sector: z.string().optional(),
  country: z.string().length(2).optional(),
  city: z.string().optional(),
  minScore: z.number().min(1).max(5).optional(),
  q: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
})

export type UpdateCompanyProfileInput = z.infer<typeof UpdateCompanyProfileSchema>
export type CompanySearchInput = z.infer<typeof CompanySearchSchema>
