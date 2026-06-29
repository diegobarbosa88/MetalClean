import Link from 'next/link'
import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatRate, SPECIALTY_LABELS } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Vagas de Trabalho — MetalClean',
  description: 'Vagas de soldadores, caldeireiros, tubistas e outros profissionais da metalomecânica. Valor/hora explícito em todas as ofertas.',
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

async function getJobs(searchParams: Record<string, string>) {
  const params = new URLSearchParams()
  if (searchParams.q) params.set('q', searchParams.q)
  if (searchParams.specialty) params.set('specialty', searchParams.specialty)
  if (searchParams.country) params.set('country', searchParams.country)
  if (searchParams.minRate) params.set('minRate', searchParams.minRate)
  if (searchParams.housing) params.set('housingIncluded', 'true')

  const res = await fetch(`${API}/jobs?${params.toString()}`, { next: { revalidate: 30 } })
  if (!res.ok) return []
  return res.json()
}

const SPECIALTY_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'tig_welder', label: 'TIG' },
  { value: 'mig_mag_welder', label: 'MIG/MAG' },
  { value: 'boilermaker', label: 'Caldeireiro' },
  { value: 'pipe_fitter', label: 'Tubista' },
  { value: 'structural_fitter', label: 'Serralheiro' },
]

interface JobItem {
  id: string
  title: string
  slug: string
  specialtyRequired: string
  hourlyRateMin: number
  hourlyRateMax?: number
  workLocationCity: string
  workLocationCountry: string
  housingIncluded: boolean
  estimatedDurationWeeks?: number
  applicationCount: number
  publishedAt: string
  company: {
    companyName: string
    slug: string
    scoreAvg?: number
    reviewCount?: number
    taxIdVerified?: boolean
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const jobs: JobItem[] = await getJobs(searchParams)
  const activeSpecialty = searchParams.specialty ?? ''

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ofertas de Trabalho</h1>
          <p className="mt-1 text-metal-400">
            {jobs.length} {jobs.length === 1 ? 'vaga disponível' : 'vagas disponíveis'} · Valor/hora
            explícito em todas as ofertas
          </p>
        </div>

        {/* Filters */}
        <form method="get" className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {SPECIALTY_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value ? `/jobs?specialty=${f.value}` : '/jobs'}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeSpecialty === f.value
                    ? 'bg-orange-500 text-white'
                    : 'border border-metal-700 text-metal-400 hover:border-metal-500 hover:text-white'
                }`}
              >
                {f.label}
              </Link>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-metal-400">
              Alojamento incluído
              <Link
                href={searchParams.housing ? '/jobs' : '/jobs?housing=1'}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  searchParams.housing ? 'bg-orange-500' : 'bg-metal-700'
                }`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  searchParams.housing ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </Link>
            </label>
          </div>
        </form>

        {/* Job list */}
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-10 text-center">
              <p className="text-metal-400">Nenhuma vaga encontrada com esses critérios.</p>
              <Link href="/jobs" className="mt-3 inline-block text-sm text-orange-400 hover:underline">
                Ver todas as vagas
              </Link>
            </div>
          ) : (
            jobs.map((job) => (
              <article
                key={job.id}
                className="group rounded-xl border border-metal-700 bg-metal-900 p-5 transition-all hover:border-orange-500/50 hover:bg-metal-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-metal-700 px-2 py-0.5 text-xs font-medium text-metal-300">
                        {SPECIALTY_LABELS[job.specialtyRequired] ?? job.specialtyRequired}
                      </span>
                      {job.housingIncluded && (
                        <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
                          Alojamento
                        </span>
                      )}
                      {job.company.taxIdVerified && (
                        <span className="rounded bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-400">
                          ✓ NIF
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-orange-400">
                      {job.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-metal-400">
                      <Link href={`/companies/${job.company.slug}`} className="hover:text-white">
                        {job.company.companyName}
                      </Link>
                      {job.company.scoreAvg && (
                        <>
                          <span>·</span>
                          <ScoreBadge score={job.company.scoreAvg} reviewCount={job.company.reviewCount} size="sm" />
                        </>
                      )}
                      <span>·</span>
                      <span>📍 {job.workLocationCity}, {job.workLocationCountry}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-orange-400">
                      {formatRate(job.hourlyRateMin, job.hourlyRateMax)}
                    </p>
                    {job.estimatedDurationWeeks && (
                      <p className="text-xs text-metal-500">{job.estimatedDurationWeeks} semanas</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-metal-600">
                    {job.applicationCount} candidaturas
                  </span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="rounded-md bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 ring-1 ring-orange-500/20 transition-colors hover:bg-orange-500 hover:text-white"
                  >
                    Ver oferta
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
