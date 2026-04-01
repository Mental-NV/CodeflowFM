import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

const stations = [
  {
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
  },
  {
    key: 'minimal',
    name: 'Minimal',
    descriptor: 'Clean mental space',
    description: 'Sparse pulses for deliberate focus and technical clarity.',
    streamUrl: '/media/stations/minimal.mp3',
    artworkUrl: null,
    accentColor: '#59E1D9',
    secondaryAccentColor: '#4DA3FF',
    mood: 'Precise',
    sortOrder: 2,
  },
]

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function installFetchMock() {
  const fetchMock: typeof fetch = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)

    if (url.endsWith('/api/v1/stations')) {
      return Promise.resolve(createJsonResponse(stations))
    }

    if (url.endsWith('/api/v1/stations/ambient/now-playing')) {
      return Promise.resolve(createJsonResponse(
        {
          stationKey: 'ambient',
          stationName: 'Ambient',
          trackTitle: 'Threaded Light',
          artistName: 'North Array',
          artworkUrl: null,
          startedAt: '2026-04-01T00:00:00Z',
          durationSeconds: 280,
          fetchedAt: '2026-04-01T00:02:00Z',
          isLive: true,
        },
        200,
      ))
    }

    if (url.endsWith('/api/v1/stations/minimal/now-playing')) {
      return Promise.resolve(createJsonResponse(
        {
          title: 'Metadata provider unavailable.',
        },
        503,
      ))
    }

    return Promise.resolve(createJsonResponse({}))
  })

  globalThis.fetch = fetchMock
}

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    installFetchMock()
  })

  it('starts playback and reflects the active station', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Ambient/i }))

    await waitFor(async () => {
      expect(await screen.findByRole('button', { name: 'Pause station' })).toBeInTheDocument()
    })

    expect(screen.getAllByText('On Air').length).toBeGreaterThan(0)
  })

  it('shows continue session when autoplay is blocked during restore', async () => {
    window.localStorage.setItem(
      'codeflowfm.session',
      JSON.stringify({
        lastStationKey: 'ambient',
        volume: 0.72,
        isMuted: false,
        recentStations: [{ stationKey: 'ambient', playedAt: '2026-04-01T00:00:00Z' }],
        updatedAt: '2026-04-01T00:00:00Z',
      }),
    )
    ;(window as typeof window & { __mockAudioReject?: DOMException | null }).__mockAudioReject = new DOMException(
      'Autoplay blocked',
      'NotAllowedError',
    )

    render(<App />)

    expect(await screen.findByRole('button', { name: /Continue Session/i })).toBeInTheDocument()
  })

  it('shows account setup copy when Google Sign-In is not configured', async () => {
    window.history.pushState({}, '', '/account')
    render(<App />)

    expect(await screen.findByText(/VITE_GOOGLE_CLIENT_ID/)).toBeInTheDocument()
  })
})
