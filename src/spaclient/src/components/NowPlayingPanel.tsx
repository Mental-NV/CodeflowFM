import { formatRelativeTime, statusLabel } from '../lib/format'
import type { StationSummary } from '../lib/types'
import { usePlayer } from '../features/player/PlayerProvider'

export function NowPlayingPanel({ stations }: { stations: StationSummary[] }) {
  const { closeNowPlaying, retryPlayback, setVolume, state, toggleMute, togglePlayback } = usePlayer()
  const currentStation = state.currentStation

  if (!state.isNowPlayingOpen || !currentStation) {
    return null
  }

  const station = stations.find((item) => item.key === currentStation.key) ?? currentStation
  const currentTrack = state.currentTrack

  return (
    <div className="panel-overlay" role="presentation">
      <div className="now-playing-panel" role="dialog" aria-modal="true" aria-label="Now playing">
        <button type="button" className="ghost-button panel-close" onClick={closeNowPlaying}>
          Close
        </button>
        <div className="panel-grid">
          <div
            className="panel-artwork"
            style={
              {
                '--station-primary': station.accentColor,
                '--station-secondary': station.secondaryAccentColor,
              } as React.CSSProperties
            }
          />
          <div className="page-column">
            <div>
              <span className="section-eyebrow">Now Playing</span>
              <h2 className="panel-title">{station.name}</h2>
              <p className="panel-support">{station.description}</p>
              <p className="panel-track">
                {currentTrack && currentTrack.artistName && currentTrack.trackTitle
                  ? `${currentTrack.artistName} - ${currentTrack.trackTitle}`
                  : 'Live station'}
              </p>
              <p className="panel-support">
                {statusLabel(state.playbackStatus)}
                {currentTrack?.fetchedAt ? ` • Updated ${formatRelativeTime(currentTrack.fetchedAt)}` : ''}
              </p>
            </div>

            <div className="panel-actions">
              <button type="button" className="primary-button" onClick={togglePlayback}>
                {state.playbackStatus === 'playing' ? 'Pause' : 'Play'}
              </button>
              <button type="button" className="secondary-button" onClick={toggleMute}>
                {state.isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button type="button" className="ghost-button" onClick={retryPlayback}>
                Retry
              </button>
            </div>

            <label className="page-column" htmlFor="panel-volume">
              <span className="microcopy">Volume</span>
              <input
                id="panel-volume"
                className="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.volume}
                onChange={(event) => {
                  setVolume(Number(event.currentTarget.value))
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
