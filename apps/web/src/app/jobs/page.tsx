import Link from 'next/link'

interface JobCardProps {
  title: string
  company: string
  companyScore: number
  location: string
  rateMin: number
  rateMax?: number
  housing: boolean
  specialty: string
  duration?: string
  publishedAt: string
}

function JobCard({
  title, company, companyScore, location, rateMin, rateMax,
  housing, specialty, duration, publishedAt,
}: JobCardProps) {
  return (
    <article className="group rounded-xl border border-metal-700 bg-metal-900 p-5 transition-all hover:border-orange-500/50 hover:bg-metal-800">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-metal-700 px-2 py-0.5 text-xs font-medium text-metal-300">
              {specialty}
            </span>
            {housing && (
              <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
                Alojamento
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white group-hover:text-orange-400">{title}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-metal-400">
            <span>{company}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <span className="text-yellow-400">★</span>
              <span>{companyScore.toFixed(1)}</span>
            </span>
            <span>·</span>
            <span>{location}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-orange-400">
            {rateMin}€{rateMax ? `–${rateMax}€` : ''}/h
          </p>
          {duration && <p className="text-xs text-metal-500">{duration}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-metal-600">{publishedAt}</span>
        <Link
          href="/jobs/1"
          className="rounded-md bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 ring-1 ring-orange-500/20 transition-colors hover:bg-orange-500 hover:text-white"
        >
          Ver oferta
        </Link>
      </div>
    </article>
  )
}

export default function JobsPage() {
  // Static placeholder data — will be replaced by API fetch
  const jobs: JobCardProps[] = [
    {
      title: 'Soldador TIG — Tubagens Inox (P1/P8)',
      company: 'INOXFER',
      companyScore: 4.7,
      location: 'Sines, PT',
      rateMin: 22,
      rateMax: 25,
      housing: true,
      specialty: 'TIG',
      duration: '6 meses',
      publishedAt: 'Há 2 horas',
    },
    {
      title: 'Caldeireiro — Construção de Reservatórios',
      company: 'Setúbal Steel',
      companyScore: 4.2,
      location: 'Setúbal, PT',
      rateMin: 18,
      housing: false,
      specialty: 'Caldeireiro',
      duration: '3 meses',
      publishedAt: 'Há 5 horas',
    },
    {
      title: 'Tubista — Plataforma Offshore',
      company: 'NorthSea Works',
      companyScore: 4.9,
      location: 'Aberdeen, UK',
      rateMin: 35,
      rateMax: 42,
      housing: true,
      specialty: 'Tubista',
      duration: '4 semanas rotação',
      publishedAt: 'Ontem',
    },
  ]

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-metal-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Metal<span className="text-orange-500">Clean</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-metal-300 hover:text-white">Entrar</Link>
            <Link href="/register" className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600">
              Registar
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ofertas de Trabalho</h1>
          <p className="mt-1 text-metal-400">{jobs.length} vagas publicadas · Valor/hora explícito em todas as ofertas</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          {['Todos', 'TIG', 'MIG/MAG', 'Caldeireiro', 'Tubista'].map((f) => (
            <button
              key={f}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                f === 'Todos'
                  ? 'bg-orange-500 text-white'
                  : 'border border-metal-700 text-metal-400 hover:border-metal-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-metal-400">Min. €/h:</label>
            <input
              type="number"
              placeholder="0"
              className="w-20 rounded-lg border border-metal-700 bg-metal-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
        </div>

        {/* Job list */}
        <div className="space-y-3">
          {jobs.map((job, i) => <JobCard key={i} {...job} />)}
        </div>
      </div>
    </div>
  )
}
