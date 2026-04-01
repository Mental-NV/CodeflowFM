import { statusLabel } from '../lib/format'
import type { StationSummary } from '../lib/types'
import { usePlayer } from '../features/player/PlayerProvider'

export function GlobalPlayer({ stations }: { stations: StationSummary[] }) {
  const { state, closeNowPlaying, openNowPlaying, retryPlayback, setVolume, toggleMute, togglePlayback } = usePlayer()
  const currentStation = state.currentStation
  const currentTrack = state.currentTrack
  const hasStations = stations.length > 0
  const trackLabel = currentTrack && currentTrack.artistName && currentTrack.trackTitle
    ? `${currentTrack.artistName} - ${currentTrack.trackTitle}`
    : 'Live station'

  if (!currentStation) {
    return (
      <div className="player-bar" role="region" aria-label="Global player">
        <div className="idle-player">
          <div>
            <div className="player-station">Nothing playing yet</div>
            <div className="player-track">Select a station to begin.</div>
          </div>
          <span className="status-chip">{hasStations ? 'Ready' : 'Loading'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="player-bar" role="region" aria-label="Global player">
      <div className="player-card">
        <div className="player-main">
          <div className="player-controls">
            <button
              type="button"
              className="icon-button icon-button--primary"
              onClick={togglePlayback}
              aria-label={state.playbackStatus === 'playing' ? 'Pause station' : 'Play station'}
            >
              {state.playbackStatus === 'playing' ? 'II' : '>'}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={toggleMute}
              aria-label={state.isMuted ? 'Unmute' : 'Mute'}
            >
              {state.isMuted ? 'M' : 'V'}
            </button>
          </div>

          <div className="player-text" aria-live="polite">
            <div className="player-station">{currentStation.name}</div>
            <div className="player-track">{trackLabel}</div>
          </div>

          <div className="player-actions">
            <span className="status-chip" data-variant={state.playbackStatus === 'playing' ? 'live' : 'default'}>
              {state.playbackStatus === 'playing' ? <span className="status-dot" aria-hidden="true" /> : null}
              {statusLabel(state.playbackStatus)}
            </span>
            <div className="volume-group">
              <label htmlFor="volume-slider" className="microcopy">
                Volume
              </label>
              <input
                id="volume-slider"
                className="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.volume}
                onChange={(event) => {
                  setVolume(Number(event.currentTarget.value))
                }}
                aria-label="Volume"
              />
            </div>
            <button type="button" className="secondary-button" onClick={openNowPlaying}>
              Now Playing
            </button>
          </div>
        </div>

        {state.errorMessage ? (
          <div className="player-error" role="alert">
            <span>{state.errorMessage}</span>
            <button type="button" className="secondary-button" onClick={retryPlayback}>
              Retry
            </button>
          </div>
        ) : null}

        {state.isNowPlayingOpen ? (
          <div className="helper-row">
            <button type="button" className="ghost-button" onClick={closeNowPlaying}>
              Close panel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
