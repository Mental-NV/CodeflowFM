import type { PlaybackStatus } from './types'

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelativeTime(isoTimestamp: string) {
  const diffMilliseconds = Date.parse(isoTimestamp) - Date.now()
  const diffMinutes = Math.round(diffMilliseconds / 60_000)

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return relativeTimeFormatter.format(diffDays, 'day')
}

export function statusLabel(status: PlaybackStatus) {
  switch (status) {
    case 'idle':
      return 'Idle'
    case 'loading':
      return 'Loading'
    case 'buffering':
      return 'Buffering'
    case 'playing':
      return 'On Air'
    case 'paused':
      return 'Paused'
    case 'reconnecting':
      return 'Reconnecting'
    case 'error':
      return 'Signal lost'
  }
}

export function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value))
}
