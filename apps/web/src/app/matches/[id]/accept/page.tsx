'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { formatDate, formatRate } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface MatchDetail {
  id: string
  confirmedHourlyRate: number
  currency: string
  workLocationCity: string
  workLocationCountry: string
  startDate?: string
  estimatedDurationWeeks?: number
  housingIncluded: boolean
  company: { companyName: string; slug: string; scoreAvg?: number; reviewCount?: number; taxIdVerified?: boolean }
  job?: { title: string; id: string }
}

export default function AcceptMatchPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    fetch(`${API}/matches/${matchId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { router.push('/dashboard'); return }
        setMatch(await res.json())
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [matchId, router])

  async function accept() {
    const token = localStorage.getItem('mc_token')!
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/matches/${matchId}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Erro ao aceitar contrato')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Erro de rede. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  async function decline() {
    const token = localStorage.getItem('mc_token')!
    setSubmitting(true)
    try {
      await fetch(`${API}/matches/${matchId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'Recusado pelo trabalhador' }),
      })
      router.push('/dashboard')
    } catch {
      setError('Erro de rede.')
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

  if (!match) return null

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Convite de contrato</h1>
          <p className="mt-1 text-metal-400 text-sm">
            <Link href={`/companies/${match.company.slug}`} className="hover:text-white">
              {match.company.companyName}
            </Link>
            {' '}enviou-te um convite de trabalho.
          </p>
        </div>

        {/* Contract terms */}
        <div className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Termos do Contrato</h2>

          <div className="grid grid-cols-2 gap-4">
            <Term label="Empresa">
              <Link href={`/companies/${match.company.slug}`} className="font-medium hover:text-orange-400">
                {match.company.companyName}
              </Link>
              {match.company.taxIdVerified && (
                <span className="ml-1 text-xs text-green-400">✓ NIF</span>
              )}
            </Term>
            {match.job && (
              <Term label="Vaga">
                <Link href={`/jobs/${match.job.id}`} className="hover:text-orange-400">
                  {match.job.title}
                </Link>
              </Term>
            )}
            <Term label="Valor acordado">
              <span className="text-xl font-bold text-orange-400">
                {formatRate(match.confirmedHourlyRate, undefined, match.currency)}
              </span>
            </Term>
            <Term label="Localização">
              {match.workLocationCity}, {match.workLocationCountry}
            </Term>
            {match.startDate && (
              <Term label="Início">
                {formatDate(match.startDate)}
              </Term>
            )}
            {match.estimatedDurationWeeks && (
              <Term label="Duração estimada">
                {match.estimatedDurationWeeks} semanas
              </Term>
            )}
            <Term label="Alojamento">
              {match.housingIncluded ? (
                <span className="text-green-400">✓ Incluído</span>
              ) : (
                <span className="text-metal-500">Não incluído</span>
              )}
            </Term>
          </div>
        </div>

        <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 mb-6 text-sm text-amber-300">
          <strong>Atenção:</strong> Ao aceitar este contrato, os termos acima tornam-se vinculativos.
          Ambas as partes poderão avaliar-se mutuamente após a conclusão do trabalho.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={decline}
            disabled={submitting}
            className="flex-1 rounded-lg border border-metal-700 py-3 text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={accept}
            disabled={submitting}
            className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'A processar...' : '✓ Aceitar contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-metal-500 mb-0.5">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
