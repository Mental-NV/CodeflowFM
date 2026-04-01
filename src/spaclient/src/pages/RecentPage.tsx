import { clearRecentStations as clearRecentStationsApi } from '../lib/api'
import { formatRelativeTime } from '../lib/format'
import type { StationSummary } from '../lib/types'
import { useAuth } from '../features/account/AuthProvider'
import { usePlayer } from '../features/player/PlayerProvider'

export function RecentPage({ stations }: { stations: StationSummary[] }) {
  const auth = useAuth()
  const player = usePlayer()

  const recentStations = player.state.recentStations
    .map((recentStation) => {
      const station = stations.find((item) => item.key === recentStation.stationKey)
      return station ? { station, playedAt: recentStation.playedAt } : null
    })
    .filter((item): item is { station: StationSummary; playedAt: string } => item !== null)

  async function handleClearHistory() {
    player.clearRecentStations()

    if (auth.token) {
      await clearRecentStationsApi(auth.token)
    }
  }

  return (
    <div className="page-column">
      <section className="surface-card">
        <div className="section-header" style={{ padding: '1.4rem 1.4rem 0' }}>
          <div>
            <span className="section-eyebrow">Recently Played</span>
            <span className="section-title">Short path back into work</span>
            <p className="section-copy">
              Recent stations stay local for everyone, and sync when you are signed in.
            </p>
          </div>
          {recentStations.length > 0 ? (
            <button type="button" className="ghost-button" onClick={() => void handleClearHistory()}>
              Clear history
            </button>
          ) : null}
        </div>

        <div style={{ padding: '1.4rem' }}>
          {recentStations.length === 0 ? (
            <div className="empty-card">Start a session and your recent stations will appear here.</div>
          ) : (
            <div className="recent-list">
              {recentStations.map(({ station, playedAt }) => (
                <button
                  key={station.key}
                  type="button"
                  className="recent-row"
                  onClick={() => {
                    player.playStation(station, 'recent')
                  }}
                >
                  <span
                    className="recent-accent"
                    style={{ '--station-primary': station.accentColor } as React.CSSProperties}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="recent-title">{station.name}</span>
                    <span className="recent-copy">{station.descriptor}</span>
                  </span>
                  <span className="recent-time">{formatRelativeTime(playedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
