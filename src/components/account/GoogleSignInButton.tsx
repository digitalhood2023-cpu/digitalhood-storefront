import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: string | number
            }
          ) => void
        }
      }
    }
  }
}

type GoogleSignInButtonProps = {
  mode?: 'login' | 'register'
  onCredential: (credential: string) => Promise<void> | void
  disabled?: boolean
}

const GOOGLE_SCRIPT_ID = 'google-identity-services-script'

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google sign-in is only available in the browser.'))
      return
    }

    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load Google sign-in.')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true

    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Unable to load Google sign-in.'))

    document.head.appendChild(script)
  })
}

export default function GoogleSignInButton({
  mode = 'login',
  onCredential,
  disabled = false,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState('')

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  useEffect(() => {
    let mounted = true

    async function initializeGoogle() {
      setError('')

      if (!googleClientId) {
        setError('Google sign-in is not configured yet.')
        return
      }

      try {
        await loadGoogleIdentityScript()

        if (!mounted || !buttonRef.current || !window.google?.accounts?.id) {
          return
        }

        buttonRef.current.innerHTML = ''

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) {
              setError('Google did not return a sign-in credential.')
              return
            }

            await onCredential(response.credential)
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        })
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to prepare Google sign-in.'
        )
      }
    }

    initializeGoogle()

    return () => {
      mounted = false
    }
  }, [googleClientId, mode, onCredential])

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="flex h-12 w-full items-center justify-center rounded-full border border-dh-light-gray bg-gray-100 text-sm font-semibold text-gray-400"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        Google sign-in loading...
      </button>
    )
  }

  return (
    <div>
      <div className="flex justify-center" ref={buttonRef} />

      {error && (
        <p className="mt-2 text-center text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
