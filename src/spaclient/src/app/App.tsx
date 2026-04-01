import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AccountPage } from '../pages/AccountPage'
import { HomePage } from '../pages/HomePage'
import { RecentPage } from '../pages/RecentPage'
import { analytics } from '../lib/analytics'
import {
  getNowPlaying,
  getStations,
  updatePreferences,
  upsertRecentStation,
} from '../lib/api'
import { AuthProvider, useAuth } from '../features/account/AuthProvider'
import { GlobalPlayer } from '../components/GlobalPlayer'
import { NowPlayingPanel } from '../components/NowPlayingPanel'
import { PlayerProvider, usePlayer } from '../features/player/PlayerProvider'

export function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 15_000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <BrowserRouter>
            <AppFrame />
          </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function AppFrame() {
  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
  })

  const { applyServerSession, restoreSession, state: playerState, updateMetadata } = usePlayer()
  const { bootstrap, token } = useAuth()
  const queryClient = useQueryClient()
  const lastSyncedPreferenceRef = useRef<string | null>(null)
  const lastSyncedRecentRef = useRef<string | null>(null)

  useEffect(() => {
    analytics.track('app_opened', { route: window.location.pathname })
  }, [])

  useEffect(() => {
    if (stationsQuery.data) {
      restoreSession(stationsQuery.data)
    }
  }, [restoreSession, stationsQuery.data])

  useEffect(() => {
    if (stationsQuery.data && bootstrap) {
      applyServerSession(bootstrap.preferences, bootstrap.recentStations)
    }
  }, [applyServerSession, bootstrap, stationsQuery.data])

  const activeStation = playerState.currentStation
  const activeStationKey = activeStation?.key ?? null

  const metadataQuery = useQuery({
    queryKey: ['now-playing', activeStationKey],
    queryFn: () => {
      if (!activeStationKey) {
        throw new Error('No active station.')
      }

      return getNowPlaying(activeStationKey)
    },
    enabled: activeStationKey !== null,
    refetchInterval: activeStationKey ? 20_000 : false,
    retry: false,
  })

  useEffect(() => {
    if (metadataQuery.data) {
      updateMetadata(metadataQuery.data)
    }
  }, [metadataQuery.data, updateMetadata])

  useEffect(() => {
    if (!token) {
      lastSyncedPreferenceRef.current = null
      return
    }

    const stationKey = playerState.savedStationKey ?? ''
    const syncKey = [
      stationKey,
      String(playerState.volume),
      String(playerState.isMuted),
      playerState.sessionUpdatedAt,
    ].join(':')

    if (lastSyncedPreferenceRef.current === syncKey) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void updatePreferences(token, {
        lastStationKey: playerState.savedStationKey,
        volume: playerState.volume,
        isMuted: playerState.isMuted,
        theme: 'dark',
      }).then(() => {
        lastSyncedPreferenceRef.current = syncKey
      })
    }, 450)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    playerState.isMuted,
    playerState.savedStationKey,
    playerState.sessionUpdatedAt,
    playerState.volume,
    token,
  ])

  useEffect(() => {
    if (!token) {
      lastSyncedRecentRef.current = null
      return
    }

    const latestRecent = playerState.recentStations[0]
    if (!latestRecent) {
      return
    }

    const syncKey = `${latestRecent.stationKey}:${latestRecent.playedAt}`
    if (lastSyncedRecentRef.current === syncKey) {
      return
    }

    void upsertRecentStation(token, { stationKey: latestRecent.stationKey }).then(() => {
      lastSyncedRecentRef.current = syncKey
      void queryClient.invalidateQueries({ queryKey: ['server-recents'] })
    })
  }, [playerState.recentStations, queryClient, token])

  return (
    <div className="app-shell">
      <div className="signal-grid" aria-hidden="true" />
      <header className="topbar">
        <NavLink className="brand-lockup" to="/">
          <span className="brand-mark">CFM</span>
          <span>
            <span className="brand-name">Codeflow FM</span>
            <span className="brand-tagline">Your focus, on air</span>
          </span>
        </NavLink>
        <nav className="topnav" aria-label="Primary">
          <NavLink to="/">Stations</NavLink>
          <NavLink to="/recent">Recently Played</NavLink>
          <NavLink to="/account">Account</NavLink>
        </nav>
      </header>

      <main className="page-shell">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                stations={stationsQuery.data ?? []}
                isLoading={stationsQuery.isPending}
                isError={stationsQuery.isError}
              />
            }
          />
          <Route path="/recent" element={<RecentPage stations={stationsQuery.data ?? []} />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </main>

      <GlobalPlayer stations={stationsQuery.data ?? []} />
      <NowPlayingPanel stations={stationsQuery.data ?? []} />
    </div>
  )
}
