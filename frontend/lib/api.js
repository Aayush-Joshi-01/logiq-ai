import { supabase } from './supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useLearningStore } from '../store/learningStore'

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

async function getAuthHeaders(byokKey = null) {
  const { data: { session } } = await supabase.auth.getSession()
  const settings = useSettingsStore.getState()
  const learning = useLearningStore.getState()

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Language': settings.language || 'en',
    'X-User-Level':    learning.inferredLevel || 'beginner',
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  if (byokKey) {
    headers['X-BYOK-Key'] = byokKey
  }
  return headers
}

function handleRateLimitHeader(response) {
  const remaining = response.headers.get('X-RateLimit-Remaining')
  if (remaining !== null) {
    useSettingsStore.getState().setCallsRemaining(Number(remaining))
  }
}

export async function apiGet(path) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}${path}`, { headers })
  handleRateLimitHeader(response)
  if (!response.ok) throw new APIError(response.status, await response.text())
  return response.json()
}

export async function apiPost(path, body, byokKey = null) {
  const headers = await getAuthHeaders(byokKey)
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  handleRateLimitHeader(response)
  if (!response.ok) throw new APIError(response.status, await response.text())
  return response.json()
}

export async function apiPatch(path, body) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  handleRateLimitHeader(response)
  if (!response.ok) throw new APIError(response.status, await response.text())
  return response.json()
}

export async function apiDelete(path) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers })
  if (response.status === 204) return null
  if (!response.ok) throw new APIError(response.status, await response.text())
  return response.json()
}

// Returns the raw Response for streaming endpoints
export async function apiStream(path, body, byokKey = null) {
  const headers = await getAuthHeaders(byokKey)
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  handleRateLimitHeader(response)
  return response
}

export class APIError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = 'APIError'
  }
}
