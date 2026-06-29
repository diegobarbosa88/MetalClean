import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRate(min: number, max?: number | null, currency = 'EUR') {
  const symbol = currency === 'EUR' ? '€' : currency
  return max ? `${min}–${max}${symbol}/h` : `${min}${symbol}/h`
}

export function formatDate(date: string | Date | null, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', opts ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function timeAgo(date: string | Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Agora'
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `Há ${Math.floor(diff / 86400)} d`
  return formatDate(date)
}

export const SPECIALTY_LABELS: Record<string, string> = {
  tig_welder: 'Soldador TIG',
  mig_mag_welder: 'Soldador MIG/MAG',
  electrode_welder: 'Soldador Elétrodo',
  boilermaker: 'Caldeireiro',
  pipe_fitter: 'Tubista',
  structural_fitter: 'Serralheiro Estrutural',
  cnc_operator: 'Operador CNC',
  other: 'Outro',
}

export const MATCH_STATUS_LABELS: Record<string, string> = {
  pending_worker: 'Aguarda aceitação',
  active: 'Em curso',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Em disputa',
}

export const MATCH_STATUS_COLORS: Record<string, string> = {
  pending_worker: 'text-yellow-400 bg-yellow-400/10',
  active: 'text-green-400 bg-green-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
  cancelled: 'text-metal-400 bg-metal-700/50',
  disputed: 'text-red-400 bg-red-400/10',
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  viewed: 'Vista',
  shortlisted: 'Selecionada',
  rejected: 'Rejeitada',
  withdrawn: 'Retirada',
  matched: 'Contratado',
}
