'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

const WORKER_CRITERIA = [
  { key: 'scoreAttendance', label: 'Assiduidade e Pontualidade', description: 'Comparecimento e horários cumpridos' },
  { key: 'scoreTechnicalQuality', label: 'Qualidade Técnica', description: 'Qualidade dos passes, montagens e acabamentos' },
  { key: 'scoreSafetyCompliance', label: 'Normas de Segurança', description: 'Cumprimento dos requisitos de segurança e higiene' },
  { key: 'scoreAttitudeTeamwork', label: 'Postura e Trabalho em Equipa', description: 'Atitude profissional e cooperação' },
]

const COMPANY_CRITERIA = [
  { key: 'scorePaymentPunctuality', label: 'Pontualidade no Pagamento', description: 'Pagamentos realizados nas datas acordadas' },
  { key: 'scoreRateCompliance', label: 'Cumprimento do valor acordado', description: 'O valor/hora pago correspondeu ao contratado' },
  { key: 'scoreSafetyConditions', label: 'Condições de Segurança e Higiene', description: 'Equipamentos de proteção e condições no local' },
  { key: 'scoreHousingAllowances', label: 'Qualidade do Alojamento/Ajudas', description: 'Qualidade do alojamento e subsídios fornecidos' },
]

const SCORE_LABELS = ['', 'Muito mau', 'Mau', 'Razoável', 'Bom', 'Excelente']

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [reviewerType, setReviewerType] = useState<'worker' | 'company' | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [writtenReview, setWrittenReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { router.push('/login'); return }
        const me = await res.json()
        setReviewerType(me.accountType === 'worker' ? 'worker' : 'company')
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const criteria = reviewerType === 'worker' ? COMPANY_CRITERIA : WORKER_CRITERIA

  function setScore(key: string, value: number) {
    setScores((s) => ({ ...s, [key]: value }))
  }

  function allScoresSet() {
    return criteria.every((c) => scores[c.key] != null && scores[c.key] > 0)
  }

  async function handleSubmit() {
    if (!allScoresSet()) {
      setError('Avalia todos os critérios antes de submeter.')
      return
    }

    const token = localStorage.getItem('mc_token')!
    setSubmitting(true)
    setError('')

    const body = {
      matchId,
      ...scores,
      writtenReview: writtenReview || undefined,
    }

    try {
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Erro ao submeter avaliação')
        return
      }
      router.push('/dashboard?reviewed=1')
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
          <h1 className="text-2xl font-bold">
            {reviewerType === 'worker' ? 'Avaliar empresa' : 'Avaliar trabalhador'}
          </h1>
          <p className="mt-1 text-sm text-metal-400">
            A tua avaliação é independente e só se torna pública quando ambas as partes submeterem
            ou quando o prazo de 30 dias expirar.
          </p>
        </div>

        <div className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-6">
          {/* Criteria scoring */}
          {criteria.map((c) => (
            <div key={c.key}>
              <div className="mb-2">
                <p className="font-medium text-sm">{c.label}</p>
                <p className="text-xs text-metal-500">{c.description}</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScore(c.key, n)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      scores[c.key] === n
                        ? 'bg-orange-500 text-white'
                        : 'border border-metal-700 text-metal-400 hover:border-orange-500/50 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {scores[c.key] && (
                <p className="mt-1 text-right text-xs text-metal-500">
                  {SCORE_LABELS[scores[c.key]]}
                </p>
              )}
            </div>
          ))}

          {/* Average score preview */}
          {allScoresSet() && (
            <div className="rounded-lg bg-metal-800 p-3 text-center">
              <p className="text-xs text-metal-400 mb-0.5">Pontuação média</p>
              <p className="text-2xl font-bold text-orange-400">
                {(Object.values(scores).reduce((a, b) => a + b, 0) / criteria.length).toFixed(1)}/5
              </p>
            </div>
          )}

          {/* Written review */}
          <div>
            <label className="mb-1 block text-xs font-medium text-metal-400">
              Comentário escrito (opcional, máx. 1000 caracteres)
            </label>
            <textarea
              value={writtenReview}
              onChange={(e) => setWrittenReview(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={
                reviewerType === 'worker'
                  ? 'Descreve a tua experiência de trabalho com esta empresa...'
                  : 'Descreve o trabalho e a atitude deste profissional...'
              }
              className="w-full rounded-lg border border-metal-700 bg-metal-800 p-3 text-sm text-white placeholder-metal-500 focus:border-orange-500 focus:outline-none resize-none"
            />
            <p className="mt-1 text-right text-xs text-metal-600">{writtenReview.length}/1000</p>
          </div>

          <div className="rounded-lg bg-metal-800 p-3 text-xs text-metal-400">
            As avaliações são verificadas contra o contrato. Ao submeter, confirmas que esta avaliação
            reflete a tua experiência genuína durante este trabalho.
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-metal-700 py-3 text-center text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white transition-colors"
            >
              Adiar
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || !allScoresSet()}
              className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'A submeter...' : 'Submeter avaliação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
