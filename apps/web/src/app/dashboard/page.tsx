'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatDate, formatRate, SPECIALTY_LABELS, MATCH_STATUS_LABELS, MATCH_STATUS_COLORS, APPLICATION_STATUS_LABELS } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

type Tab = 'applications' | 'matches' | 'jobs' | 'applicants'

interface WorkerApplication {
  id: string
  status: string
  appliedAt: string
  proposedRate?: number
  job: { id: string; title: string; workLocationCity: string; hourlyRateMin: number; hourlyRateMax?: number }
  company: { companyName: string; slug: string; scoreAvg?: number }
}

interface Match {
  id: string
  status: string
  confirmedHourlyRate: number
  currency: string
  workLocationCity: string
  startDate?: string
  actualEndDate?: string
  completedAt?: string
  workerCanReviewUntil?: string
  companyCanReviewUntil?: string
  worker?: { fullName: string; slug: string; primarySpecialty: string }
  company?: { companyName: string; slug: string }
  hasWorkerReview?: boolean
  hasCompanyReview?: boolean
}

interface JobPosting {
  id: string
  title: string
  status: string
  hourlyRateMin: number
  hourlyRateMax?: number
  workLocationCity: string
  applicationCount: number
  publishedAt?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('applications')
  const [data, setData] = useState<{
    applications: WorkerApplication[]
    matches: Match[]
    jobs: JobPosting[]
  }>({ applications: [], matches: [], jobs: [] })
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ scoreAvg?: number; reviewCount?: number; fullName?: string; companyName?: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    async function load() {
      const token = localStorage.getItem('mc_token')!
      try {
        const meRes = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!meRes.ok) { router.push('/login'); return }
        const me = await meRes.json()
        setAccountType(me.accountType)

        if (me.accountType === 'worker') {
          setTab('applications')
          const [appRes, matchRes] = await Promise.all([
            fetch(`${API}/applications/mine`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/matches`, { headers: { Authorization: `Bearer ${token}` } }),
          ])
          const applications = appRes.ok ? await appRes.json() : []
          const matches = matchRes.ok ? await matchRes.json() : []
          setData({ applications, matches, jobs: [] })
          setProfile(me.workerProfile)
        } else {
          setTab('jobs')
          const [jobRes, matchRes] = await Promise.all([
            fetch(`${API}/jobs/mine`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/matches`, { headers: { Authorization: `Bearer ${token}` } }),
          ])
          const jobs = jobRes.ok ? await jobRes.json() : []
          const matches = matchRes.ok ? await matchRes.json() : []
          setData({ applications: [], matches, jobs })
          setProfile(me.companyProfile)
        }
      } catch {
        // silent — show empty state
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950 text-white flex items-center justify-center">
        <p className="text-metal-400">A carregar...</p>
      </div>
    )
  }

  const isWorker = accountType === 'worker'

  const tabs: { id: Tab; label: string }[] = isWorker
    ? [
        { id: 'applications', label: `Candidaturas (${data.applications.length})` },
        { id: 'matches', label: `Contratos (${data.matches.length})` },
      ]
    : [
        { id: 'jobs', label: `Vagas (${data.jobs.length})` },
        { id: 'matches', label: `Contratos (${data.matches.length})` },
      ]

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {profile && (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-metal-400 text-sm">
                  {profile.fullName ?? profile.companyName}
                </p>
                {profile.scoreAvg && (
                  <ScoreBadge score={profile.scoreAvg} reviewCount={profile.reviewCount} size="sm" />
                )}
              </div>
            )}
          </div>
          {!isWorker && (
            <Link
              href="/jobs/new"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              + Nova Vaga
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-metal-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-metal-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Worker: Applications tab */}
        {tab === 'applications' && (
          <div className="space-y-3">
            {data.applications.length === 0 ? (
              <EmptyState
                message="Ainda não te candidataste a nenhuma vaga."
                cta={{ href: '/jobs', label: 'Ver vagas disponíveis' }}
              />
            ) : (
              data.applications.map((app) => (
                <div key={app.id} className="rounded-xl border border-metal-700 bg-metal-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${app.job.id}`} className="font-medium hover:text-orange-400">
                        {app.job.title}
                      </Link>
                      <p className="text-sm text-metal-400">
                        <Link href={`/companies/${app.company.slug}`} className="hover:text-white">
                          {app.company.companyName}
                        </Link>
                        {app.company.scoreAvg && (
                          <> · <ScoreBadge score={app.company.scoreAvg} size="sm" /></>
                        )}
                        {' · '}{app.job.workLocationCity}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusPill status={app.status} labels={APPLICATION_STATUS_LABELS} />
                      <p className="mt-1 text-xs text-orange-400">
                        {formatRate(app.job.hourlyRateMin, app.job.hourlyRateMax)}
                      </p>
                    </div>
                  </div>
                  {app.proposedRate && (
                    <p className="mt-2 text-xs text-metal-500">
                      Valor proposto: <span className="text-white">{app.proposedRate}€/h</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-metal-600">Candidatura em {formatDate(app.appliedAt)}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Company: Jobs tab */}
        {tab === 'jobs' && (
          <div className="space-y-3">
            {data.jobs.length === 0 ? (
              <EmptyState
                message="Ainda não publicaste nenhuma vaga."
                cta={{ href: '/jobs/new', label: 'Criar primeira vaga' }}
              />
            ) : (
              data.jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-metal-700 bg-metal-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-orange-400">
                        {job.title}
                      </Link>
                      <p className="text-sm text-metal-400">
                        {job.workLocationCity} · {job.applicationCount} candidaturas
                      </p>
                      {job.publishedAt && (
                        <p className="text-xs text-metal-600">Publicada em {formatDate(job.publishedAt)}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <StatusPill status={job.status} labels={JOB_STATUS_LABELS} />
                      <p className="text-sm font-semibold text-orange-400">
                        {formatRate(job.hourlyRateMin, job.hourlyRateMax)}
                      </p>
                      {job.applicationCount > 0 && (
                        <Link
                          href={`/jobs/${job.id}/applicants`}
                          className="block text-xs text-orange-400 hover:underline"
                        >
                          Ver candidatos →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Matches tab (both types) */}
        {tab === 'matches' && (
          <div className="space-y-3">
            {data.matches.length === 0 ? (
              <EmptyState message="Ainda não tens contratos ativos." />
            ) : (
              data.matches.map((match) => {
                const canReview =
                  match.status === 'completed' &&
                  (isWorker
                    ? match.workerCanReviewUntil && new Date(match.workerCanReviewUntil) > new Date() && !match.hasWorkerReview
                    : match.companyCanReviewUntil && new Date(match.companyCanReviewUntil) > new Date() && !match.hasCompanyReview)

                return (
                  <div key={match.id} className="rounded-xl border border-metal-700 bg-metal-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {isWorker
                            ? <Link href={`/companies/${match.company?.slug}`} className="hover:text-orange-400">{match.company?.companyName}</Link>
                            : <Link href={`/workers/${match.worker?.slug}`} className="hover:text-orange-400">{match.worker?.fullName}</Link>
                          }
                        </p>
                        <p className="text-sm text-metal-400">
                          {match.workLocationCity}
                          {match.startDate && ` · Início ${formatDate(match.startDate)}`}
                          {match.actualEndDate && ` — ${formatDate(match.actualEndDate)}`}
                        </p>
                        <p className="text-sm font-semibold text-orange-400 mt-0.5">
                          {match.confirmedHourlyRate}€/h
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-1.5">
                        <StatusPill status={match.status} labels={MATCH_STATUS_LABELS} colors={MATCH_STATUS_COLORS} />
                        {match.status === 'pending_worker' && isWorker && (
                          <Link
                            href={`/matches/${match.id}/accept`}
                            className="block rounded bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                          >
                            Aceitar contrato
                          </Link>
                        )}
                        {match.status === 'active' && (
                          <Link
                            href={`/matches/${match.id}/complete`}
                            className="block rounded bg-metal-700 px-2 py-1 text-xs font-medium text-metal-300 hover:bg-metal-600 transition-colors"
                          >
                            Concluir trabalho
                          </Link>
                        )}
                        {canReview && (
                          <Link
                            href={`/matches/${match.id}/review`}
                            className="block rounded bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500 hover:text-white transition-colors"
                          >
                            Avaliar agora
                          </Link>
                        )}
                        {match.status === 'completed' && canReview && match.workerCanReviewUntil && (
                          <p className="text-xs text-metal-600">
                            Até {formatDate(match.workerCanReviewUntil)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Company: create match prompt for shortlisted applications */}
        {tab === 'jobs' && !isWorker && data.matches.some((m) => m.status === 'pending_worker') && (
          <div className="mt-4 rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-sm text-yellow-400">
            Tens contratos a aguardar aceitação. <Link href="#" onClick={() => setTab('matches')} className="underline">Ver contratos</Link>
          </div>
        )}
      </div>
    </div>
  )
}

const JOB_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  paused: 'Pausada',
  filled: 'Preenchida',
  cancelled: 'Cancelada',
  expired: 'Expirada',
}

const JOB_STATUS_COLORS: Record<string, string> = {
  draft: 'text-metal-400 bg-metal-700/50',
  published: 'text-green-400 bg-green-400/10',
  paused: 'text-yellow-400 bg-yellow-400/10',
  filled: 'text-blue-400 bg-blue-400/10',
  cancelled: 'text-metal-400 bg-metal-700/50',
  expired: 'text-red-400 bg-red-400/10',
}

function StatusPill({
  status,
  labels,
  colors,
}: {
  status: string
  labels: Record<string, string>
  colors?: Record<string, string>
}) {
  const colorMap = colors ?? JOB_STATUS_COLORS
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'text-metal-400 bg-metal-700/50'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function EmptyState({ message, cta }: { message: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-xl border border-metal-700 bg-metal-900 p-10 text-center">
      <p className="text-metal-400">{message}</p>
      {cta && (
        <Link href={cta.href} className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition-colors">
          {cta.label}
        </Link>
      )}
    </div>
  )
}
