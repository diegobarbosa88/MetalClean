'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export default function CompleteMatchPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [actualEndDate, setActualEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleComplete() {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/matches/${matchId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ actualEndDate: actualEndDate || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Erro ao concluir contrato')
        return
      }
      router.push(`/matches/${matchId}/review`)
    } catch {
      setError('Erro de rede. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Concluir trabalho</h1>
        <p className="text-metal-400 text-sm mb-8">
          Ao concluir este contrato, ambas as partes têm 30 dias para se avaliarem mutuamente.
        </p>

        <div className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-metal-400">
              Data de conclusão efetiva
            </label>
            <input
              type="date"
              value={actualEndDate}
              onChange={(e) => setActualEndDate(e.target.value)}
              className="w-full rounded-lg border border-metal-700 bg-metal-800 px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-metal-600">Deixa em branco para usar a data de hoje.</p>
          </div>

          <div className="rounded-lg bg-metal-800 p-3 text-xs text-metal-400">
            Após a conclusão, ambas as partes poderão avaliar-se de forma independente.
            As avaliações só se tornam públicas quando ambos submeterem ou quando o prazo de 30 dias expirar.
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-metal-700 py-3 text-center text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'A processar...' : 'Confirmar conclusão'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
