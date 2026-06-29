'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

const SPECIALTIES = [
  { value: '', label: 'Todas as especialidades' },
  { value: 'tig_welder', label: 'Soldador TIG' },
  { value: 'mig_mag_welder', label: 'Soldador MIG/MAG' },
  { value: 'electrode_welder', label: 'Soldador Eléctrodo' },
  { value: 'boilermaker', label: 'Caldeireiro' },
  { value: 'pipe_fitter', label: 'Montador de Tubagens' },
  { value: 'structural_fitter', label: 'Montador de Estruturas' },
  { value: 'cnc_operator', label: 'Operador CNC' },
]

interface WorkerHit {
  id: string; slug: string; fullName: string; headline?: string; primarySpecialty: string
  locationCity?: string; locationCountry: string; scoreAvg?: number; reviewCount: number
  availabilityStatus: string; avatarUrl?: string; certificationStandards: string[]
}

interface JobHit {
  id: string; title: string; workLocationCity: string; workLocationCountry: string
  hourlyRateMin: number; hourlyRateMax?: number; housingIncluded: boolean
  companyName: string; companyScoreAvg?: number; isFeatured: boolean; publishedAt: string
}

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Disponível', working: 'A Trabalhar', not_looking: 'Não Procura'
}
const AVAILABILITY_COLORS: Record<string, string> = {
  available: 'text-green-400', working: 'text-yellow-400', not_looking: 'text-metal-500'
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [type, setType] = useState<'all' | 'workers' | 'jobs'>(
    (searchParams.get('type') as 'all' | 'workers' | 'jobs') ?? 'all'
  )
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') ?? '')
  const [country, setCountry] = useState(searchParams.get('country') ?? '')
  const [minRate, setMinRate] = useState(searchParams.get('minRate') ?? '')
  const [housing, setHousing] = useState(searchParams.get('housing') ?? '')

  const [workers, setWorkers] = useState<WorkerHit[]>([])
  const [jobs, setJobs] = useState<JobHit[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ q, type, pageSize: '20' })
    if (specialty) params.set('specialty', specialty)
    if (country) params.set('country', country)
    if (minRate) params.set('minRate', minRate)
    if (housing) params.set('housing', housing)

    const res = await fetch(`${API}/search?${params}`)
    if (res.ok) {
      const data = await res.json()
      setWorkers((data.workers?.hits as WorkerHit[]) ?? [])
      setJobs((data.jobs?.hits as JobHit[]) ?? [])
    }
    setLoading(false)
    setSearched(true)

    // Atualizar URL
    const url = new URL(window.location.href)
    params.forEach((v, k) => url.searchParams.set(k, v))
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [q, type, specialty, country, minRate, housing, router])

  useEffect(() => {
    if (searchParams.get('q') || searchParams.get('specialty')) {
      search()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated={!!localStorage?.getItem?.('mc_token')} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Barra de pesquisa */}
        <div className="mb-8 rounded-2xl border border-metal-800 bg-metal-900 p-6">
          <h1 className="mb-4 text-2xl font-bold">Pesquisa</h1>
          <div className="flex gap-3">
            <input
              type="text"
              className="input flex-1"
              placeholder="Pesquisar profissionais, vagas, empresas…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
            <button
              onClick={search}
              disabled={loading}
              className="rounded-lg bg-orange-500 px-6 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '…' : 'Pesquisar'}
            </button>
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap gap-3">
            {/* Tipo */}
            <div className="flex rounded-lg border border-metal-700 overflow-hidden text-sm">
              {(['all', 'workers', 'jobs'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-2 transition-colors ${type === t ? 'bg-orange-500 text-white' : 'bg-metal-800 text-metal-300 hover:bg-metal-700'}`}
                >
                  {t === 'all' ? 'Tudo' : t === 'workers' ? 'Profissionais' : 'Vagas'}
                </button>
              ))}
            </div>

            <select
              className="input w-auto text-sm"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <input
              className="input w-32 text-sm"
              placeholder="País (PT, ES…)"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            />

            {(type === 'jobs' || type === 'all') && (
              <input
                className="input w-32 text-sm"
                placeholder="Mín. €/hora"
                type="number"
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
              />
            )}

            {(type === 'jobs' || type === 'all') && (
              <select className="input w-auto text-sm" value={housing} onChange={(e) => setHousing(e.target.value)}>
                <option value="">Alojamento</option>
                <option value="true">Com alojamento</option>
                <option value="false">Sem alojamento</option>
              </select>
            )}
          </div>
        </div>

        {/* Resultados */}
        {!searched && !loading && (
          <p className="text-center text-metal-500">Introduz uma pesquisa para ver resultados.</p>
        )}

        {searched && !loading && workers.length === 0 && jobs.length === 0 && (
          <p className="text-center text-metal-500">Nenhum resultado encontrado. Tenta ajustar os filtros.</p>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Profissionais */}
          {(type === 'all' || type === 'workers') && workers.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-metal-300">
                Profissionais <span className="ml-1 text-sm text-metal-500">({workers.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {workers.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workers/${w.slug}`}
                    className="rounded-xl border border-metal-800 bg-metal-900 p-4 transition-colors hover:border-metal-700 hover:bg-metal-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-metal-700 flex items-center justify-center text-lg font-bold text-metal-300">
                        {w.avatarUrl ? (
                          <img src={w.avatarUrl} alt={w.fullName} className="h-full w-full object-cover" />
                        ) : (
                          w.fullName[0]
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between">
                          <p className="font-semibold text-white">{w.fullName}</p>
                          {w.scoreAvg && (
                            <span className="ml-2 text-sm font-bold text-orange-400">
                              ★ {Number(w.scoreAvg).toFixed(1)} ({w.reviewCount})
                            </span>
                          )}
                        </div>
                        {w.headline && <p className="mt-0.5 truncate text-sm text-metal-400">{w.headline}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className={AVAILABILITY_COLORS[w.availabilityStatus]}>
                            {AVAILABILITY_LABELS[w.availabilityStatus]}
                          </span>
                          {w.locationCity && (
                            <span className="text-metal-500">{w.locationCity}, {w.locationCountry}</span>
                          )}
                          {w.certificationStandards.slice(0, 2).map((s) => (
                            <span key={s} className="rounded bg-metal-800 px-1.5 py-0.5 font-mono text-orange-400">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {type === 'all' && (
                <button
                  onClick={() => setType('workers')}
                  className="mt-3 text-sm text-orange-400 hover:text-orange-300"
                >
                  Ver todos os profissionais →
                </button>
              )}
            </div>
          )}

          {/* Vagas */}
          {(type === 'all' || type === 'jobs') && jobs.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-metal-300">
                Vagas <span className="ml-1 text-sm text-metal-500">({jobs.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="rounded-xl border border-metal-800 bg-metal-900 p-4 transition-colors hover:border-metal-700 hover:bg-metal-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {job.isFeatured && (
                            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-medium text-orange-400">
                              ★ Destaque
                            </span>
                          )}
                          <p className="font-semibold text-white">{job.title}</p>
                        </div>
                        <p className="mt-0.5 text-sm text-metal-400">{job.companyName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-metal-500">
                          <span>{job.workLocationCity}, {job.workLocationCountry}</span>
                          {job.housingIncluded && <span className="text-green-400">🏠 Alojamento</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-orange-400">
                          {job.hourlyRateMin}€{job.hourlyRateMax ? `–${job.hourlyRateMax}€` : '+'}/h
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {type === 'all' && (
                <button
                  onClick={() => setType('jobs')}
                  className="mt-3 text-sm text-orange-400 hover:text-orange-300"
                >
                  Ver todas as vagas →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
