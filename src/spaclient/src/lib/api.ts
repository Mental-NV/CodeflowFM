import type {
  AddRecentStationRequest,
  AuthBootstrapResponse,
  NowPlaying,
  StationDetail,
  StationSummary,
  UpdatePreferencesRequest,
} from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function createApiUrl(path: string) {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  const normalizedBaseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : ''
  const requestPath = path.startsWith('/api/') ? path : `/api/v1${path}`

  return normalizedBaseUrl ? `${normalizedBaseUrl}${requestPath}` : requestPath
}

async function request<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')

  const response = await fetch(createApiUrl(path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = 'Request failed.'

    if (response.headers.get('content-type')?.includes('application/json')) {
      const payload = (await response.json()) as { detail?: string; title?: string }
      message = payload.detail ?? payload.title ?? message
    } else {
      message = await response.text()
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export function getStations() {
  return request<StationSummary[]>('/stations')
}

export function getStation(key: string) {
  return request<StationDetail>(`/stations/${key}`)
}

export function getNowPlaying(key: string) {
  return request<NowPlaying>(`/stations/${key}/now-playing`)
}

export function bootstrapGoogleSession(token: string) {
  return request<AuthBootstrapResponse>('/auth/google', {
    method: 'POST',
    headers: authHeaders(token),
  })
}

export function updatePreferences(token: string, payload: UpdatePreferencesRequest) {
  return request('/me/preferences', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function upsertRecentStation(token: string, payload: AddRecentStationRequest) {
  return request('/me/recent-stations', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function clearRecentStations(token: string) {
  return request('/me/recent-stations', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
