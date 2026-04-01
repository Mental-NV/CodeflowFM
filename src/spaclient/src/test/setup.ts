import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

class MockAudio extends EventTarget {
  src = ''
  volume = 1
  muted = false
  preload = 'none'
  crossOrigin: string | null = null

  play() {
    const rejection = (window as typeof window & { __mockAudioReject?: DOMException | null }).__mockAudioReject
    if (rejection) {
      return Promise.reject(rejection)
    }

    queueMicrotask(() => {
      this.dispatchEvent(new Event('playing'))
    })

    return Promise.resolve()
  }

  pause() {
    queueMicrotask(() => {
      this.dispatchEvent(new Event('pause'))
    })
  }

  load() {
    queueMicrotask(() => {
      this.dispatchEvent(new Event('loadstart'))
    })
  }

  removeAttribute(name: string) {
    if (name === 'src') {
      this.src = ''
    }
  }
}

class MockIntersectionObserver {
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  disconnect() {}

  observe(target: Element) {
    this.callback(
      [
        {
          isIntersecting: true,
          target,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }

  takeRecords() {
    return []
  }

  unobserve() {}
}

const storageState = new Map<string, string>()

const localStorageMock: Storage = {
  get length() {
    return storageState.size
  },
  clear() {
    storageState.clear()
  },
  getItem(key) {
    return storageState.get(key) ?? null
  },
  key(index) {
    return [...storageState.keys()][index] ?? null
  },
  removeItem(key) {
    storageState.delete(key)
  },
  setItem(key, value) {
    storageState.set(key, value)
  },
}

Object.defineProperty(window, 'Audio', {
  writable: true,
  value: MockAudio,
})

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
})

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

beforeEach(() => {
  ;(window as typeof window & { __mockAudioReject?: DOMException | null }).__mockAudioReject = null
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
