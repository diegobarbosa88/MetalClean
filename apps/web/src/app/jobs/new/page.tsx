'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

const SPECIALTY_OPTIONS = [
  { value: 'tig_welder', label: 'Soldador TIG' },
  { value: 'mig_mag_welder', label: 'Soldador MIG/MAG' },
  { value: 'electrode_welder', label: 'Soldador Elétrodo' },
  { value: 'boilermaker', label: 'Caldeireiro' },
  { value: 'pipe_fitter', label: 'Tubista' },
  { value: 'structural_fitter', label: 'Serralheiro Estrutural' },
  { value: 'cnc_operator', label: 'Operador CNC' },
  { value: 'other', label: 'Outro' },
]

const SHIFT_OPTIONS = [
  { value: 'day', label: 'Diurno' },
  { value: 'night', label: 'Noturno' },
  { value: 'rotating', label: 'Rotativo' },
  { value: 'offshore', label: 'Offshore' },
]

const HOUSING_OPTIONS = [
  { value: 'shared_room', label: 'Quarto partilhado' },
  { value: 'single_room', label: 'Quarto individual' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'hotel', label: 'Hotel' },
]

interface CertField {
  standard: string
  processCode: string
  materialGroup: string
}

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    specialtyRequired: '',
    hourlyRateMin: '',
    hourlyRateMax: '',
    rateIncludesTax: false,
    subsistenceDaily: '',
    housingIncluded: false,
    housingQuality: '',
    transportIncluded: false,
    workLocationCity: '',
    workLocationCountry: 'PT',
    projectName: '',
    startDate: '',
    estimatedDurationWeeks: '',
    shiftPattern: '',
    minYearsExperience: '',
    ownToolsRequired: false,
  })

  const [certs, setCerts] = useState<CertField[]>([])

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  function addCert() {
    setCerts((c) => [...c, { standard: '', processCode: '', materialGroup: '' }])
  }

  function updateCert(i: number, field: keyof CertField, value: string) {
    setCerts((c) => c.map((cert, idx) => idx === i ? { ...cert, [field]: value } : cert))
  }

  function removeCert(i: number) {
    setCerts((c) => c.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(status: 'draft' | 'published') {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    if (!form.title || !form.specialtyRequired || !form.hourlyRateMin || !form.workLocationCity) {
      setError('Preenche os campos obrigatórios: título, especialidade, valor/hora e localização.')
      return
    }

    setLoading(true)
    setError('')

    const body = {
      title: form.title,
      description: form.description || undefined,
      specialtyRequired: form.specialtyRequired,
      hourlyRateMin: parseFloat(form.hourlyRateMin),
      hourlyRateMax: form.hourlyRateMax ? parseFloat(form.hourlyRateMax) : undefined,
      rateIncludesTax: form.rateIncludesTax,
      subsistenceDaily: form.subsistenceDaily ? parseFloat(form.subsistenceDaily) : undefined,
      housingIncluded: form.housingIncluded,
      housingQuality: form.housingQuality || undefined,
      transportIncluded: form.transportIncluded,
      workLocationCity: form.workLocationCity,
      workLocationCountry: form.workLocationCountry,
      projectName: form.projectName || undefined,
      startDate: form.startDate || undefined,
      estimatedDurationWeeks: form.estimatedDurationWeeks ? parseInt(form.estimatedDurationWeeks) : undefined,
      shiftPattern: form.shiftPattern || undefined,
      minYearsExperience: form.minYearsExperience ? parseInt(form.minYearsExperience) : undefined,
      ownToolsRequired: form.ownToolsRequired,
      requiredCertifications: certs.filter((c) => c.standard).map((c) => ({
        standard: c.standard,
        processCode: c.processCode || undefined,
        materialGroup: c.materialGroup || undefined,
      })),
      status,
    }

    try {
      const res = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Erro ao criar oferta')
        return
      }
      const job = await res.json()
      router.push(`/jobs/${job.id}`)
    } catch {
      setError('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-metal-500 hover:text-white">← Dashboard</Link>
          <h1 className="mt-2 text-2xl font-bold">Nova oferta de trabalho</h1>
          <p className="mt-1 text-sm text-metal-400">
            O valor/hora é obrigatório e público — sem salário "a combinar".
          </p>
        </div>

        <div className="space-y-6">
          {/* Basic info */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Informação Básica</h2>

            <Field label="Título da vaga *">
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Ex: Soldador TIG — Tubagens Inox P1/P8"
                className="input"
              />
            </Field>

            <Field label="Especialidade principal *">
              <select
                value={form.specialtyRequired}
                onChange={(e) => update('specialtyRequired', e.target.value)}
                className="input"
              >
                <option value="">Selecionar...</option>
                {SPECIALTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Descrição">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={5}
                placeholder="Descreve o projeto, responsabilidades, condições específicas..."
                className="input resize-none"
              />
            </Field>
          </section>

          {/* Compensation */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Remuneração (Transparente)</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor/hora mínimo € *">
                <input
                  type="number"
                  value={form.hourlyRateMin}
                  onChange={(e) => update('hourlyRateMin', e.target.value)}
                  placeholder="Ex: 18"
                  step="0.5"
                  min="1"
                  className="input"
                />
              </Field>
              <Field label="Valor/hora máximo €">
                <input
                  type="number"
                  value={form.hourlyRateMax}
                  onChange={(e) => update('hourlyRateMax', e.target.value)}
                  placeholder="Opcional"
                  step="0.5"
                  min="1"
                  className="input"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.rateIncludesTax}
                onChange={(e) => update('rateIncludesTax', e.target.checked)}
                className="rounded"
              />
              <span className="text-metal-300">Valor inclui IRS/IVA (valor bruto)</span>
            </label>

            <Field label="Subsídio diário € (alimentação/transporte)">
              <input
                type="number"
                value={form.subsistenceDaily}
                onChange={(e) => update('subsistenceDaily', e.target.value)}
                placeholder="Ex: 15"
                step="0.5"
                min="0"
                className="input"
              />
            </Field>
          </section>

          {/* Housing & transport */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Alojamento & Transporte</h2>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.housingIncluded}
                onChange={(e) => update('housingIncluded', e.target.checked)}
                className="rounded"
              />
              <span className="text-metal-300">Alojamento incluído</span>
            </label>

            {form.housingIncluded && (
              <Field label="Tipo de alojamento">
                <select
                  value={form.housingQuality}
                  onChange={(e) => update('housingQuality', e.target.value)}
                  className="input"
                >
                  <option value="">Selecionar...</option>
                  {HOUSING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.transportIncluded}
                onChange={(e) => update('transportIncluded', e.target.checked)}
                className="rounded"
              />
              <span className="text-metal-300">Transporte incluído</span>
            </label>
          </section>

          {/* Location & project */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Localização & Projeto</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade *">
                <input
                  value={form.workLocationCity}
                  onChange={(e) => update('workLocationCity', e.target.value)}
                  placeholder="Ex: Sines"
                  className="input"
                />
              </Field>
              <Field label="País *">
                <input
                  value={form.workLocationCountry}
                  onChange={(e) => update('workLocationCountry', e.target.value)}
                  placeholder="Ex: PT"
                  className="input"
                />
              </Field>
            </div>

            <Field label="Nome do projeto">
              <input
                value={form.projectName}
                onChange={(e) => update('projectName', e.target.value)}
                placeholder="Ex: Refinaria de Sines — Fase 2"
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Data de início">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update('startDate', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Duração estimada (semanas)">
                <input
                  type="number"
                  value={form.estimatedDurationWeeks}
                  onChange={(e) => update('estimatedDurationWeeks', e.target.value)}
                  placeholder="Ex: 12"
                  min="1"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Turno">
                <select
                  value={form.shiftPattern}
                  onChange={(e) => update('shiftPattern', e.target.value)}
                  className="input"
                >
                  <option value="">Selecionar...</option>
                  {SHIFT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Experiência mínima (anos)">
                <input
                  type="number"
                  value={form.minYearsExperience}
                  onChange={(e) => update('minYearsExperience', e.target.value)}
                  placeholder="Ex: 3"
                  min="0"
                  className="input"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.ownToolsRequired}
                onChange={(e) => update('ownToolsRequired', e.target.checked)}
                className="rounded"
              />
              <span className="text-metal-300">Ferramentas próprias necessárias</span>
            </label>
          </section>

          {/* Certifications */}
          <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">Certificações Obrigatórias</h2>
              <button
                type="button"
                onClick={addCert}
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                + Adicionar
              </button>
            </div>

            {certs.length === 0 && (
              <p className="text-sm text-metal-600">Nenhuma certificação obrigatória.</p>
            )}

            {certs.map((cert, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 rounded-lg bg-metal-800 p-3">
                <input
                  value={cert.standard}
                  onChange={(e) => updateCert(i, 'standard', e.target.value)}
                  placeholder="Norma (ex: EN ISO 9606-1)"
                  className="input col-span-3 sm:col-span-1"
                />
                <input
                  value={cert.processCode}
                  onChange={(e) => updateCert(i, 'processCode', e.target.value)}
                  placeholder="Processo (ex: 141)"
                  className="input"
                />
                <div className="flex gap-2">
                  <input
                    value={cert.materialGroup}
                    onChange={(e) => updateCert(i, 'materialGroup', e.target.value)}
                    placeholder="Grupo mat."
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeCert(i)}
                    className="text-metal-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Errors */}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex-1 rounded-lg border border-metal-700 py-3 text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white disabled:opacity-50 transition-colors"
            >
              Guardar rascunho
            </button>
            <button
              onClick={() => handleSubmit('published')}
              disabled={loading}
              className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'A publicar...' : 'Publicar oferta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-metal-400">{label}</label>
      {children}
    </div>
  )
}
