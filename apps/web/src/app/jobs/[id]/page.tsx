import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatDate, formatRate, SPECIALTY_LABELS } from '@/lib/utils'
import { ApplyButton } from './apply-button'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

async function getJob(id: string) {
  const res = await fetch(`${API}/jobs/${id}`, { next: { revalidate: 60 } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Erro ao carregar oferta')
  return res.json()
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id)
  if (!job) return { title: 'Oferta não encontrada' }
  return {
    title: `${job.title} — ${job.company?.companyName ?? ''}`,
    description: job.description?.slice(0, 160),
  }
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id)
  if (!job) notFound()

  const company = job.company ?? {}
  const requiredCerts: { standard: string; processCode?: string; materialGroup?: string }[] =
    job.requiredCertifications ?? []

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6">
          <Link href="/jobs" className="text-sm text-metal-500 hover:text-white">
            ← Voltar a Vagas
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Header card */}
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-metal-700 flex items-center justify-center text-2xl font-bold text-metal-400">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.companyName} className="h-full w-full object-cover" />
                  ) : (
                    company.companyName?.[0] ?? '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold leading-tight">{job.title}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-metal-400">
                    <Link href={`/companies/${company.slug}`} className="hover:text-orange-400">
                      {company.companyName}
                    </Link>
                    {company.scoreAvg && (
                      <>
                        <span>·</span>
                        <ScoreBadge score={company.scoreAvg} reviewCount={company.reviewCount} size="sm" />
                      </>
                    )}
                    <span>·</span>
                    <span>📍 {job.workLocationCity}, {job.workLocationCountry}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded bg-metal-700 px-2 py-0.5 text-xs font-medium text-metal-300">
                      {SPECIALTY_LABELS[job.specialtyRequired] ?? job.specialtyRequired}
                    </span>
                    {job.housingIncluded && (
                      <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
                        ✓ Alojamento incluído
                      </span>
                    )}
                    {job.transportIncluded && (
                      <span className="rounded bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-400">
                        ✓ Transporte incluído
                      </span>
                    )}
                    {company.taxIdVerified && (
                      <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
                        ✓ NIF Verificado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rate — prominent display */}
              <div className="mt-5 flex items-center justify-between rounded-lg bg-metal-800 px-4 py-3">
                <div>
                  <p className="text-xs text-metal-500 uppercase tracking-wide">Valor/hora</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {formatRate(job.hourlyRateMin, job.hourlyRateMax, job.currency)}
                  </p>
                  {job.rateIncludesTax && (
                    <p className="text-xs text-metal-500">Valor bruto (inclui IRS/IVA)</p>
                  )}
                </div>
                <div className="text-right">
                  {job.subsistenceDaily && (
                    <p className="text-sm text-metal-300">+ {job.subsistenceDaily}€/dia subsistência</p>
                  )}
                  {job.estimatedDurationWeeks && (
                    <p className="text-sm text-metal-400">{job.estimatedDurationWeeks} semanas estimadas</p>
                  )}
                </div>
              </div>

              {/* Apply button */}
              <div className="mt-4">
                <ApplyButton jobId={job.id} />
              </div>
              <p className="mt-2 text-center text-xs text-metal-600">
                {job.applicationCount ?? 0} candidaturas · Publicada {formatDate(job.publishedAt)}
              </p>
            </div>

            {/* Description */}
            {job.description && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-metal-400">Descrição</h2>
                <p className="whitespace-pre-wrap text-metal-300">{job.description}</p>
              </div>
            )}

            {/* Required certifications */}
            {requiredCerts.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
                  Certificações Obrigatórias
                </h2>
                <div className="space-y-2">
                  {requiredCerts.map((cert, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-metal-800 px-3 py-2">
                      <span className="text-orange-400">⚡</span>
                      <span className="font-medium text-sm">{cert.standard}</span>
                      {cert.processCode && (
                        <span className="rounded bg-metal-700 px-1.5 py-0.5 text-xs text-metal-300">
                          {cert.processCode}
                        </span>
                      )}
                      {cert.materialGroup && (
                        <span className="text-xs text-metal-500">Grupo {cert.materialGroup}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Material types */}
            {job.materialTypes?.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-metal-400">Materiais</h2>
                <div className="flex flex-wrap gap-2">
                  {job.materialTypes.map((m: string) => (
                    <span key={m} className="rounded bg-metal-700 px-2 py-1 text-xs text-metal-300">
                      {m.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Job details */}
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Detalhes</h2>
              {job.startDate && (
                <div>
                  <p className="text-xs text-metal-500">Início</p>
                  <p className="text-sm">{formatDate(job.startDate)}</p>
                </div>
              )}
              {job.shiftPattern && (
                <div>
                  <p className="text-xs text-metal-500">Turno</p>
                  <p className="text-sm capitalize">{job.shiftPattern.replace('_', ' ')}</p>
                </div>
              )}
              {job.minYearsExperience != null && (
                <div>
                  <p className="text-xs text-metal-500">Experiência mínima</p>
                  <p className="text-sm">{job.minYearsExperience} anos</p>
                </div>
              )}
              {job.ownToolsRequired && (
                <div className="text-sm text-amber-400">⚒ Ferramentas próprias necessárias</div>
              )}
              {job.housingIncluded && job.housingQuality && (
                <div>
                  <p className="text-xs text-metal-500">Tipo de alojamento</p>
                  <p className="text-sm capitalize">{job.housingQuality.replace('_', ' ')}</p>
                </div>
              )}
              {job.projectName && (
                <div>
                  <p className="text-xs text-metal-500">Projeto</p>
                  <p className="text-sm">{job.projectName}</p>
                </div>
              )}
            </div>

            {/* Company mini-profile */}
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Empresa</h2>
              <Link href={`/companies/${company.slug}`} className="flex items-center gap-3 hover:opacity-80">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-metal-700 flex items-center justify-center font-bold text-metal-400">
                  {company.companyName?.[0] ?? '?'}
                </div>
                <div>
                  <p className="font-medium text-sm">{company.companyName}</p>
                  <p className="text-xs text-metal-500">{company.locationCity}, {company.locationCountry}</p>
                </div>
              </Link>
              {company.bio && (
                <p className="text-xs text-metal-400 line-clamp-3">{company.bio}</p>
              )}
              <Link href={`/companies/${company.slug}`} className="block text-center text-xs text-orange-400 hover:underline">
                Ver perfil completo →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
