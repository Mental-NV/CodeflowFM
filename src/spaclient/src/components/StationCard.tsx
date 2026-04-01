import { useEffect, useRef } from 'react'
import { analytics } from '../lib/analytics'
import type { PlaybackStatus, StationSummary } from '../lib/types'

interface StationCardProps {
  station: StationSummary
  isActive: boolean
  playbackStatus: PlaybackStatus
  onSelect(): void
}

export function StationCard({ station, isActive, playbackStatus, onSelect }: StationCardProps) {
  const ref = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            analytics.trackStationImpression(station.key)
            observer.disconnect()
            break
          }
        }
      },
      {
        threshold: 0.45,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [station.key])

  const buttonLabel = isActive
    ? playbackStatus === 'paused' || playbackStatus === 'error'
      ? 'Resume station'
      : 'On Air'
    : 'Start listening'

  return (
    <button
      ref={ref}
      type="button"
      className="station-card"
      data-active={isActive}
      style={
        {
          '--station-primary': station.accentColor,
          '--station-secondary': station.secondaryAccentColor,
        } as React.CSSProperties
      }
      onClick={onSelect}
      aria-label={`${station.name}. ${station.descriptor}. ${buttonLabel}.`}
    >
      <div className="station-accent" aria-hidden="true" />
      <div className="station-header">
        <div>
          <span className="station-title">{station.name}</span>
          <span className="station-meta">{station.descriptor}</span>
        </div>
        <span className="status-chip" data-variant={isActive ? 'live' : 'default'}>
          {isActive ? <span className="status-dot" aria-hidden="true" /> : null}
          {isActive ? 'On Air' : station.mood}
        </span>
      </div>
      <p className="station-description">{station.description}</p>
      <div className="station-footer">
        <span className="microcopy">{station.descriptor}</span>
        <span className="ghost-button" aria-hidden="true">
          {buttonLabel}
        </span>
      </div>
    </button>
  )
}
