import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { analytics } from '../../lib/analytics'
import { clampVolume } from '../../lib/format'
import { loadLocalSession, saveLocalSession } from '../../lib/storage'
import type { NowPlaying, PlayerState, RecentStation, StationSummary, UserPreference } from '../../lib/types'
import { createInitialPlayerState, playerReducer } from './playerReducer'

type StationSelectionSource = 'directory' | 'recent' | 'restore' | 'retry' | 'continue'

interface PlayerContextValue {
  state: PlayerState
  playStation(station: StationSummary, source?: StationSelectionSource): void
  togglePlayback(): void
  retryPlayback(): void
  setVolume(volume: number): void
  toggleMute(): void
  openNowPlaying(): void
  closeNowPlaying(): void
  updateMetadata(track: NowPlaying): void
  restoreSession(stations: StationSummary[]): void
  applyServerSession(preferences: UserPreference, recentStations: RecentStation[]): void
  clearRecentStations(): void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)
const reconnectSchedule = [2000, 5000, 10000]

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, loadLocalSession(), createInitialPlayerState)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stateRef = useRef(state)
  const reconnectTimerRef = useRef<number | null>(null)
  const startPlaybackRef = useRef<((station: StationSummary, source: StationSelectionSource, emitSelectionEvent?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    stateRef.current = state
    saveLocalSession({
      lastStationKey: state.savedStationKey,
      volume: state.volume,
      isMuted: state.isMuted,
      recentStations: state.recentStations,
      updatedAt: state.sessionUpdatedAt,
    })
  }, [state])

  const startPlayback = useCallback(async (station: StationSummary, source: StationSelectionSource, emitSelectionEvent = true) => {
    const currentStation = stateRef.current.currentStation
    const isSwitchingStation = currentStation && currentStation.key !== station.key
    const playbackAction =
      source === 'restore'
        ? 'restore'
        : source === 'retry'
          ? 'retry'
          : currentStation?.key === station.key && stateRef.current.playbackStatus === 'paused'
            ? 'resume'
            : 'start'

    if (emitSelectionEvent) {
      analytics.track(source === 'recent' ? 'recent_station_selected' : 'station_selected', {
        stationKey: station.key,
      })
    }

    if (isSwitchingStation) {
      analytics.track('station_switched', {
        fromStationKey: currentStation.key,
        toStationKey: station.key,
      })
    }

    if (source === 'restore') {
      analytics.track('session_restored', {
        stationKey: station.key,
      })
    }

    dispatch({
      type: 'requestPlayback',
      station,
      playedAt: new Date().toISOString(),
      playbackAction,
    })

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.pause()
    audio.src = new URL(station.streamUrl, window.location.origin).toString()
    audio.load()

    if (source !== 'retry') {
      analytics.track('playback_requested', {
        stationKey: station.key,
        source,
      })
    }

    try {
      await audio.play()
    } catch (error) {
      const errorName = error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : null

      if (errorName === 'NotAllowedError') {
        dispatch({ type: 'setAutoplayBlocked' })
        return
      }

      dispatch({ type: 'setError', message: 'Playback did not start. Retry to continue.' })
      analytics.track('playback_failed', {
        stationKey: station.key,
        reason: error instanceof Error ? error.message : 'unknown_error',
      })
    }
  }, [])

  useEffect(() => {
    startPlaybackRef.current = startPlayback
  }, [startPlayback])

  useLayoutEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.crossOrigin = 'anonymous'
    audio.volume = stateRef.current.volume
    audio.muted = stateRef.current.isMuted
    audioRef.current = audio

    const handlePlaying = () => {
      dispatch({ type: 'setPlaybackStatus', status: 'playing' })

      if (!stateRef.current.currentStation) {
        return
      }

      if (stateRef.current.reconnectAttempt > 0) {
        analytics.track('playback_reconnected', {
          stationKey: stateRef.current.currentStation.key,
        })
        return
      }

      analytics.track(
        stateRef.current.lastPlaybackAction === 'resume' ? 'playback_resumed' : 'playback_started',
        { stationKey: stateRef.current.currentStation.key },
      )
    }

    const handleWaiting = () => {
      if (stateRef.current.currentStation) {
        dispatch({ type: 'setPlaybackStatus', status: 'buffering' })
      }
    }

    const handlePause = () => {
      if (!stateRef.current.currentStation) {
        return
      }

      if (stateRef.current.playbackStatus === 'loading' || stateRef.current.playbackStatus === 'reconnecting') {
        return
      }

      dispatch({ type: 'setPlaybackStatus', status: 'paused' })
    }

    const handleStreamFailure = () => {
      const currentStation = stateRef.current.currentStation
      if (!currentStation) {
        return
      }

      const attempt = stateRef.current.reconnectAttempt + 1
      const delay = reconnectSchedule[attempt - 1]

      if (!delay) {
        dispatch({ type: 'setError', message: 'Signal lost. Retry to continue.' })
        analytics.track('playback_failed', {
          stationKey: currentStation.key,
          reason: 'stream_error',
        })
        return
      }

      dispatch({ type: 'setReconnectAttempt', attempt })
      reconnectTimerRef.current = window.setTimeout(() => {
        void startPlaybackRef.current?.(currentStation, 'retry', false)
      }, delay)
    }

    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('stalled', handleStreamFailure)
    audio.addEventListener('error', handleStreamFailure)

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }

      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('stalled', handleStreamFailure)
      audio.removeEventListener('error', handleStreamFailure)
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume
    }
  }, [state.volume])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = state.isMuted
    }
  }, [state.isMuted])

  const playStation = useCallback((station: StationSummary, source: StationSelectionSource = 'directory') => {
    void startPlayback(station, source)
  }, [startPlayback])

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    const currentStation = stateRef.current.currentStation

    if (!audio || !currentStation) {
      return
    }

    if (stateRef.current.playbackStatus === 'playing' || stateRef.current.playbackStatus === 'buffering') {
      audio.pause()
      dispatch({ type: 'setPlaybackStatus', status: 'paused' })
      analytics.track('playback_paused', { stationKey: currentStation.key })
      return
    }

    void startPlayback(currentStation, 'continue', false)
  }, [startPlayback])

  const retryPlayback = useCallback(() => {
    if (!stateRef.current.currentStation) {
      return
    }

    void startPlayback(stateRef.current.currentStation, 'retry', false)
  }, [startPlayback])

  const setVolume = useCallback((volume: number) => {
    const nextVolume = clampVolume(volume)
    dispatch({ type: 'setVolume', volume: nextVolume })
    analytics.track('volume_changed', {
      stationKey: stateRef.current.currentStation?.key,
      volume: nextVolume,
    })
  }, [])

  const toggleMute = useCallback(() => {
    dispatch({ type: 'setMuted', isMuted: !stateRef.current.isMuted })
  }, [])

  const openNowPlaying = useCallback(() => {
    dispatch({ type: 'setNowPlayingPanel', isOpen: true })
    analytics.track('now_playing_opened', {
      stationKey: stateRef.current.currentStation?.key,
    })
  }, [])

  const closeNowPlaying = useCallback(() => {
    dispatch({ type: 'setNowPlayingPanel', isOpen: false })
  }, [])

  const updateMetadata = useCallback((track: NowPlaying) => {
    if (stateRef.current.currentStation?.key !== track.stationKey) {
      return
    }

    dispatch({ type: 'setTrack', track })
  }, [])

  const restoreSession = useCallback((stations: StationSummary[]) => {
    if (stateRef.current.restoreAttempted) {
      return
    }

    dispatch({ type: 'markRestoreAttempted' })

    const savedStationKey = stateRef.current.savedStationKey
    if (!savedStationKey) {
      return
    }

    const savedStation = stations.find((station) => station.key === savedStationKey)
    if (!savedStation) {
      dispatch({ type: 'clearSavedStation' })
      return
    }

    void startPlayback(savedStation, 'restore', false)
  }, [startPlayback])

  const applyServerSession = useCallback((preferences: UserPreference, recentStations: RecentStation[]) => {
    dispatch({
      type: 'mergeRemoteSession',
      preferences,
      recentStations,
    })
  }, [])

  const clearRecentStations = useCallback(() => {
    dispatch({ type: 'clearRecentStations' })
  }, [])

  const contextValue = useMemo<PlayerContextValue>(() => ({
    state,
    playStation,
    togglePlayback,
    retryPlayback,
    setVolume,
    toggleMute,
    openNowPlaying,
    closeNowPlaying,
    updateMetadata,
    restoreSession,
    applyServerSession,
    clearRecentStations,
  }), [
    applyServerSession,
    clearRecentStations,
    closeNowPlaying,
    openNowPlaying,
    playStation,
    restoreSession,
    retryPlayback,
    setVolume,
    state,
    toggleMute,
    togglePlayback,
    updateMetadata,
  ])

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)

  if (!context) {
    throw new Error('usePlayer must be used inside PlayerProvider.')
  }

  return context
}
