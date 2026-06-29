'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/jobs', label: 'Vagas' },
  { href: '/workers', label: 'Profissionais' },
  { href: '/feed', label: 'Feed' },
]

export function Navbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-40 border-b border-metal-800 bg-metal-950/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-white">
            Metal<span className="text-orange-500">Clean</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  pathname.startsWith(link.href)
                    ? 'bg-metal-800 text-white'
                    : 'text-metal-400 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-sm text-metal-300 hover:text-white">Dashboard</Link>
              <Link href="/messages" className="text-sm text-metal-300 hover:text-white">Mensagens</Link>
              <Link href="/profile/edit" className="text-sm text-metal-300 hover:text-white">Perfil</Link>
              <button
                onClick={() => { localStorage.removeItem('mc_token'); window.location.href = '/login' }}
                className="text-sm text-metal-400 hover:text-white"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-metal-300 hover:text-white">Entrar</Link>
              <Link href="/register" className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                Registar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
