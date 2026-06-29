'use client'

import { useEffect, useState } from 'react'
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

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'working', label: 'Em projeto' },
  { value: 'not_looking', label: 'Não disponível' },
]

const COMPANY_TYPE_OPTIONS = [
  { value: 'main_contractor', label: 'Empreiteiro geral' },
  { value: 'subcontractor', label: 'Subcontratado' },
  { value: 'both', label: 'Ambos' },
  { value: 'temp_agency', label: 'Empresa de trabalho temporário' },
  { value: 'epc', label: 'EPC' },
]

const SECTOR_OPTIONS = [
  'oil_gas', 'petrochemical', 'shipbuilding', 'civil',
  'food_beverage', 'pharmaceutical', 'power', 'water', 'mining',
]

export default function ProfileEditPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Worker fields
  const [workerForm, setWorkerForm] = useState({
    fullName: '',
    headline: '',
    bio: '',
    primarySpecialty: '',
    yearsExperience: '',
    locationCity: '',
    locationCountry: '',
    availabilityStatus: 'available',
    availableFrom: '',
    desiredHourlyRateMin: '',
    desiredHourlyRateMax: '',
    willingToRelocate: false,
    hasOwnTools: false,
  })

  // Company fields
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    bio: '',
    locationCity: '',
    locationCountry: '',
    companyType: '',
    employeeCountRange: '',
    sectors: [] as string[],
    website: '',
    currentProjectsSummary: '',
    foundedYear: '',
  })

  // Certifications (worker only)
  const [certs, setCerts] = useState<{ id: string; standard: string; processCode?: string; position?: string; issuedBy: string; issueDate: string; expiryDate?: string; isVerified: boolean }[]>([])
  const [addingCert, setAddingCert] = useState(false)
  const [newCert, setNewCert] = useState({ standard: '', processCode: '', position: '', issuedBy: '', issueDate: '', expiryDate: '' })

  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { router.push('/login'); return }
        const me = await res.json()
        setAccountType(me.accountType)
        if (me.accountType === 'worker' && me.workerProfile) {
          const p = me.workerProfile
          setWorkerForm({
            fullName: p.fullName ?? '',
            headline: p.headline ?? '',
            bio: p.bio ?? '',
            primarySpecialty: p.primarySpecialty ?? '',
            yearsExperience: p.yearsExperience?.toString() ?? '',
            locationCity: p.locationCity ?? '',
            locationCountry: p.locationCountry ?? '',
            availabilityStatus: p.availabilityStatus ?? 'available',
            availableFrom: p.availableFrom?.slice(0, 10) ?? '',
            desiredHourlyRateMin: p.desiredHourlyRateMin?.toString() ?? '',
            desiredHourlyRateMax: p.desiredHourlyRateMax?.toString() ?? '',
            willingToRelocate: p.willingToRelocate ?? false,
            hasOwnTools: p.hasOwnTools ?? false,
          })
          setCerts(p.certifications ?? [])
        } else if (me.accountType === 'company' && me.companyProfile) {
          const p = me.companyProfile
          setCompanyForm({
            companyName: p.companyName ?? '',
            bio: p.bio ?? '',
            locationCity: p.locationCity ?? '',
            locationCountry: p.locationCountry ?? '',
            companyType: p.companyType ?? '',
            employeeCountRange: p.employeeCountRange ?? '',
            sectors: p.sectors ?? [],
            website: p.website ?? '',
            currentProjectsSummary: p.currentProjectsSummary ?? '',
            foundedYear: p.foundedYear?.toString() ?? '',
          })
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function saveWorker() {
    const token = localStorage.getItem('mc_token')!
    setSaving(true)
    setError('')
    const body = {
      fullName: workerForm.fullName,
      headline: workerForm.headline || undefined,
      bio: workerForm.bio || undefined,
      primarySpecialty: workerForm.primarySpecialty || undefined,
      yearsExperience: workerForm.yearsExperience ? parseInt(workerForm.yearsExperience) : undefined,
      locationCity: workerForm.locationCity || undefined,
      locationCountry: workerForm.locationCountry || undefined,
      availabilityStatus: workerForm.availabilityStatus,
      availableFrom: workerForm.availableFrom || undefined,
      desiredHourlyRateMin: workerForm.desiredHourlyRateMin ? parseFloat(workerForm.desiredHourlyRateMin) : undefined,
      desiredHourlyRateMax: workerForm.desiredHourlyRateMax ? parseFloat(workerForm.desiredHourlyRateMax) : undefined,
      willingToRelocate: workerForm.willingToRelocate,
      hasOwnTools: workerForm.hasOwnTools,
    }
    try {
      const res = await fetch(`${API}/workers/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Erro ao guardar'); return }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch { setError('Erro de rede.') }
    finally { setSaving(false) }
  }

  async function saveCompany() {
    const token = localStorage.getItem('mc_token')!
    setSaving(true)
    setError('')
    const body = {
      ...companyForm,
      foundedYear: companyForm.foundedYear ? parseInt(companyForm.foundedYear) : undefined,
    }
    try {
      const res = await fetch(`${API}/companies/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Erro ao guardar'); return }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch { setError('Erro de rede.') }
    finally { setSaving(false) }
  }

  async function addCert() {
    if (!newCert.standard || !newCert.issuedBy || !newCert.issueDate) {
      setError('Preenche norma, entidade emissora e data de emissão.')
      return
    }
    const token = localStorage.getItem('mc_token')!
    try {
      const res = await fetch(`${API}/workers/me/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          standard: newCert.standard,
          processCode: newCert.processCode || undefined,
          position: newCert.position || undefined,
          issuedBy: newCert.issuedBy,
          issueDate: newCert.issueDate,
          expiryDate: newCert.expiryDate || undefined,
        }),
      })
      if (res.ok) {
        const cert = await res.json()
        setCerts((c) => [...c, cert])
        setNewCert({ standard: '', processCode: '', position: '', issuedBy: '', issueDate: '', expiryDate: '' })
        setAddingCert(false)
      }
    } catch { setError('Erro ao adicionar certificação.') }
  }

  async function removeCert(certId: string) {
    const token = localStorage.getItem('mc_token')!
    await fetch(`${API}/workers/me/certifications/${certId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setCerts((c) => c.filter((cert) => cert.id !== certId))
  }

  function toggleSector(s: string) {
    setCompanyForm((f) => ({
      ...f,
      sectors: f.sectors.includes(s) ? f.sectors.filter((x) => x !== s) : [...f.sectors, s],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950 text-white flex items-center justify-center">
        <p className="text-metal-400">A carregar...</p>
      </div>
    )
  }

  const isWorker = accountType === 'worker'

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-metal-500 hover:text-white">← Dashboard</Link>
          <h1 className="mt-2 text-2xl font-bold">Editar Perfil</h1>
        </div>

        <div className="space-y-6">
          {isWorker ? (
            <>
              {/* Worker: basic info */}
              <Section title="Informação Básica">
                <Field label="Nome completo">
                  <input value={workerForm.fullName} onChange={(e) => setWorkerForm((f) => ({ ...f, fullName: e.target.value }))} className="input" />
                </Field>
                <Field label="Título / Headline">
                  <input value={workerForm.headline} onChange={(e) => setWorkerForm((f) => ({ ...f, headline: e.target.value }))} placeholder="Ex: Soldador TIG certificado EN ISO 9606-1 · 8 anos de experiência" className="input" />
                </Field>
                <Field label="Sobre mim">
                  <textarea value={workerForm.bio} onChange={(e) => setWorkerForm((f) => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Descreve a tua experiência, especialização e projetos mais relevantes..." className="input resize-none" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Especialidade principal">
                    <select value={workerForm.primarySpecialty} onChange={(e) => setWorkerForm((f) => ({ ...f, primarySpecialty: e.target.value }))} className="input">
                      <option value="">Selecionar...</option>
                      {SPECIALTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Anos de experiência">
                    <input type="number" min="0" max="60" value={workerForm.yearsExperience} onChange={(e) => setWorkerForm((f) => ({ ...f, yearsExperience: e.target.value }))} className="input" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Cidade">
                    <input value={workerForm.locationCity} onChange={(e) => setWorkerForm((f) => ({ ...f, locationCity: e.target.value }))} className="input" />
                  </Field>
                  <Field label="País">
                    <input value={workerForm.locationCountry} onChange={(e) => setWorkerForm((f) => ({ ...f, locationCountry: e.target.value }))} className="input" />
                  </Field>
                </div>
              </Section>

              {/* Worker: availability */}
              <Section title="Disponibilidade">
                <Field label="Estado">
                  <select value={workerForm.availabilityStatus} onChange={(e) => setWorkerForm((f) => ({ ...f, availabilityStatus: e.target.value }))} className="input">
                    {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Disponível a partir de">
                  <input type="date" value={workerForm.availableFrom} onChange={(e) => setWorkerForm((f) => ({ ...f, availableFrom: e.target.value }))} className="input" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Taxa pretendida mín. (€/h)">
                    <input type="number" step="0.5" min="1" value={workerForm.desiredHourlyRateMin} onChange={(e) => setWorkerForm((f) => ({ ...f, desiredHourlyRateMin: e.target.value }))} className="input" />
                  </Field>
                  <Field label="Taxa pretendida máx. (€/h)">
                    <input type="number" step="0.5" min="1" value={workerForm.desiredHourlyRateMax} onChange={(e) => setWorkerForm((f) => ({ ...f, desiredHourlyRateMax: e.target.value }))} className="input" />
                  </Field>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={workerForm.willingToRelocate} onChange={(e) => setWorkerForm((f) => ({ ...f, willingToRelocate: e.target.checked }))} className="rounded" />
                    <span className="text-metal-300">Disponível para deslocação</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={workerForm.hasOwnTools} onChange={(e) => setWorkerForm((f) => ({ ...f, hasOwnTools: e.target.checked }))} className="rounded" />
                    <span className="text-metal-300">Tenho ferramentas próprias</span>
                  </label>
                </div>
              </Section>

              {/* Worker: certifications */}
              <Section title="Certificações">
                <div className="space-y-2">
                  {certs.map((cert) => (
                    <div key={cert.id} className="flex items-center gap-3 rounded-lg bg-metal-800 px-3 py-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{cert.standard} {cert.processCode && <span className="text-metal-400 text-xs">({cert.processCode})</span>}</p>
                        <p className="text-xs text-metal-500">{cert.issuedBy}{cert.expiryDate && ` · Até ${cert.expiryDate.slice(0, 10)}`}</p>
                      </div>
                      {cert.isVerified && <span className="text-xs text-green-400">✓</span>}
                      <button onClick={() => removeCert(cert.id)} className="text-metal-500 hover:text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                </div>

                {addingCert ? (
                  <div className="rounded-lg border border-metal-700 bg-metal-800 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Norma *"><input value={newCert.standard} onChange={(e) => setNewCert((c) => ({ ...c, standard: e.target.value }))} placeholder="EN ISO 9606-1" className="input" /></Field>
                      <Field label="Código processo"><input value={newCert.processCode} onChange={(e) => setNewCert((c) => ({ ...c, processCode: e.target.value }))} placeholder="141" className="input" /></Field>
                      <Field label="Entidade emissora *"><input value={newCert.issuedBy} onChange={(e) => setNewCert((c) => ({ ...c, issuedBy: e.target.value }))} placeholder="Bureau Veritas" className="input" /></Field>
                      <Field label="Posição"><input value={newCert.position} onChange={(e) => setNewCert((c) => ({ ...c, position: e.target.value }))} placeholder="PA, PB..." className="input" /></Field>
                      <Field label="Data de emissão *"><input type="date" value={newCert.issueDate} onChange={(e) => setNewCert((c) => ({ ...c, issueDate: e.target.value }))} className="input" /></Field>
                      <Field label="Data de validade"><input type="date" value={newCert.expiryDate} onChange={(e) => setNewCert((c) => ({ ...c, expiryDate: e.target.value }))} className="input" /></Field>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAddingCert(false)} className="flex-1 rounded-lg border border-metal-700 py-2 text-xs font-medium text-metal-300 hover:text-white transition-colors">Cancelar</button>
                      <button onClick={addCert} className="flex-1 rounded-lg bg-orange-500 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors">Guardar certificação</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingCert(true)} className="text-sm text-orange-400 hover:text-orange-300">+ Adicionar certificação</button>
                )}
              </Section>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">Perfil guardado com sucesso!</p>}

              <button onClick={saveWorker} disabled={saving} className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {saving ? 'A guardar...' : 'Guardar perfil'}
              </button>
            </>
          ) : (
            <>
              {/* Company: basic info */}
              <Section title="Informação da Empresa">
                <Field label="Nome da empresa">
                  <input value={companyForm.companyName} onChange={(e) => setCompanyForm((f) => ({ ...f, companyName: e.target.value }))} className="input" />
                </Field>
                <Field label="Descrição">
                  <textarea value={companyForm.bio} onChange={(e) => setCompanyForm((f) => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Descreve a empresa, especialização e projetos..." className="input resize-none" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo de empresa">
                    <select value={companyForm.companyType} onChange={(e) => setCompanyForm((f) => ({ ...f, companyType: e.target.value }))} className="input">
                      <option value="">Selecionar...</option>
                      {COMPANY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Nº colaboradores">
                    <select value={companyForm.employeeCountRange} onChange={(e) => setCompanyForm((f) => ({ ...f, employeeCountRange: e.target.value }))} className="input">
                      <option value="">Selecionar...</option>
                      {['1-10','11-50','51-200','201-500','500+'].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Cidade">
                    <input value={companyForm.locationCity} onChange={(e) => setCompanyForm((f) => ({ ...f, locationCity: e.target.value }))} className="input" />
                  </Field>
                  <Field label="País">
                    <input value={companyForm.locationCountry} onChange={(e) => setCompanyForm((f) => ({ ...f, locationCountry: e.target.value }))} className="input" />
                  </Field>
                  <Field label="Website">
                    <input value={companyForm.website} onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." className="input" />
                  </Field>
                  <Field label="Ano de fundação">
                    <input type="number" min="1900" max="2030" value={companyForm.foundedYear} onChange={(e) => setCompanyForm((f) => ({ ...f, foundedYear: e.target.value }))} className="input" />
                  </Field>
                </div>
                <Field label="Resumo de projetos atuais">
                  <textarea value={companyForm.currentProjectsSummary} onChange={(e) => setCompanyForm((f) => ({ ...f, currentProjectsSummary: e.target.value }))} rows={2} className="input resize-none" />
                </Field>
              </Section>

              {/* Sectors */}
              <Section title="Setores de Atividade">
                <div className="flex flex-wrap gap-2">
                  {SECTOR_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSector(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        companyForm.sectors.includes(s)
                          ? 'bg-orange-500 text-white'
                          : 'border border-metal-700 text-metal-400 hover:border-metal-500 hover:text-white'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </Section>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">Perfil guardado com sucesso!</p>}

              <button onClick={saveCompany} disabled={saving} className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {saving ? 'A guardar...' : 'Guardar perfil'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-metal-700 bg-metal-900 p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-metal-400">{title}</h2>
      {children}
    </section>
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
