import { useEffect, useRef } from 'react'
import { analytics } from '../lib/analytics'
import { useAuth } from '../features/account/AuthProvider'

export function AccountPage() {
  const { errorMessage, isConfigured, renderGoogleButton, signOut, status, user } = useAuth()
  const buttonRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    renderGoogleButton(buttonRef.current)
  }, [renderGoogleButton])

  return (
    <div className="page-column">
      <section className="account-grid">
        <article className="account-panel">
          <span className="section-eyebrow">Account</span>
          <span className="section-title">Sync only what keeps the ritual intact</span>
          <p className="section-copy">
            Sign in to carry recents and playback preferences across devices. Listening stays public either way.
          </p>

          {status === 'authenticated' && user ? (
            <div className="account-mini-panel">
              <span className="account-name">{user.displayName}</span>
              <p className="account-copy">{user.email}</p>
              <div className="helper-row">
                <span className="microcopy">Recent stations and playback preferences are in sync.</span>
                <button type="button" className="secondary-button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </div>
          ) : isConfigured ? (
            <div className="account-button-slot">
              <div
                className="google-button-shell"
                role="button"
                tabIndex={0}
                onClick={() => {
                  analytics.track('sign_in_started')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    analytics.track('sign_in_started')
                  }
                }}
              >
                <div ref={buttonRef} />
              </div>
              {errorMessage ? <div className="error-card">{errorMessage}</div> : null}
            </div>
          ) : (
            <div className="empty-card">
              Add <span className="mono">VITE_GOOGLE_CLIENT_ID</span> to enable Google Sign-In.
            </div>
          )}
        </article>

        <aside className="account-panel">
          <span className="section-eyebrow">Listening stays open</span>
          <p className="section-copy">
            Public station browsing and playback never depend on account state. Sign-out only removes sync data and
            auth state.
          </p>
          <div className="account-mini-panel">
            <strong>What syncs in MVP</strong>
            <p className="account-copy">Last station, volume, mute state, and recent stations.</p>
          </div>
        </aside>
      </section>
    </div>
  )
}
