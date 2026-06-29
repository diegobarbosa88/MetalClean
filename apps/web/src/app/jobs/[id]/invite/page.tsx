'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { formatDate } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface Applicant {
  id: string
  worker: { id: string; fullName: string; slug: string; primarySpecialty: string; scoreAvg?: number; reviewCount?: number }
  proposedRate?: number
  coverNote?: string
  appliedAt: string
}

export default function InviteMatchPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id as string
  const preselectedAppId = searchParams.get('applicationId')

  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [selectedAppId, setSelectedAppId] = useState(preselectedAppId ?? '')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    confirmedHourlyRate: '',
    workLocationCity: '',
    workLocationCountry: 'PT',
    startDate: '',
    estimatedDurationWeeks: '',
    housingIncluded: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    fetch(`${API}/applications/received?jobId=${jobId}&status=shortlisted`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) { router.push('/dashboard'); return }
        const data = await res.json()
        setApplicants(data)
        if (data.length === 1 && !selectedAppId) setSelectedAppId(data[0].id)
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [jobId, router, selectedAppId])

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  async function handleCreate() {
    if (!selectedAppId || !form.confirmedHourlyRate || !form.workLocationCity) {
      setError('Seleciona um candidato e preenche o valor/hora e localização.')
      return
    }

    const token = localStorage.getItem('mc_token')!
    setSubmitting(true)
    setError('')

    const selectedApplicant = applicants.find((a) => a.id === selectedAppId)
    if (!selectedApplicant) { setError('Seleciona um candidato.'); setSubmitting(false); return }

    try {
      const res = await fetch(`${API}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workerId: selectedApplicant.worker.id,
          jobId,
          applicationId: selectedAppId,
          confirmedHourlyRate: parseFloat(form.confirmedHourlyRate),
          workLocationCity: form.workLocationCity,
          workLocationCountry: form.workLocationCountry,
          startDate: form.startDate || undefined,
          housingIncluded: form.housingIncluded,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Erro ao criar convite')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Erro de rede. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950 text-white flex items-center justify-center">
        <p className="text-metal-400">A carregar...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-metal-500 hover:text-white">← Dashboard</Link>
          <h1 className="mt-2 text-2xl font-bold">Criar convite de contrato</h1>
          <p className="mt-1 text-sm text-metal-400">
            O trabalhador receberá um convite para aceitar os termos que definires abaixo.
          </p>
        </div>

        <div className="space-y-6">
          {/* Select applicant */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-metal-400">
              Candidato selecionado
            </h2>
            {applicants.length === 0 ? (
              <p className="text-sm text-metal-500">
                Sem candidatos em estado "selecionado".
                <Link href={`/jobs/${jobId}/applicants`} className="ml-1 text-orange-400 hover:underline">
                  Ver candidatos
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {applicants.map((app) => (
                  <label
                    key={app.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedAppId === app.id
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-metal-700 hover:border-metal-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="applicant"
                      checked={selectedAppId === app.id}
                      onChange={() => setSelectedAppId(app.id)}
                      className="accent-orange-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        <Link href={`/workers/${app.worker.slug}`} className="hover:text-orange-400" onClick={(e) => e.stopPropagation()}>
                          {app.worker.fullName}
                        </Link>
                      </p>
                      <p className="text-xs text-metal-500">
                        {app.worker.primarySpecialty.replace('_', ' ')}
                        {app.proposedRate && ` · Propõe ${app.proposedRate}€/h`}
                        {' · Candidatura '}{formatDate(app.appliedAt)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Contract terms */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Termos do Contrato</h2>

            <div>
              <label className="mb-1 block text-xs font-medium text-metal-400">Valor acordado €/h *</label>
              <input
                type="number"
                value={form.confirmedHourlyRate}
                onChange={(e) => update('confirmedHourlyRate', e.target.value)}
                placeholder="Ex: 22"
                step="0.5"
                min="1"
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-metal-400">Cidade *</label>
                <input
                  value={form.workLocationCity}
                  onChange={(e) => update('workLocationCity', e.target.value)}
                  placeholder="Ex: Sines"
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-metal-400">País</label>
                <input
                  value={form.workLocationCountry}
                  onChange={(e) => update('workLocationCountry', e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-metal-400">Data de início</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update('startDate', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-metal-400">Duração estimada (semanas)</label>
                <input
                  type="number"
                  value={form.estimatedDurationWeeks}
                  onChange={(e) => update('estimatedDurationWeeks', e.target.value)}
                  placeholder="Ex: 8"
                  min="1"
                  className="input"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.housingIncluded}
                onChange={(e) => update('housingIncluded', e.target.checked)}
                className="rounded"
              />
              <span className="text-metal-300">Alojamento incluído</span>
            </label>
          </section>

          <div className="rounded-lg border border-metal-700 bg-metal-800 p-3 text-xs text-metal-400">
            Estes termos serão apresentados ao trabalhador. Após aceitação, tornam-se o registo oficial
            do contrato e serão a base das avaliações mútuas.
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-metal-700 py-3 text-center text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleCreate}
              disabled={submitting || !selectedAppId}
              className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'A enviar...' : 'Enviar convite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
