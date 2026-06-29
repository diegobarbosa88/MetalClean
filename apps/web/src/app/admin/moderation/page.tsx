'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

type ReportStatus = 'pending' | 'under_review' | 'resolved_kept' | 'resolved_removed' | 'escalated'

interface Reporter {
  id: string; email: string; accountType: string
}

interface Report {
  id: string; targetType: string; targetId: string; reason: string
  description?: string; status: ReportStatus; createdAt: string
  reporter: Reporter; resolutionNotes?: string
}

interface Target {
  id: string; writtenReview?: string; contentText?: string
  status?: string; overallScore?: number; isVisible?: boolean
}

interface DetailModal {
  report: Report; target?: Target
}

const REASON_LABELS: Record<string, string> = {
  defamation: 'Difamação',
  false_information: 'Informação Falsa',
  harassment: 'Assédio',
  spam: 'Spam',
  inappropriate_content: 'Conteúdo Inapropriado',
  other: 'Outro',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  under_review: 'text-blue-400 bg-blue-400/10',
  resolved_kept: 'text-green-400 bg-green-400/10',
  resolved_removed: 'text-red-400 bg-red-400/10',
  escalated: 'text-orange-400 bg-orange-400/10',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', under_review: 'Em Revisão',
  resolved_kept: 'Mantido', resolved_removed: 'Removido', escalated: 'Escalado',
}

export default function AdminModerationPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState<ReportStatus>('pending')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<DetailModal | null>(null)
  const [resolving, setResolving] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('mc_token')
    if (!t) { router.push('/login'); return }
    setToken(t)
  }, [router])

  const loadReports = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const res = await fetch(`${API}/admin/moderation?status=${filter}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 403) { router.push('/'); return }
    if (res.ok) {
      const data = await res.json()
      setReports(data.data ?? [])
    }
    setLoading(false)
  }, [token, filter, router])

  useEffect(() => { loadReports() }, [loadReports])

  const openDetail = async (report: Report) => {
    const res = await fetch(`${API}/admin/moderation/${report.id}`, {
      headers: { Authorization: `Bearer ${token!}` },
    })
    if (res.ok) {
      const data = await res.json()
      setModal(data)
      setNotes('')
    }
  }

  const resolve = async (action: string) => {
    if (!modal || !token) return
    setResolving(true)
    const res = await fetch(`${API}/admin/moderation/${modal.report.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, resolutionNotes: notes }),
    })
    if (res.ok) {
      setModal(null)
      loadReports()
    } else {
      const err = await res.json()
      alert(err.message)
    }
    setResolving(false)
  }

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Moderação de Conteúdo</h1>
          <p className="mt-1 text-sm text-metal-500">Fila de denúncias da plataforma</p>
        </div>

        {/* Filtros de estado */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(['pending', 'under_review', 'resolved_kept', 'resolved_removed', 'escalated'] as ReportStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === s ? 'bg-orange-500 text-white' : 'bg-metal-800 text-metal-300 hover:bg-metal-700'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-metal-500 py-12">A carregar…</p>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-metal-800 bg-metal-900 py-12 text-center text-metal-500">
            <p className="text-lg">Sem denúncias {STATUS_LABELS[filter].toLowerCase()}s</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => openDetail(report)}
                className="w-full rounded-xl border border-metal-800 bg-metal-900 p-5 text-left transition-colors hover:border-metal-700 hover:bg-metal-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                      <span className="rounded bg-metal-800 px-2 py-0.5 text-xs text-metal-400 capitalize">
                        {report.targetType}
                      </span>
                      <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                        {REASON_LABELS[report.reason]}
                      </span>
                    </div>
                    {report.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-metal-300">{report.description}</p>
                    )}
                    <p className="mt-2 text-xs text-metal-600">
                      Denunciado por {report.reporter.email} ({report.reporter.accountType}) ·{' '}
                      {new Date(report.createdAt).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-orange-400">Ver →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhe */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-metal-700 bg-metal-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-semibold">Denúncia #{modal.report.id.slice(0, 8)}</h3>
              <button onClick={() => setModal(null)} className="text-metal-500 hover:text-white">✕</button>
            </div>

            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-metal-500">Tipo</span>
                <span className="capitalize text-white">{modal.report.targetType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-metal-500">Motivo</span>
                <span className="text-red-400">{REASON_LABELS[modal.report.reason]}</span>
              </div>
              {modal.report.description && (
                <div>
                  <span className="text-metal-500">Descrição</span>
                  <p className="mt-1 rounded bg-metal-800 p-3 text-metal-300">{modal.report.description}</p>
                </div>
              )}
            </div>

            {/* Conteúdo denunciado */}
            {modal.target && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-metal-500">Conteúdo Denunciado</p>
                <div className="rounded-lg border border-metal-700 bg-metal-800 p-3 text-sm text-metal-300">
                  {modal.target.writtenReview && <p>"{modal.target.writtenReview}"</p>}
                  {modal.target.contentText && <p>{modal.target.contentText}</p>}
                  {modal.target.overallScore && (
                    <p className="text-metal-500">Score: {modal.target.overallScore}/5</p>
                  )}
                  {modal.report.targetType === 'review' && (
                    <p className="mt-1 text-xs text-metal-600">
                      Estado: {modal.target.status} · Visível: {modal.target.isVisible ? 'Sim' : 'Não'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notas de resolução */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-metal-400">Notas de Resolução</label>
              <textarea
                className="input h-20 resize-none text-sm"
                placeholder="Descreve a decisão de moderação…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => resolve('resolved_kept')}
                disabled={resolving}
                className="rounded-lg bg-green-500/10 py-2 text-sm font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50"
              >
                ✓ Manter Conteúdo
              </button>
              <button
                onClick={() => resolve('resolved_removed')}
                disabled={resolving}
                className="rounded-lg bg-red-500/10 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
              >
                ✕ Remover Conteúdo
              </button>
              <button
                onClick={() => resolve('under_review')}
                disabled={resolving}
                className="rounded-lg bg-blue-500/10 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
              >
                Em Revisão
              </button>
              <button
                onClick={() => resolve('escalated')}
                disabled={resolving}
                className="rounded-lg bg-orange-500/10 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-50"
              >
                Escalar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
