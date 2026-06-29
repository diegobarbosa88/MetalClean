'use server'

import { cookies } from 'next/headers'
import type { AuthSession } from '@metalclean/types'
import { api } from './api'

const TOKEN_COOKIE = 'mc_access_token'
const REFRESH_COOKIE = 'mc_refresh_token'

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    const user = await api.get<AuthSession['user']>('/auth/me', token)
    return { user, tokens: { accessToken: token, refreshToken: '', expiresIn: 900 } }
  } catch {
    return null
  }
}

export function getAccessToken(): string | undefined {
  return cookies().get(TOKEN_COOKIE)?.value
}

export function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = cookies()
  store.set(TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  })
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export function clearAuthCookies() {
  const store = cookies()
  store.delete(TOKEN_COOKIE)
  store.delete(REFRESH_COOKIE)
}
