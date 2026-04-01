export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'reconnecting'
  | 'error'

export interface StationSummary {
  key: string
  name: string
  descriptor: string
  description: string
  streamUrl: string
  artworkUrl: string | null
  accentColor: string
  secondaryAccentColor: string
  mood: string
  sortOrder: number
}

export interface StationDetail extends StationSummary {
  isActive: boolean
}

export interface NowPlaying {
  stationKey: string
  stationName: string
  trackTitle: string | null
  artistName: string | null
  artworkUrl: string | null
  startedAt: string | null
  durationSeconds: number | null
  fetchedAt: string
  isLive: boolean
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
}

export interface UserPreference {
  lastStationKey: string | null
  volume: number
  isMuted: boolean
  theme: string
  updatedAt: string
}

export interface RecentStation {
  stationKey: string
  stationName: string
  descriptor: string
  accentColor: string
  playedAt: string
}

export interface AuthBootstrapResponse {
  user: UserProfile
  preferences: UserPreference
  recentStations: RecentStation[]
}

export interface UpdatePreferencesRequest {
  lastStationKey: string | null
  volume: number
  isMuted: boolean
  theme: string
}

export interface AddRecentStationRequest {
  stationKey: string
}

export interface LocalRecentStation {
  stationKey: string
  playedAt: string
}

export interface LocalSessionState {
  lastStationKey: string | null
  volume: number
  isMuted: boolean
  recentStations: LocalRecentStation[]
  updatedAt: string
}

export interface PlayerState {
  currentStation: StationSummary | null
  playbackStatus: PlaybackStatus
  volume: number
  isMuted: boolean
  currentTrack: NowPlaying | null
  errorMessage: string | null
  recentStations: LocalRecentStation[]
  savedStationKey: string | null
  sessionUpdatedAt: string
  autoplayBlocked: boolean
  isNowPlayingOpen: boolean
  reconnectAttempt: number
  restoreAttempted: boolean
  lastPlaybackAction: 'start' | 'resume' | 'restore' | 'retry' | null
}
