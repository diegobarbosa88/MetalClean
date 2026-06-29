import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatDate, formatRate } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

async function getCompany(slug: string) {
  const res = await fetch(`${API}/companies/${slug}`, { next: { revalidate: 60 } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Erro ao carregar empresa')
  return res.json()
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const company = await getCompany(params.slug)
  if (!company) return { title: 'Empresa não encontrada' }
  return { title: company.companyName, description: company.bio?.slice(0, 160) }
}

export default async function CompanyProfilePage({ params }: { params: { slug: string } }) {
  const company = await getCompany(params.slug)
  if (!company) notFound()

  const reviews = company.reviews ?? []
  const activeJobs = company.jobPostings ?? []

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar />

      <div className="relative h-48 bg-gradient-to-r from-metal-800 to-metal-700">
        {company.coverUrl && (
          <img src={company.coverUrl} alt="Cover" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="relative -mt-16 mb-6 flex items-end gap-4">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border-4 border-metal-950 bg-metal-700 flex items-center justify-center">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-metal-400">{company.companyName[0]}</span>
            )}
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-bold">{company.companyName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <ScoreBadge score={company.scoreAvg} reviewCount={company.reviewCount} />
              <span className="text-sm text-metal-500">📍 {company.locationCity}, {company.locationCountry}</span>
              {company.employeeCountRange && (
                <span className="text-sm text-metal-500">👥 {company.employeeCountRange} colaboradores</span>
              )}
              {company.taxIdVerified && (
                <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs text-green-400">✓ NIF Verificado</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            {company.bio && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-metal-400">Sobre a Empresa</h2>
                <p className="whitespace-pre-wrap text-metal-300">{company.bio}</p>
              </div>
            )}

            {/* Active job postings */}
            {activeJobs.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
                  Vagas Abertas ({activeJobs.length})
                </h2>
                <div className="space-y-3">
                  {activeJobs.map((job: { id: string; title: string; slug: string; specialtyRequired: string; hourlyRateMin: number; hourlyRateMax?: number; workLocationCity: string; housingIncluded: boolean; estimatedDurationWeeks?: number; applicationCount: number }) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between rounded-lg border border-metal-700 p-4 transition-colors hover:border-orange-500/50 hover:bg-metal-800"
                    >
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-xs text-metal-500">
                          {job.workLocationCity}
                          {job.housingIncluded && ' · Alojamento incluído'}
                          {job.estimatedDurationWeeks && ` · ${job.estimatedDurationWeeks} semanas`}
                          {' · '}{job.applicationCount} candidaturas
                        </p>
                      </div>
                      <span className="text-orange-400 font-semibold">
                        {formatRate(job.hourlyRateMin, job.hourlyRateMax)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews from workers */}
            {reviews.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
                  Avaliações de Trabalhadores ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.map((review: { id: string; overallScore: number; writtenReview?: string; responseText?: string; submittedAt: string; scorePaymentPunctuality?: number; scoreRateCompliance?: number; scoreSafetyConditions?: number; scoreHousingAllowances?: number; match?: { worker?: { fullName: string; primarySpecialty: string } } }) => (
                    <div key={review.id} className="rounded-lg border border-metal-700 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">
                          {review.match?.worker?.fullName ?? 'Trabalhador'}
                          {review.match?.worker?.primarySpecialty && (
                            <span className="ml-2 text-xs text-metal-500">· {review.match.worker.primarySpecialty}</span>
                          )}
                        </span>
                        <ScoreBadge score={review.overallScore} size="sm" />
                      </div>
                      {review.writtenReview && (
                        <p className="text-sm text-metal-300">&ldquo;{review.writtenReview}&rdquo;</p>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {review.scorePaymentPunctuality != null && (
                          <span className="text-xs text-metal-500">Pagamentos: <span className="text-white">{review.scorePaymentPunctuality}/5</span></span>
                        )}
                        {review.scoreRateCompliance != null && (
                          <span className="text-xs text-metal-500">Valor acordado: <span className="text-white">{review.scoreRateCompliance}/5</span></span>
                        )}
                        {review.scoreSafetyConditions != null && (
                          <span className="text-xs text-metal-500">Segurança: <span className="text-white">{review.scoreSafetyConditions}/5</span></span>
                        )}
                        {review.scoreHousingAllowances != null && (
                          <span className="text-xs text-metal-500">Alojamento: <span className="text-white">{review.scoreHousingAllowances}/5</span></span>
                        )}
                      </div>
                      {review.responseText && (
                        <div className="mt-3 rounded-lg bg-metal-800 p-3">
                          <p className="text-xs font-medium text-metal-400">Resposta da empresa:</p>
                          <p className="text-sm text-metal-300">{review.responseText}</p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-metal-600">{formatDate(review.submittedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Informação</h2>
              {company.companyType && (
                <div>
                  <p className="text-xs text-metal-500">Tipo</p>
                  <p className="text-sm capitalize">{company.companyType.replace('_', ' ')}</p>
                </div>
              )}
              {company.foundedYear && (
                <div>
                  <p className="text-xs text-metal-500">Fundada em</p>
                  <p className="text-sm">{company.foundedYear}</p>
                </div>
              )}
              {company.sectors?.length > 0 && (
                <div>
                  <p className="text-xs text-metal-500">Setores</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {company.sectors.map((s: string) => (
                      <span key={s} className="rounded bg-metal-700 px-2 py-0.5 text-xs text-metal-300">
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {company.website && (
                <div>
                  <p className="text-xs text-metal-500">Website</p>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-400 hover:underline">
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {company.currentProjectsSummary && (
                <div>
                  <p className="text-xs text-metal-500">Projetos atuais</p>
                  <p className="text-sm text-metal-300">{company.currentProjectsSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
