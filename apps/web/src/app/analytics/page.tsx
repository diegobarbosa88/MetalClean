'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface JobFunnel {
  id: string; title: string; status: string; publishedAt?: string
  viewCount: number; totalApplications: number; pending: number
  shortlisted: number; rejected: number; matched: number; conversionRate: number
}

interface Analytics {
  overview: {
    totalJobs: number; publishedJobs: number; totalApplications: number
    activeMatches: number; completedMatches: number
  }
  reviews: {
    count: number; avgScore?: string; avgPaymentPunctuality?: number
    avgRateCompliance?: number; avgSafetyConditions?: number
  }
  jobFunnel: JobFunnel[]
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-metal-800 bg-metal-900 p-5">
      <p className="text-sm text-metal-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-metal-600">{sub}</p>}
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value?: number | null }) {
  if (!value) return null
  const pct = ((value - 1) / 4) * 100
  return (
    <div>
      <div className="flex justify-between text-xs text-metal-400 mb-1">
        <span>{label}</span>
        <span className="font-medium text-white">{Number(value).toFixed(1)}/5</span>
      </div>
      <div className="h-2 rounded-full bg-metal-800">
        <div className="h-2 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('mc_token')
    if (!t) { router.push('/login'); return }

    fetch(`${API}/analytics/company`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Erro ao carregar analytics')
        return r.json()
      })
      .then(setAnalytics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950 text-white">
        <Navbar isAuthenticated />
        <div className="flex h-64 items-center justify-center text-metal-500">A carregar analytics…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-metal-950 text-white">
        <Navbar isAuthenticated />
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-red-400">
          <p>{error}</p>
          <p className="text-sm text-metal-500">Apenas empresas têm acesso a analytics.</p>
        </div>
      </div>
    )
  }

  const a = analytics!

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-metal-500">Desempenho das tuas vagas e equipa</p>
          </div>
          <Link
            href="/billing"
            className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-400 hover:bg-orange-500/20"
          >
            ★ Premium — mais métricas
          </Link>
        </div>

        {/* Visão geral */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Vagas Publicadas" value={a.overview.publishedJobs} sub={`de ${a.overview.totalJobs} criadas`} />
          <StatCard label="Total Candidaturas" value={a.overview.totalApplications} />
          <StatCard label="Matches Ativos" value={a.overview.activeMatches} />
          <StatCard label="Trabalhos Concluídos" value={a.overview.completedMatches} />
          <StatCard
            label="Avaliação Média"
            value={a.reviews.avgScore ? `${a.reviews.avgScore}/5` : '—'}
            sub={a.reviews.count > 0 ? `${a.reviews.count} avaliações` : 'Sem avaliações'}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Reputação */}
          {a.reviews.count > 0 && (
            <div className="rounded-xl border border-metal-800 bg-metal-900 p-6">
              <h2 className="mb-4 font-semibold">Reputação como Empresa</h2>
              <div className="space-y-4">
                <ScoreBar label="Pontualidade no Pagamento" value={a.reviews.avgPaymentPunctuality} />
                <ScoreBar label="Cumprimento do Valor/Hora" value={a.reviews.avgRateCompliance} />
                <ScoreBar label="Condições de Segurança" value={a.reviews.avgSafetyConditions} />
              </div>
              <p className="mt-4 text-xs text-metal-600">
                Baseado em {a.reviews.count} avaliações de trabalhadores
              </p>
            </div>
          )}

          {/* Funil de candidatos */}
          <div className={`rounded-xl border border-metal-800 bg-metal-900 p-6 ${a.reviews.count > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h2 className="mb-4 font-semibold">Funil por Vaga</h2>
            {a.jobFunnel.length === 0 ? (
              <p className="text-sm text-metal-500">Sem vagas criadas ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-metal-800 text-left text-xs text-metal-500">
                      <th className="pb-2 pr-4">Vaga</th>
                      <th className="pb-2 px-2 text-center">Visitas</th>
                      <th className="pb-2 px-2 text-center">Cand.</th>
                      <th className="pb-2 px-2 text-center">Shortlist</th>
                      <th className="pb-2 px-2 text-center">Match</th>
                      <th className="pb-2 pl-2 text-center">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-metal-800">
                    {a.jobFunnel.map((job) => (
                      <tr key={job.id} className="text-metal-300">
                        <td className="py-3 pr-4">
                          <Link href={`/jobs/${job.id}`} className="hover:text-white">
                            <p className="font-medium text-white">{job.title}</p>
                            <p className="text-xs text-metal-500">
                              {job.status === 'published' ? '● Publicada' : job.status}
                            </p>
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-center">{job.viewCount}</td>
                        <td className="py-3 px-2 text-center">{job.totalApplications}</td>
                        <td className="py-3 px-2 text-center text-yellow-400">{job.shortlisted}</td>
                        <td className="py-3 px-2 text-center text-green-400">{job.matched}</td>
                        <td className="py-3 pl-2 text-center">
                          <span className={`font-medium ${job.conversionRate > 20 ? 'text-green-400' : job.conversionRate > 10 ? 'text-yellow-400' : 'text-metal-400'}`}>
                            {job.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
