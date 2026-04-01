import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { analytics } from '../../lib/analytics'
import { bootstrapGoogleSession } from '../../lib/api'
import { getSignedOutPreference, setSignedOutPreference } from '../../lib/storage'
import type { AuthBootstrapResponse, UserProfile } from '../../lib/types'

interface AuthContextValue {
  status: 'anonymous' | 'loading' | 'authenticated'
  token: string | null
  user: UserProfile | null
  bootstrap: AuthBootstrapResponse | null
  isConfigured: boolean
  errorMessage: string | null
  renderGoogleButton(container: HTMLElement | null): void
  signOut(): void
}

const googleIdentityScript = 'https://accounts.google.com/gsi/client'
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthContextValue['status']>('anonymous')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [bootstrap, setBootstrap] = useState<AuthBootstrapResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  const isConfigured = googleClientId.length > 0
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!isConfigured) {
      return
    }

    let cancelled = false
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${googleIdentityScript}"]`)

    const initialize = () => {
      if (cancelled || isInitializedRef.current || !window.google) {
        return
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          const credential = response.credential
          if (!credential) {
            return
          }

          setStatus('loading')
          setErrorMessage(null)

          void bootstrapGoogleSession(credential)
            .then((payload) => {
              setToken(credential)
              setUser(payload.user)
              setBootstrap(payload)
              setStatus('authenticated')
              setSignedOutPreference(false)
              analytics.track('sign_in_completed', {
                email: payload.user.email,
              })
            })
            .catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : 'Sign-in did not complete.')
              setStatus('anonymous')
            })
        },
        auto_select: true,
        use_fedcm_for_prompt: true,
      })

      if (!getSignedOutPreference()) {
        window.google.accounts.id.prompt()
      }

      isInitializedRef.current = true
    }

    if (existingScript && window.google) {
      initialize()
      return () => {
        cancelled = true
      }
    }

    const script = document.createElement('script')
    script.src = googleIdentityScript
    script.async = true
    script.defer = true
    script.onload = initialize
    document.head.append(script)

    return () => {
      cancelled = true
    }
  }, [googleClientId, isConfigured])

  const renderGoogleButton = useCallback((container: HTMLElement | null) => {
    if (!container || !window.google || !isConfigured) {
      return
    }

    container.innerHTML = ''
    window.google.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320,
    })
  }, [isConfigured])

  const signOut = useCallback(() => {
    window.google?.accounts.id.disableAutoSelect()
    setSignedOutPreference(true)
    setToken(null)
    setUser(null)
    setBootstrap(null)
    setStatus('anonymous')
    setErrorMessage(null)
    queryClient.removeQueries({ queryKey: ['server-recents'] })
    analytics.track('sign_out_completed')
  }, [queryClient])

  const contextValue = useMemo<AuthContextValue>(() => ({
    status,
    token,
    user,
    bootstrap,
    isConfigured,
    errorMessage,
    renderGoogleButton,
    signOut,
  }), [
    bootstrap,
    errorMessage,
    isConfigured,
    renderGoogleButton,
    signOut,
    status,
    token,
    user,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
