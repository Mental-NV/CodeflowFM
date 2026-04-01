import { mergeRecentStations, upsertRecentStation } from '../../lib/storage'
import type { LocalSessionState, PlayerState, RecentStation, StationSummary, UserPreference } from '../../lib/types'

interface RequestPlaybackAction {
  type: 'requestPlayback'
  station: StationSummary
  playedAt: string
  playbackAction: PlayerState['lastPlaybackAction']
}

interface SetTrackAction {
  type: 'setTrack'
  track: PlayerState['currentTrack']
}

interface SetPlaybackStatusAction {
  type: 'setPlaybackStatus'
  status: PlayerState['playbackStatus']
}

interface SetErrorAction {
  type: 'setError'
  message: string
}

interface SetAutoplayBlockedAction {
  type: 'setAutoplayBlocked'
}

interface SetVolumeAction {
  type: 'setVolume'
  volume: number
}

interface SetMutedAction {
  type: 'setMuted'
  isMuted: boolean
}

interface SetNowPlayingPanelAction {
  type: 'setNowPlayingPanel'
  isOpen: boolean
}

interface SetReconnectAttemptAction {
  type: 'setReconnectAttempt'
  attempt: number
}

interface MarkRestoreAttemptedAction {
  type: 'markRestoreAttempted'
}

interface ClearSavedStationAction {
  type: 'clearSavedStation'
}

interface ClearRecentStationsAction {
  type: 'clearRecentStations'
}

interface MergeRemoteSessionAction {
  type: 'mergeRemoteSession'
  preferences: UserPreference
  recentStations: RecentStation[]
}

export type PlayerAction =
  | RequestPlaybackAction
  | SetTrackAction
  | SetPlaybackStatusAction
  | SetErrorAction
  | SetAutoplayBlockedAction
  | SetVolumeAction
  | SetMutedAction
  | SetNowPlayingPanelAction
  | SetReconnectAttemptAction
  | MarkRestoreAttemptedAction
  | ClearSavedStationAction
  | ClearRecentStationsAction
  | MergeRemoteSessionAction

export function createInitialPlayerState(session: LocalSessionState): PlayerState {
  return {
    currentStation: null,
    playbackStatus: 'idle',
    volume: session.volume,
    isMuted: session.isMuted,
    currentTrack: null,
    errorMessage: null,
    recentStations: session.recentStations,
    savedStationKey: session.lastStationKey,
    sessionUpdatedAt: session.updatedAt,
    autoplayBlocked: false,
    isNowPlayingOpen: false,
    reconnectAttempt: 0,
    restoreAttempted: false,
    lastPlaybackAction: null,
  }
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'requestPlayback':
      return {
        ...state,
        currentStation: action.station,
        currentTrack: null,
        playbackStatus: 'loading',
        errorMessage: null,
        autoplayBlocked: false,
        reconnectAttempt: action.playbackAction === 'retry' ? state.reconnectAttempt : 0,
        savedStationKey: action.station.key,
        recentStations: upsertRecentStation(state.recentStations, action.station.key, action.playedAt),
        sessionUpdatedAt: action.playedAt,
        lastPlaybackAction: action.playbackAction,
      }
    case 'setTrack':
      return {
        ...state,
        currentTrack: action.track,
      }
    case 'setPlaybackStatus':
      return {
        ...state,
        playbackStatus: action.status,
        autoplayBlocked: action.status === 'paused' ? state.autoplayBlocked : false,
        errorMessage: action.status === 'error' ? state.errorMessage : null,
      }
    case 'setError':
      return {
        ...state,
        playbackStatus: 'error',
        errorMessage: action.message,
      }
    case 'setAutoplayBlocked':
      return {
        ...state,
        playbackStatus: 'paused',
        autoplayBlocked: true,
        errorMessage: null,
      }
    case 'setVolume':
      return {
        ...state,
        volume: action.volume,
        sessionUpdatedAt: new Date().toISOString(),
      }
    case 'setMuted':
      return {
        ...state,
        isMuted: action.isMuted,
        sessionUpdatedAt: new Date().toISOString(),
      }
    case 'setNowPlayingPanel':
      return {
        ...state,
        isNowPlayingOpen: action.isOpen,
      }
    case 'setReconnectAttempt':
      return {
        ...state,
        reconnectAttempt: action.attempt,
        playbackStatus: 'reconnecting',
      }
    case 'markRestoreAttempted':
      return {
        ...state,
        restoreAttempted: true,
      }
    case 'clearSavedStation':
      return {
        ...state,
        savedStationKey: null,
        sessionUpdatedAt: new Date().toISOString(),
      }
    case 'clearRecentStations':
      return {
        ...state,
        recentStations: [],
        sessionUpdatedAt: new Date().toISOString(),
      }
    case 'mergeRemoteSession': {
      const remoteRecentStations = mergeRecentStations(state.recentStations, action.recentStations)
      const remoteUpdatedAt = Date.parse(action.preferences.updatedAt)
      const localUpdatedAt = Date.parse(state.sessionUpdatedAt)

      if (remoteUpdatedAt <= localUpdatedAt) {
        return {
          ...state,
          recentStations: remoteRecentStations,
        }
      }

      return {
        ...state,
        volume: action.preferences.volume,
        isMuted: action.preferences.isMuted,
        savedStationKey: action.preferences.lastStationKey ?? state.savedStationKey,
        sessionUpdatedAt: action.preferences.updatedAt,
        recentStations: remoteRecentStations,
      }
    }
  }
}
