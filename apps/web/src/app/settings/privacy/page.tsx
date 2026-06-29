'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface GdprRequest {
  id: string; requestType: string; status: string; createdAt: string; processedAt?: string
}

export default function PrivacySettingsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [requests, setRequests] = useState<GdprRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [exportResult, setExportResult] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('mc_token')
    if (!t) { router.push('/login'); return }
    setToken(t)

    fetch(`${API}/gdpr/requests`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then(setRequests)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [router])

  const requestExport = async () => {
    if (!token) return
    setExportLoading(true)
    const res = await fetch(`${API}/gdpr/export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) {
      setExportResult(data.data)
      // Trigger download
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `metalclean-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      // Reload requests
      const updated = await fetch(`${API}/gdpr/requests`, { headers: { Authorization: `Bearer ${token}` } })
      setRequests(await updated.json())
    } else {
      alert(data.message ?? 'Erro ao exportar dados.')
    }
    setExportLoading(false)
  }

  const requestDeletion = async () => {
    if (!token) return
    setDeleteLoading(true)
    const res = await fetch(`${API}/gdpr/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deleteReason }),
    })
    const data = await res.json()
    if (res.ok) {
      alert('Pedido de eliminação recebido. A tua conta foi desativada.')
      localStorage.removeItem('mc_token')
      router.push('/')
    } else {
      alert(data.message ?? 'Erro ao processar pedido.')
    }
    setDeleteLoading(false)
  }

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', processing: 'A Processar', completed: 'Concluído', cancelled: 'Cancelado'
  }

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">Privacidade e Dados</h1>
        <p className="mb-10 text-sm text-metal-500">
          Ao abrigo do RGPD (Regulamento Geral de Proteção de Dados), tens direito a aceder, exportar e eliminar os teus dados pessoais.
        </p>

        {/* Exportação de dados */}
        <div className="mb-6 rounded-xl border border-metal-800 bg-metal-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Exportar os Meus Dados</h2>
              <p className="mt-1 text-sm text-metal-400">
                Obtém uma cópia completa de todos os dados que a MetalClean tem sobre ti: perfil, avaliações, mensagens, candidaturas e mais. O ficheiro é gerado no formato JSON.
              </p>
            </div>
            <button
              onClick={requestExport}
              disabled={exportLoading}
              className="flex-shrink-0 rounded-lg bg-metal-700 px-4 py-2 text-sm font-medium text-white hover:bg-metal-600 disabled:opacity-50"
            >
              {exportLoading ? 'A gerar…' : '⬇ Exportar'}
            </button>
          </div>
          {exportResult && (
            <div className="mt-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
              Ficheiro descarregado com sucesso.
            </div>
          )}
        </div>

        {/* Histórico de pedidos */}
        {!loading && requests.length > 0 && (
          <div className="mb-6 rounded-xl border border-metal-800 bg-metal-900 p-6">
            <h2 className="mb-4 font-semibold">Histórico de Pedidos</h2>
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-metal-800 px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium capitalize">{r.requestType === 'export' ? 'Exportação' : 'Eliminação'}</span>
                    <span className="ml-2 text-metal-500">
                      {new Date(r.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    r.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    r.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-metal-700 text-metal-400'
                  }`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eliminação de conta */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="font-semibold text-red-400">Eliminar Conta</h2>
          <p className="mt-1 text-sm text-metal-400">
            A eliminação é irreversível. A tua conta será desativada imediatamente e os teus dados pessoais (nome, email, foto) serão anonimizados no prazo de 30 dias. As avaliações e scores são preservados de forma anonimizada (interesse legítimo de outros utilizadores).
          </p>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Solicitar Eliminação de Conta
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                ⚠ Esta ação não pode ser desfeita. Tens a certeza?
              </div>
              <textarea
                className="input h-20 resize-none text-sm"
                placeholder="Motivo da eliminação (opcional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={requestDeletion}
                  disabled={deleteLoading}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deleteLoading ? 'A processar…' : 'Confirmar Eliminação'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="rounded-lg border border-metal-700 px-4 py-2 text-sm text-metal-300 hover:bg-metal-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Informação legal */}
        <div className="mt-8 rounded-xl border border-metal-800 bg-metal-900 p-5 text-xs text-metal-500 space-y-2">
          <p><strong className="text-metal-400">Responsável pelo Tratamento:</strong> MetalClean Lda., registada na CNPD.</p>
          <p><strong className="text-metal-400">Base Legal:</strong> Contrato (art. 6.1.b RGPD) e Interesse Legítimo para scores agregados (art. 6.1.f RGPD).</p>
          <p><strong className="text-metal-400">Prazo de Conservação:</strong> Conta ativa + 30 dias após eliminação para anonimização.</p>
          <p><strong className="text-metal-400">Direitos:</strong> Acesso, retificação, portabilidade, oposição, limitação e eliminação — contacta dpo@metalclean.pt</p>
        </div>
      </div>
    </div>
  )
}
