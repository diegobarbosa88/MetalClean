'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  RegisterWorkerSchema,
  RegisterCompanySchema,
  type RegisterWorkerInput,
  type RegisterCompanyInput,
} from '@metalclean/validators/auth'
import { api } from '@/lib/api'
import type { AuthSession } from '@metalclean/types'

const SPECIALTIES = [
  { value: 'tig_welder', label: 'Soldador TIG' },
  { value: 'mig_mag_welder', label: 'Soldador MIG/MAG' },
  { value: 'electrode_welder', label: 'Soldador Elétrodo' },
  { value: 'boilermaker', label: 'Caldeireiro' },
  { value: 'pipe_fitter', label: 'Tubista' },
  { value: 'structural_fitter', label: 'Serralheiro Estrutural' },
  { value: 'cnc_operator', label: 'Operador CNC' },
  { value: 'other', label: 'Outro' },
]

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') === 'company' ? 'company' : 'worker'
  const [accountType, setAccountType] = useState<'worker' | 'company'>(initialType)
  const [error, setError] = useState<string | null>(null)

  const workerForm = useForm<RegisterWorkerInput>({
    resolver: zodResolver(RegisterWorkerSchema),
    defaultValues: { email: '', password: '', fullName: '', primarySpecialty: 'tig_welder' },
  })

  const companyForm = useForm<RegisterCompanyInput>({
    resolver: zodResolver(RegisterCompanySchema),
    defaultValues: { email: '', password: '', companyName: '', locationCity: '', locationCountry: 'PT' },
  })

  const onSubmitWorker = async (data: RegisterWorkerInput) => {
    setError(null)
    try {
      const session = await api.post<AuthSession>('/auth/register/worker', data)
      localStorage.setItem('mc_token', session.tokens.accessToken)
      router.push('/onboarding/worker')
    } catch (err) {
      if (err instanceof api.ApiError) setError(err.message)
      else setError('Erro inesperado. Tenta novamente.')
    }
  }

  const onSubmitCompany = async (data: RegisterCompanyInput) => {
    setError(null)
    try {
      const session = await api.post<AuthSession>('/auth/register/company', data)
      localStorage.setItem('mc_token', session.tokens.accessToken)
      router.push('/onboarding/company')
    } catch (err) {
      if (err instanceof api.ApiError) setError(err.message)
      else setError('Erro inesperado. Tenta novamente.')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-metal-700 bg-metal-800 px-3 py-2.5 text-white placeholder-metal-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
  const labelCls = 'text-sm font-medium text-metal-300'
  const errorCls = 'text-xs text-red-400'

  return (
    <div className="flex min-h-screen items-center justify-center bg-metal-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-white">
            Metal<span className="text-orange-500">Clean</span>
          </Link>
          <p className="mt-2 text-metal-400">Cria a tua conta</p>
        </div>

        {/* Account type toggle */}
        <div className="mb-6 flex rounded-xl border border-metal-700 bg-metal-900 p-1">
          {(['worker', 'company'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setAccountType(type)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                accountType === type
                  ? 'bg-orange-500 text-white'
                  : 'text-metal-400 hover:text-white'
              }`}
            >
              {type === 'worker' ? 'Sou Trabalhador' : 'Sou Empresa'}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-metal-700 bg-metal-900 p-8 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          {/* Worker Registration Form */}
          {accountType === 'worker' && (
            <form onSubmit={workerForm.handleSubmit(onSubmitWorker)} className="space-y-4">
              <div className="space-y-1">
                <label className={labelCls} htmlFor="fullName">Nome completo</label>
                <input id="fullName" type="text" className={inputCls} placeholder="João Silva" {...workerForm.register('fullName')} />
                {workerForm.formState.errors.fullName && <p className={errorCls}>{workerForm.formState.errors.fullName.message}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="specialty">Especialidade principal</label>
                <select id="specialty" className={`${inputCls} cursor-pointer`} {...workerForm.register('primarySpecialty')}>
                  {SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="w-email">Email</label>
                <input id="w-email" type="email" className={inputCls} placeholder="joao@exemplo.com" {...workerForm.register('email')} />
                {workerForm.formState.errors.email && <p className={errorCls}>{workerForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="w-phone">Telemóvel (opcional)</label>
                <input id="w-phone" type="tel" className={inputCls} placeholder="+351 9XX XXX XXX" {...workerForm.register('phone')} />
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="w-password">Password</label>
                <input id="w-password" type="password" className={inputCls} placeholder="Mínimo 8 caracteres" {...workerForm.register('password')} />
                {workerForm.formState.errors.password && <p className={errorCls}>{workerForm.formState.errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={workerForm.formState.isSubmitting}
                className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
              >
                {workerForm.formState.isSubmitting ? 'A criar conta...' : 'Criar conta de trabalhador'}
              </button>
            </form>
          )}

          {/* Company Registration Form */}
          {accountType === 'company' && (
            <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-4">
              <div className="space-y-1">
                <label className={labelCls} htmlFor="companyName">Nome da empresa</label>
                <input id="companyName" type="text" className={inputCls} placeholder="INOXFER, Lda." {...companyForm.register('companyName')} />
                {companyForm.formState.errors.companyName && <p className={errorCls}>{companyForm.formState.errors.companyName.message}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="taxId">NIF (opcional)</label>
                <input id="taxId" type="text" className={inputCls} placeholder="123456789" maxLength={9} {...companyForm.register('taxId')} />
                {companyForm.formState.errors.taxId && <p className={errorCls}>{companyForm.formState.errors.taxId.message}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="locationCity">Cidade (sede)</label>
                <input id="locationCity" type="text" className={inputCls} placeholder="Sines" {...companyForm.register('locationCity')} />
                {companyForm.formState.errors.locationCity && <p className={errorCls}>{companyForm.formState.errors.locationCity.message}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="c-email">Email</label>
                <input id="c-email" type="email" className={inputCls} placeholder="rh@empresa.pt" {...companyForm.register('email')} />
                {companyForm.formState.errors.email && <p className={errorCls}>{companyForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelCls} htmlFor="c-password">Password</label>
                <input id="c-password" type="password" className={inputCls} placeholder="Mínimo 8 caracteres" {...companyForm.register('password')} />
                {companyForm.formState.errors.password && <p className={errorCls}>{companyForm.formState.errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={companyForm.formState.isSubmitting}
                className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
              >
                {companyForm.formState.isSubmitting ? 'A criar conta...' : 'Criar conta de empresa'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-metal-400">
            Já tens conta?{' '}
            <Link href="/login" className="text-orange-400 hover:text-orange-300">
              Entrar
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-metal-600">
          Ao registares-te, aceitas os nossos{' '}
          <Link href="/terms" className="hover:text-metal-400">Termos de Serviço</Link>{' '}
          e a nossa{' '}
          <Link href="/privacy" className="hover:text-metal-400">Política de Privacidade</Link>.
        </p>
      </div>
    </div>
  )
}
