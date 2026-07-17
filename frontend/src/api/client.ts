import { toast } from '../lib/toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'modaflow_token'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

function extractDetail(text: string): string {
  try {
    const data = JSON.parse(text)
    if (typeof data.detail === 'string') return data.detail
  } catch { /* resposta não-JSON */ }
  return 'Ocorreu um erro. Tente novamente.'
}

async function request<T>(path: string, options?: RequestInit, silent = false): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
      ...options,
    })
  } catch {
    toast('error', 'Sem ligação ao servidor.')
    throw new Error('network')
  }
  if (response.status === 401 && !path.startsWith('/auth/login')) {
    clearToken()
    window.dispatchEvent(new Event('auth:logout'))
    throw new Error('unauthorized')
  }
  if (!response.ok) {
    const detail = extractDetail(await response.text())
    if (!silent) toast('error', detail)
    throw new Error(detail)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

async function upload(file: File): Promise<{ url: string }> {
  const token = getToken()
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })
  if (!response.ok) {
    const detail = extractDetail(await response.text())
    toast('error', detail)
    throw new Error(detail)
  }
  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, silent = false) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }, silent),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
  upload,
}
