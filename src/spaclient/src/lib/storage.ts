import type { LocalRecentStation, LocalSessionState, RecentStation } from './types'

export const SESSION_STORAGE_KEY = 'codeflowfm.session'
export const SIGNED_OUT_STORAGE_KEY = 'codeflowfm.google.signedout'

const defaultSessionState: LocalSessionState = {
  lastStationKey: null,
  volume: 0.72,
  isMuted: false,
  recentStations: [],
  updatedAt: new Date(0).toISOString(),
}

export function loadLocalSession(): LocalSessionState {
  const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!rawValue) {
    return defaultSessionState
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<LocalSessionState>

    return {
      lastStationKey: typeof parsed.lastStationKey === 'string' ? parsed.lastStationKey : null,
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : defaultSessionState.volume),
      isMuted: Boolean(parsed.isMuted),
      recentStations: normalizeRecentStations(parsed.recentStations ?? []),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : defaultSessionState.updatedAt,
    }
  } catch {
    return defaultSessionState
  }
}

export function saveLocalSession(session: LocalSessionState) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function upsertRecentStation(recentStations: LocalRecentStation[], stationKey: string, playedAt: string) {
  const deduped = recentStations.filter((recentStation) => recentStation.stationKey !== stationKey)
  return [{ stationKey, playedAt }, ...deduped].slice(0, 10)
}

export function mergeRecentStations(
  localRecentStations: LocalRecentStation[],
  remoteRecentStations: RecentStation[],
) {
  const merged = new Map<string, LocalRecentStation>()

  for (const recentStation of localRecentStations) {
    merged.set(recentStation.stationKey, recentStation)
  }

  for (const recentStation of remoteRecentStations) {
    const existing = merged.get(recentStation.stationKey)
    if (!existing || Date.parse(recentStation.playedAt) > Date.parse(existing.playedAt)) {
      merged.set(recentStation.stationKey, {
        stationKey: recentStation.stationKey,
        playedAt: recentStation.playedAt,
      })
    }
  }

  return [...merged.values()]
    .sort((left, right) => Date.parse(right.playedAt) - Date.parse(left.playedAt))
    .slice(0, 10)
}

export function setSignedOutPreference(value: boolean) {
  if (value) {
    window.localStorage.setItem(SIGNED_OUT_STORAGE_KEY, '1')
    return
  }

  window.localStorage.removeItem(SIGNED_OUT_STORAGE_KEY)
}

export function getSignedOutPreference() {
  return window.localStorage.getItem(SIGNED_OUT_STORAGE_KEY) === '1'
}

function normalizeRecentStations(input: unknown[]) {
  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const recentStation = item as Partial<LocalRecentStation>
      if (typeof recentStation.stationKey !== 'string' || typeof recentStation.playedAt !== 'string') {
        return null
      }

      return {
        stationKey: recentStation.stationKey,
        playedAt: recentStation.playedAt,
      }
    })
    .filter((item): item is LocalRecentStation => item !== null)
    .slice(0, 10)
}

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value))
}
