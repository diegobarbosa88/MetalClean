import { z } from 'zod'

export const RegisterWorkerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Password deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Password deve ter pelo menos uma maiúscula')
    .regex(/[0-9]/, 'Password deve ter pelo menos um número'),
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  primarySpecialty: z.enum([
    'tig_welder',
    'mig_mag_welder',
    'electrode_welder',
    'boilermaker',
    'pipe_fitter',
    'structural_fitter',
    'cnc_operator',
    'other',
  ]),
  phone: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/, 'Número de telemóvel inválido')
    .optional(),
})

export const RegisterCompanySchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Password deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Password deve ter pelo menos uma maiúscula')
    .regex(/[0-9]/, 'Password deve ter pelo menos um número'),
  companyName: z.string().min(2).max(150),
  taxId: z
    .string()
    .regex(/^[0-9]{9}$/, 'NIF deve ter 9 dígitos')
    .optional(),
  locationCity: z.string().min(2).max(100),
  locationCountry: z.string().length(2).default('PT'),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/).optional(),
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password obrigatória'),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
})

export type RegisterWorkerInput = z.infer<typeof RegisterWorkerSchema>
export type RegisterCompanyInput = z.infer<typeof RegisterCompanySchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
