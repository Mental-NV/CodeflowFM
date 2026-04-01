type AnalyticsEventName =
  | 'app_opened'
  | 'station_impression'
  | 'station_selected'
  | 'playback_requested'
  | 'playback_started'
  | 'playback_paused'
  | 'playback_resumed'
  | 'playback_failed'
  | 'playback_reconnected'
  | 'station_switched'
  | 'recent_station_selected'
  | 'now_playing_opened'
  | 'session_restored'
  | 'volume_changed'
  | 'sign_in_started'
  | 'sign_in_completed'
  | 'sign_out_completed'

interface AnalyticsPayload {
  [key: string]: string | number | boolean | null | undefined
}

class ConsoleAnalytics {
  private readonly sessionId = crypto.randomUUID()
  private readonly seenImpressions = new Set<string>()

  track(eventName: AnalyticsEventName, payload: AnalyticsPayload = {}) {
    console.info('[analytics]', {
      eventName,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...payload,
    })
  }

  trackStationImpression(stationKey: string) {
    if (this.seenImpressions.has(stationKey)) {
      return
    }

    this.seenImpressions.add(stationKey)
    this.track('station_impression', { stationKey })
  }
}

export const analytics = new ConsoleAnalytics()
