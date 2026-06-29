'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { LoginSchema, type LoginInput } from '@metalclean/validators/auth'
import { api } from '@/lib/api'
import type { AuthSession } from '@metalclean/types'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginInput) => {
    setError(null)
    try {
      const session = await api.post<AuthSession>('/auth/login', data)
      // Store tokens via server action / cookie (simplified here with localStorage for MVP dev)
      localStorage.setItem('mc_token', session.tokens.accessToken)
      router.push('/feed')
    } catch (err) {
      if (err instanceof api.ApiError) {
        setError(err.message)
      } else {
        setError('Erro inesperado. Tenta novamente.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-metal-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-white">
            Metal<span className="text-orange-500">Clean</span>
          </Link>
          <p className="mt-2 text-metal-400">Bem-vindo de volta</p>
        </div>

        <div className="rounded-xl border border-metal-700 bg-metal-900 p-8 shadow-2xl">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 ring-1 ring-red-500/20">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-metal-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-metal-700 bg-metal-800 px-3 py-2.5 text-white placeholder-metal-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="joao@exemplo.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-metal-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-metal-700 bg-metal-800 px-3 py-2.5 text-white placeholder-metal-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs text-metal-400 hover:text-white">
                Esqueceste a password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {form.formState.isSubmitting ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-metal-400">
            Não tens conta?{' '}
            <Link href="/register" className="text-orange-400 hover:text-orange-300">
              Registar agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
