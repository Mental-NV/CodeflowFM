declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
    readonly VITE_GOOGLE_CLIENT_ID?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            use_fedcm_for_prompt?: boolean
          }): void
          prompt(): void
          renderButton(
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'continue_with'
              shape?: 'pill' | 'rectangular'
              width?: number
            },
          ): void
          disableAutoSelect(): void
        }
      }
    }
  }
}

declare module '@fontsource-variable/jetbrains-mono'
declare module '@fontsource-variable/space-grotesk'

export {}
