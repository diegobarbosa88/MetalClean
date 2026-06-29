import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatDate, SPECIALTY_LABELS } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

async function getWorker(slug: string) {
  const res = await fetch(`${API}/workers/${slug}`, { next: { revalidate: 60 } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Erro ao carregar perfil')
  return res.json()
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const worker = await getWorker(params.slug)
  if (!worker) return { title: 'Trabalhador não encontrado' }
  return {
    title: `${worker.fullName} — ${SPECIALTY_LABELS[worker.primarySpecialty] ?? worker.primarySpecialty}`,
    description: worker.headline ?? worker.bio?.slice(0, 160),
  }
}

export default async function WorkerProfilePage({ params }: { params: { slug: string } }) {
  const worker = await getWorker(params.slug)
  if (!worker) notFound()

  const reviews = worker.reviews ?? []
  const activeCerts = (worker.certifications ?? []).filter(
    (c: { expiryDate?: string }) => !c.expiryDate || new Date(c.expiryDate) >= new Date()
  )

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar />

      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-r from-metal-800 to-metal-700">
        {worker.coverUrl && (
          <img src={worker.coverUrl} alt="Cover" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="relative -mt-16 mb-6 flex items-end gap-4">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border-4 border-metal-950 bg-metal-700">
            {worker.avatarUrl ? (
              <img src={worker.avatarUrl} alt={worker.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl font-bold text-metal-400">
                {worker.fullName[0]}
              </div>
            )}
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-bold">{worker.fullName}</h1>
            <p className="text-metal-400">{SPECIALTY_LABELS[worker.primarySpecialty] ?? worker.primarySpecialty}</p>
            <div className="mt-1 flex items-center gap-3">
              <ScoreBadge score={worker.scoreAvg} reviewCount={worker.reviewCount} />
              {worker.locationCity && (
                <span className="text-sm text-metal-500">📍 {worker.locationCity}, {worker.locationCountry}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Headline / Bio */}
            {worker.headline && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <p className="text-lg font-medium">{worker.headline}</p>
              </div>
            )}
            {worker.bio && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-metal-400">Sobre</h2>
                <p className="whitespace-pre-wrap text-metal-300">{worker.bio}</p>
              </div>
            )}

            {/* Certifications */}
            {activeCerts.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
                  Certificações Ativas
                </h2>
                <div className="space-y-3">
                  {activeCerts.map((cert: { id: string; standard: string; processCode?: string; position?: string; issuedBy: string; expiryDate?: string; isVerified: boolean }) => (
                    <div key={cert.id} className="flex items-start justify-between gap-3 rounded-lg bg-metal-800 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cert.standard}</span>
                          {cert.processCode && (
                            <span className="rounded bg-metal-700 px-1.5 py-0.5 text-xs text-metal-300">
                              {cert.processCode}
                            </span>
                          )}
                          {cert.isVerified && (
                            <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-400">
                              ✓ Verificado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-metal-500">
                          {cert.issuedBy}
                          {cert.position && ` · Posição ${cert.position}`}
                        </p>
                      </div>
                      {cert.expiryDate && (
                        <span className="shrink-0 text-xs text-metal-500">
                          Válido até {formatDate(cert.expiryDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trabalho history */}
            {worker.matches?.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
                  Historial de Trabalho
                </h2>
                <div className="space-y-3">
                  {worker.matches.map((match: { id: string; company: { companyName: string; slug: string }; workLocationCity: string; workLocationCountry: string; startDate?: string; actualEndDate?: string; status: string }) => (
                    <div key={match.id} className="flex items-center gap-3 rounded-lg bg-metal-800 p-3">
                      <div className="h-8 w-8 rounded-lg bg-metal-700 flex items-center justify-center text-sm font-bold text-metal-400">
                        {match.company.companyName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{match.company.companyName}</p>
                        <p className="text-xs text-metal-500">
                          {match.workLocationCity}, {match.workLocationCountry}
                          {match.startDate && ` · ${formatDate(match.startDate, { month: 'short', year: 'numeric' })}`}
                          {match.actualEndDate && ` — ${formatDate(match.actualEndDate, { month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
                  Avaliações ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.map((review: { id: string; overallScore: number; writtenReview?: string; responseText?: string; submittedAt: string; scoreAttendance?: number; scoreTechnicalQuality?: number; scoreSafetyCompliance?: number; scoreAttitudeTeamwork?: number; match?: { company?: { companyName: string } } }) => (
                    <div key={review.id} className="rounded-lg border border-metal-700 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">
                          {review.match?.company?.companyName ?? 'Empresa'}
                        </span>
                        <ScoreBadge score={review.overallScore} size="sm" />
                      </div>
                      {review.writtenReview && (
                        <p className="text-sm text-metal-300">&ldquo;{review.writtenReview}&rdquo;</p>
                      )}
                      {/* Criteria breakdown */}
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {review.scoreAttendance != null && (
                          <span className="text-xs text-metal-500">Assiduidade: <span className="text-white">{review.scoreAttendance}/5</span></span>
                        )}
                        {review.scoreTechnicalQuality != null && (
                          <span className="text-xs text-metal-500">Qualidade: <span className="text-white">{review.scoreTechnicalQuality}/5</span></span>
                        )}
                        {review.scoreSafetyCompliance != null && (
                          <span className="text-xs text-metal-500">Segurança: <span className="text-white">{review.scoreSafetyCompliance}/5</span></span>
                        )}
                        {review.scoreAttitudeTeamwork != null && (
                          <span className="text-xs text-metal-500">Postura: <span className="text-white">{review.scoreAttitudeTeamwork}/5</span></span>
                        )}
                      </div>
                      {review.responseText && (
                        <div className="mt-3 rounded-lg bg-metal-800 p-3">
                          <p className="text-xs font-medium text-metal-400">Resposta do trabalhador:</p>
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

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Availability */}
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-metal-400">Disponibilidade</h2>
              <div className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  worker.availabilityStatus === 'available'
                    ? 'bg-green-400/10 text-green-400'
                    : worker.availabilityStatus === 'working'
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'bg-metal-700 text-metal-400'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {worker.availabilityStatus === 'available' ? 'Disponível' : worker.availabilityStatus === 'working' ? 'Em projeto' : 'Não disponível'}
                </div>
                {worker.availableFrom && (
                  <p className="text-xs text-metal-500">Disponível a partir de {formatDate(worker.availableFrom)}</p>
                )}
                {worker.desiredHourlyRateMin && (
                  <p className="text-sm text-metal-300">
                    {worker.desiredHourlyRateMin}€{worker.desiredHourlyRateMax ? `–${worker.desiredHourlyRateMax}€` : '+'}/h
                  </p>
                )}
                {worker.willingToRelocate && (
                  <p className="text-xs text-metal-500">✓ Disponível para deslocação</p>
                )}
              </div>
            </div>

            {/* Equipment */}
            {(worker.hasOwnTools || worker.equipmentList?.length > 0) && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-metal-400">Equipamento</h2>
                {worker.hasOwnTools && <p className="mb-2 text-sm text-green-400">✓ Tem ferramentas próprias</p>}
                {worker.equipmentList?.map((eq: string) => (
                  <p key={eq} className="text-xs text-metal-400">· {eq}</p>
                ))}
              </div>
            )}

            {/* Experience */}
            {worker.yearsExperience != null && (
              <div className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-metal-400">Experiência</h2>
                <p className="text-2xl font-bold text-orange-400">{worker.yearsExperience}</p>
                <p className="text-xs text-metal-500">anos de experiência</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
