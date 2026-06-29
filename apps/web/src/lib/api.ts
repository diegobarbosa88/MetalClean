const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...init } = options ?? {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? 'Erro desconhecido', body.code, body.details)
  }

  return body as T
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, data: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data), token }),
  put: <T>(path: string, data: unknown, token?: string) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data), token }),
  patch: <T>(path: string, data: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
  ApiError,
}
