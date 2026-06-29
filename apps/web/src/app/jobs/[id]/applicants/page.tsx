'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { formatDate, SPECIALTY_LABELS } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface Application {
  id: string
  status: string
  proposedRate?: number
  coverNote?: string
  appliedAt: string
  worker: {
    id: string
    fullName: string
    slug: string
    primarySpecialty: string
    yearsExperience?: number
    scoreAvg?: number
    reviewCount?: number
    locationCity?: string
    locationCountry?: string
    certifications: { standard: string; processCode?: string; isVerified: boolean }[]
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  viewed: 'Vista',
  shortlisted: 'Selecionada',
  rejected: 'Rejeitada',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-metal-400 bg-metal-700/50',
  viewed: 'text-blue-400 bg-blue-400/10',
  shortlisted: 'text-green-400 bg-green-400/10',
  rejected: 'text-red-400 bg-red-400/10',
}

export default function ApplicantsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    fetch(`${API}/applications/received?jobId=${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) { router.push('/dashboard'); return }
        setApplications(await res.json())
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [jobId, router])

  async function updateStatus(appId: string, status: string) {
    const token = localStorage.getItem('mc_token')!
    setUpdating(appId)
    try {
      const res = await fetch(`${API}/applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setApplications((apps) =>
          apps.map((a) => (a.id === appId ? { ...a, status } : a))
        )
      }
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950 text-white flex items-center justify-center">
        <p className="text-metal-400">A carregar...</p>
      </div>
    )
  }

  const shortlisted = applications.filter((a) => a.status === 'shortlisted')

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-metal-500 hover:text-white">← Dashboard</Link>
            <h1 className="mt-1 text-2xl font-bold">Candidaturas</h1>
            <p className="text-metal-400 text-sm">{applications.length} candidatos</p>
          </div>
          {shortlisted.length > 0 && (
            <Link
              href={`/jobs/${jobId}/invite`}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Criar contrato ({shortlisted.length} selecionado{shortlisted.length > 1 ? 's' : ''})
            </Link>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-metal-700 bg-metal-900 p-10 text-center">
            <p className="text-metal-400">Ainda não há candidaturas para esta vaga.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="rounded-xl border border-metal-700 bg-metal-900 p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-metal-700 flex items-center justify-center text-lg font-bold text-metal-400">
                    {app.worker.fullName[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/workers/${app.worker.slug}`}
                          className="font-semibold hover:text-orange-400"
                          target="_blank"
                        >
                          {app.worker.fullName}
                        </Link>
                        <p className="text-sm text-metal-400">
                          {SPECIALTY_LABELS[app.worker.primarySpecialty] ?? app.worker.primarySpecialty}
                          {app.worker.yearsExperience != null && ` · ${app.worker.yearsExperience} anos`}
                          {app.worker.locationCity && ` · 📍 ${app.worker.locationCity}`}
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <ScoreBadge score={app.worker.scoreAvg ?? null} reviewCount={app.worker.reviewCount} size="sm" />
                          {app.proposedRate && (
                            <span className="text-sm font-semibold text-orange-400">
                              Propõe {app.proposedRate}€/h
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status] ?? ''}`}>
                        {STATUS_LABELS[app.status] ?? app.status}
                      </span>
                    </div>

                    {/* Certifications */}
                    {app.worker.certifications.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {app.worker.certifications.map((cert, i) => (
                          <span key={i} className="rounded bg-metal-700 px-1.5 py-0.5 text-xs text-metal-300">
                            {cert.standard}
                            {cert.processCode && ` ${cert.processCode}`}
                            {cert.isVerified && ' ✓'}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Cover note */}
                    {app.coverNote && (
                      <div className="mt-3 rounded-lg bg-metal-800 p-3">
                        <p className="text-xs text-metal-400 mb-1">Nota do candidato:</p>
                        <p className="text-sm text-metal-300">&ldquo;{app.coverNote}&rdquo;</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <p className="text-xs text-metal-600 mr-auto">
                        {formatDate(app.appliedAt)}
                      </p>
                      {app.status !== 'rejected' && app.status !== 'shortlisted' && (
                        <button
                          onClick={() => updateStatus(app.id, 'shortlisted')}
                          disabled={updating === app.id}
                          className="rounded bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400 hover:bg-green-500 hover:text-white disabled:opacity-50 transition-colors"
                        >
                          Selecionar
                        </button>
                      )}
                      {app.status === 'shortlisted' && (
                        <Link
                          href={`/jobs/${jobId}/invite?applicationId=${app.id}`}
                          className="rounded bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500 hover:text-white transition-colors"
                        >
                          Criar contrato
                        </Link>
                      )}
                      {app.status !== 'rejected' && (
                        <button
                          onClick={() => updateStatus(app.id, 'rejected')}
                          disabled={updating === app.id}
                          className="rounded bg-metal-700 px-3 py-1 text-xs font-medium text-metal-400 hover:bg-red-900/50 hover:text-red-400 disabled:opacity-50 transition-colors"
                        >
                          Rejeitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
