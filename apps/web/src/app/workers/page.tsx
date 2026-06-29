import Link from 'next/link'
import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { ScoreBadge } from '@/components/ui/score-badge'
import { SPECIALTY_LABELS } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Profissionais — MetalClean',
  description: 'Soldadores TIG, MIG/MAG, caldeireiros, tubistas e outros profissionais da metalomecânica. Perfis verificados com histórico real de trabalho.',
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

async function getWorkers(searchParams: Record<string, string>) {
  const params = new URLSearchParams()
  if (searchParams.specialty) params.set('specialty', searchParams.specialty)
  if (searchParams.country) params.set('country', searchParams.country)
  if (searchParams.available) params.set('availability', 'available')
  if (searchParams.q) params.set('q', searchParams.q)

  const res = await fetch(`${API}/workers?${params.toString()}`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : (json.data ?? [])
}

const SPECIALTY_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'tig_welder', label: 'TIG' },
  { value: 'mig_mag_welder', label: 'MIG/MAG' },
  { value: 'boilermaker', label: 'Caldeireiro' },
  { value: 'pipe_fitter', label: 'Tubista' },
  { value: 'structural_fitter', label: 'Serralheiro' },
  { value: 'cnc_operator', label: 'CNC' },
]

interface WorkerCard {
  id: string
  slug: string
  fullName: string
  primarySpecialty: string
  yearsExperience?: number
  locationCity?: string
  locationCountry?: string
  scoreAvg?: number
  reviewCount?: number
  availabilityStatus: string
  desiredHourlyRateMin?: number
  desiredHourlyRateMax?: number
  certifications: { standard: string; processCode?: string; isVerified: boolean }[]
}

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const workers: WorkerCard[] = await getWorkers(searchParams)
  const activeSpecialty = searchParams.specialty ?? ''

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <p className="mt-1 text-metal-400">
            {workers.length} {workers.length === 1 ? 'profissional disponível' : 'profissionais encontrados'}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {SPECIALTY_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/workers?specialty=${f.value}` : '/workers'}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSpecialty === f.value
                  ? 'bg-orange-500 text-white'
                  : 'border border-metal-700 text-metal-400 hover:border-metal-500 hover:text-white'
              }`}
            >
              {f.label}
            </Link>
          ))}
          <Link
            href={searchParams.available ? '/workers' : '/workers?available=1'}
            className={`ml-auto rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              searchParams.available
                ? 'bg-green-600 text-white'
                : 'border border-metal-700 text-metal-400 hover:border-metal-500 hover:text-white'
            }`}
          >
            Disponíveis
          </Link>
        </div>

        {/* Workers grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workers.length === 0 ? (
            <div className="col-span-full rounded-xl border border-metal-700 bg-metal-900 p-10 text-center">
              <p className="text-metal-400">Nenhum profissional encontrado.</p>
              <Link href="/workers" className="mt-3 inline-block text-sm text-orange-400 hover:underline">
                Ver todos
              </Link>
            </div>
          ) : (
            workers.map((worker) => (
              <Link
                key={worker.id}
                href={`/workers/${worker.slug}`}
                className="group rounded-xl border border-metal-700 bg-metal-900 p-5 transition-all hover:border-orange-500/50 hover:bg-metal-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-metal-700 flex items-center justify-center text-xl font-bold text-metal-400">
                    {worker.fullName[0]}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    worker.availabilityStatus === 'available'
                      ? 'bg-green-400/10 text-green-400'
                      : worker.availabilityStatus === 'working'
                      ? 'bg-yellow-400/10 text-yellow-400'
                      : 'bg-metal-700 text-metal-500'
                  }`}>
                    {worker.availabilityStatus === 'available' ? 'Disponível'
                      : worker.availabilityStatus === 'working' ? 'Em projeto'
                      : 'Indisponível'}
                  </span>
                </div>

                <h3 className="font-semibold group-hover:text-orange-400">{worker.fullName}</h3>
                <p className="text-sm text-metal-400">
                  {SPECIALTY_LABELS[worker.primarySpecialty] ?? worker.primarySpecialty}
                  {worker.yearsExperience != null && ` · ${worker.yearsExperience} anos`}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <ScoreBadge score={worker.scoreAvg ?? null} reviewCount={worker.reviewCount} size="sm" />
                  {worker.locationCity && (
                    <span className="text-xs text-metal-500">📍 {worker.locationCity}</span>
                  )}
                </div>

                {/* Active certs */}
                {worker.certifications.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {worker.certifications.slice(0, 3).map((cert, i) => (
                      <span key={i} className="rounded bg-metal-700 px-1.5 py-0.5 text-xs text-metal-300">
                        {cert.standard}
                        {cert.isVerified && ' ✓'}
                      </span>
                    ))}
                  </div>
                )}

                {worker.desiredHourlyRateMin && (
                  <p className="mt-3 text-sm font-semibold text-orange-400">
                    {worker.desiredHourlyRateMin}€{worker.desiredHourlyRateMax ? `–${worker.desiredHourlyRateMax}€` : '+'}/h
                  </p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
