import type { LocalSessionState, StationSummary, UserPreference } from '../../lib/types'
import { createInitialPlayerState, playerReducer } from './playerReducer'

const baseSession: LocalSessionState = {
  lastStationKey: null,
  volume: 0.72,
  isMuted: false,
  recentStations: [],
  updatedAt: '2026-04-01T00:00:00Z',
}

const ambientStation: StationSummary = {
  key: 'ambient',
  name: 'Ambient',
  descriptor: 'Quiet concentration',
  description: 'Calm atmospheric sound for deep focus.',
  streamUrl: '/media/stations/ambient.mp3',
  artworkUrl: null,
  accentColor: '#4DA3FF',
  secondaryAccentColor: '#8B7CFF',
  mood: 'Low glow',
  sortOrder: 1,
}

describe('playerReducer', () => {
  it('tracks playback requests and upserts recent stations', () => {
    const state = createInitialPlayerState(baseSession)

    const nextState = playerReducer(state, {
      type: 'requestPlayback',
      station: ambientStation,
      playedAt: '2026-04-01T00:05:00Z',
      playbackAction: 'start',
    })

    expect(nextState.currentStation?.key).toBe('ambient')
    expect(nextState.recentStations).toEqual([{ stationKey: 'ambient', playedAt: '2026-04-01T00:05:00Z' }])
    expect(nextState.savedStationKey).toBe('ambient')
  })

  it('prefers newer remote preferences while merging recent stations', () => {
    const state = createInitialPlayerState({
      ...baseSession,
      lastStationKey: 'ambient',
      recentStations: [{ stationKey: 'ambient', playedAt: '2026-04-01T00:05:00Z' }],
    })

    const remotePreferences: UserPreference = {
      lastStationKey: 'minimal',
      volume: 0.4,
      isMuted: true,
      theme: 'dark',
      updatedAt: '2026-04-01T01:00:00Z',
    }

    const nextState = playerReducer(state, {
      type: 'mergeRemoteSession',
      preferences: remotePreferences,
      recentStations: [
        {
          stationKey: 'minimal',
          stationName: 'Minimal',
          descriptor: 'Clean mental space',
          accentColor: '#59E1D9',
          playedAt: '2026-04-01T01:05:00Z',
        },
      ],
    })

    expect(nextState.savedStationKey).toBe('minimal')
    expect(nextState.volume).toBe(0.4)
    expect(nextState.isMuted).toBe(true)
    expect(nextState.recentStations[0]?.stationKey).toBe('minimal')
  })
})
