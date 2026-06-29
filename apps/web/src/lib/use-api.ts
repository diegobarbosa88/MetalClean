'use client'

import { api } from './api'

export function useApi() {
  const getToken = () => {
    if (typeof window === 'undefined') return undefined
    return localStorage.getItem('mc_token') ?? undefined
  }

  return {
    get: <T>(path: string) => api.get<T>(path, getToken()),
    post: <T>(path: string, data: unknown) => api.post<T>(path, data, getToken()),
    put: <T>(path: string, data: unknown) => api.put<T>(path, data, getToken()),
    delete: <T>(path: string) => api.delete<T>(path, getToken()),
  }
}
