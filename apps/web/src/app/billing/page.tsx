'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

interface BillingStatus {
  plan: string
  isPremium: boolean
  expiresAt?: string
  features: string[]
}

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')

  useEffect(() => {
    const t = localStorage.getItem('mc_token')
    if (!t) { router.push('/login'); return }
    setToken(t)

    fetch(`${API}/billing/status`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [router])

  const checkout = async () => {
    if (!token) return
    setCheckoutLoading(true)
    const res = await fetch(`${API}/billing/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: `${APP_URL}/billing` }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      const err = await res.json()
      alert(err.message ?? 'Erro ao iniciar pagamento.')
    }
    setCheckoutLoading(false)
  }

  const openPortal = async () => {
    if (!token) return
    setPortalLoading(true)
    const res = await fetch(`${API}/billing/portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: `${APP_URL}/billing` }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    }
    setPortalLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950 text-white">
        <Navbar isAuthenticated />
        <div className="flex h-64 items-center justify-center text-metal-500">A carregar…</div>
      </div>
    )
  }

  const PREMIUM_FEATURES = [
    { icon: '⭐', title: 'Vagas em Destaque', desc: 'As tuas vagas aparecem no topo dos resultados de pesquisa.' },
    { icon: '📊', title: 'Analytics Avançados', desc: 'Funil completo de candidatos, taxas de conversão e métricas de vaga.' },
    { icon: '✅', title: 'Verificação NIF Prioritária', desc: 'O teu NIF é verificado em 24h, aumentando a confiança dos candidatos.' },
    { icon: '🔔', title: 'Alertas em Tempo Real', desc: 'Notificações instantâneas para novas candidaturas e mensagens.' },
    { icon: '💼', title: 'Candidatos Ilimitados', desc: 'Sem limite de candidatos por vaga no plano gratuito.' },
    { icon: '🎯', title: 'Suporte Prioritário', desc: 'Resposta garantida em 4 horas úteis.' },
  ]

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-4xl px-4 py-12">
        {success && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-green-400">
            Subscrição ativada com sucesso! Bem-vindo ao MetalClean Premium.
          </div>
        )}
        {cancelled && (
          <div className="mb-6 rounded-xl border border-metal-700 bg-metal-900 p-4 text-center text-metal-400">
            Checkout cancelado. Podes subscrever a qualquer momento.
          </div>
        )}

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold">
            Metal<span className="text-orange-500">Clean</span> Premium
          </h1>
          <p className="mt-3 text-lg text-metal-400">
            Para empresas que querem os melhores profissionais, mais rápido.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Plano Gratuito */}
          <div className="rounded-2xl border border-metal-700 bg-metal-900 p-8">
            <div className="mb-2 text-sm font-medium uppercase tracking-wider text-metal-500">Plano Atual</div>
            <h2 className="text-2xl font-bold">Gratuito</h2>
            <p className="mt-1 text-3xl font-bold">0€<span className="text-base font-normal text-metal-400">/mês</span></p>
            <ul className="mt-6 space-y-3 text-sm text-metal-400">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 3 vagas ativas</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Perfil de empresa público</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Candidaturas básicas</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Sistema de matches e avaliações</li>
              <li className="flex items-center gap-2"><span className="text-metal-600">✗</span> Vagas em destaque</li>
              <li className="flex items-center gap-2"><span className="text-metal-600">✗</span> Analytics avançados</li>
            </ul>
            {status?.isPremium === false && (
              <div className="mt-8 rounded-lg bg-metal-800 py-2 text-center text-sm text-metal-400">
                Plano atual
              </div>
            )}
          </div>

          {/* Plano Premium */}
          <div className="relative rounded-2xl border-2 border-orange-500 bg-metal-900 p-8 shadow-lg shadow-orange-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Recomendado
            </div>
            <div className="mb-2 text-sm font-medium uppercase tracking-wider text-orange-400">Premium</div>
            <h2 className="text-2xl font-bold">Pro</h2>
            <p className="mt-1 text-3xl font-bold">
              49€<span className="text-base font-normal text-metal-400">/mês</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-metal-300">
              <li className="flex items-center gap-2"><span className="text-orange-400">✓</span> Tudo do plano gratuito</li>
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.title} className="flex items-center gap-2">
                  <span className="text-orange-400">✓</span> {f.title}
                </li>
              ))}
            </ul>

            {status?.isPremium ? (
              <div className="mt-8 space-y-3">
                <div className="rounded-lg bg-green-500/10 py-2 text-center text-sm font-medium text-green-400">
                  Premium ativo {status.expiresAt && `até ${new Date(status.expiresAt).toLocaleDateString('pt-PT')}`}
                </div>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full rounded-lg border border-metal-600 py-2 text-sm text-metal-300 hover:bg-metal-800 disabled:opacity-50"
                >
                  {portalLoading ? 'A abrir…' : 'Gerir Subscrição'}
                </button>
              </div>
            ) : (
              <button
                onClick={checkout}
                disabled={checkoutLoading}
                className="mt-8 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {checkoutLoading ? 'A redirecionar…' : 'Assinar Premium →'}
              </button>
            )}
          </div>
        </div>

        {/* Features detalhadas */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold">O que está incluído</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-metal-800 bg-metal-900 p-5">
                <div className="mb-2 text-2xl">{f.icon}</div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-metal-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
