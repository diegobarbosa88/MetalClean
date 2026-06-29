'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export function ApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApply() {
    const token = localStorage.getItem('mc_token')
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jobId,
          coverNote: note || undefined,
          proposedRate: proposedRate ? parseFloat(proposedRate) : undefined,
        }),
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Erro ao submeter candidatura')
        return
      }
      setOpen(false)
      router.push('/dashboard')
    } catch {
      setError('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Candidatar-me a esta vaga
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-metal-700 bg-metal-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Submeter Candidatura</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-metal-400">
                  Nota de apresentação (opcional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Apresenta-te brevemente e indica a tua disponibilidade..."
                  className="w-full rounded-lg border border-metal-700 bg-metal-800 p-3 text-sm text-white placeholder-metal-500 focus:border-orange-500 focus:outline-none resize-none"
                />
                <p className="mt-1 text-right text-xs text-metal-600">{note.length}/500</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-metal-400">
                  Valor proposto €/h (opcional)
                </label>
                <input
                  type="number"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="Ex: 22"
                  step="0.5"
                  min="1"
                  className="w-full rounded-lg border border-metal-700 bg-metal-800 p-3 text-sm text-white placeholder-metal-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-metal-700 py-2.5 text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'A enviar...' : 'Confirmar candidatura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
