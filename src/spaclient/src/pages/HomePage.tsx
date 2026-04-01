import { StationCard } from '../components/StationCard'
import { formatRelativeTime } from '../lib/format'
import type { StationSummary } from '../lib/types'
import { usePlayer } from '../features/player/PlayerProvider'

interface HomePageProps {
  stations: StationSummary[]
  isLoading: boolean
  isError: boolean
}

export function HomePage({ stations, isLoading, isError }: HomePageProps) {
  const player = usePlayer()
  const continueStation = player.state.autoplayBlocked ? player.state.currentStation : null

  const recentStations = player.state.recentStations
    .map((recentStation) => {
      const station = stations.find((item) => item.key === recentStation.stationKey)
      return station ? { station, playedAt: recentStation.playedAt } : null
    })
    .filter((item): item is { station: StationSummary; playedAt: string } => item !== null)

  return (
    <div className="page-column">
      <section className="hero-card">
        <div>
          <span className="hero-eyebrow">Radio-style focus music</span>
          <h1 className="hero-title">Select a station. Enter flow.</h1>
          <p className="hero-copy">
            Curated stations for coding, reading, and deep work. One click to start. Calm controls. No
            browsing spiral.
          </p>
          <div className="hero-points">
            <div className="hero-point">
              <strong>Public listening</strong>
              <span className="support-copy">Playback stays open even if you never sign in.</span>
            </div>
            <div className="hero-point">
              <strong>Session restore</strong>
              <span className="support-copy">Last station, volume, and recents return with you.</span>
            </div>
            <div className="hero-point">
              <strong>Low noise</strong>
              <span className="support-copy">Station-first surfaces keep the path back into work short.</span>
            </div>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-mini-panel">
            <span className="section-eyebrow">On Air</span>
            <p className="section-copy">
              {player.state.currentStation
                ? `${player.state.currentStation.name} is carrying the session.`
                : 'Choose your frequency and the player will stay with you.'}
            </p>
          </div>

          {continueStation ? (
            <div className="session-card">
              <span className="section-eyebrow">Continue Session</span>
              <div>
                <strong>{continueStation.name}</strong>
                <p className="section-copy">
                  The browser held playback. Resume when you are ready and stay in flow.
                </p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  player.playStation(continueStation, 'continue')
                }}
              >
                Continue Session
              </button>
            </div>
          ) : (
            <div className="hero-mini-panel">
              <span className="section-eyebrow">Continue session</span>
              <p className="section-copy">
                If autoplay is blocked on refresh, the app restores the station and gives you a clear resume
                path.
              </p>
            </div>
          )}
        </div>
      </section>

      {recentStations.length > 0 ? (
        <section className="section-block">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Recently Played</span>
              <span className="section-title">Return to your last session</span>
            </div>
          </div>
          <div className="recent-list">
            {recentStations.slice(0, 3).map(({ station, playedAt }) => (
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
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">Stations</span>
            <span className="section-title">Choose your frequency</span>
            <p className="section-copy">Editorial order stays fixed so the first decision stays light.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-card">Loading stations.</div>
        ) : null}

        {isError ? (
          <div className="error-card" role="alert">
            Station directory is quiet right now. Refresh to reconnect.
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="stations-grid">
            {stations.map((station) => (
              <StationCard
                key={station.key}
                station={station}
                isActive={player.state.currentStation?.key === station.key}
                playbackStatus={player.state.playbackStatus}
                onSelect={() => {
                  player.playStation(station)
                }}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
