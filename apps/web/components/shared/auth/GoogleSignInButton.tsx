'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/core/utils/cn'

interface GoogleSignInButtonProps {
  callbackUrl?: string | null
  className?: string
  text?: string
  showDivider?: boolean
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (parent: HTMLElement, options: any) => void
        }
      }
    }
  }
}

export function GoogleSignInButton({ callbackUrl, className, text = 'Continue with Google', showDivider = true }: GoogleSignInButtonProps) {
  const [btnWidth, setBtnWidth] = useState(340)
  const containerRef = useRef<HTMLDivElement>(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  const isInitializedRef = useRef(false)

  // Measure container width for GSI render
  useEffect(() => {
    if (!containerRef.current) return
    const updateWidth = () => {
      if (containerRef.current) {
        const measured = containerRef.current.offsetWidth
        if (measured > 0) {
          setBtnWidth(Math.min(Math.max(measured, 200), 450))
        }
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!clientId) return

    const scriptId = 'google-gsi-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const initializeGsi = () => {
      if (window.google?.accounts?.id) {
        if (!isInitializedRef.current) {
          const loginUri = new URL('/api/auth/google', window.location.origin)
          const requestedCallback = callbackUrl || new URLSearchParams(window.location.search).get('callbackUrl') || new URLSearchParams(window.location.search).get('redirect')
          if (requestedCallback) loginUri.searchParams.set('callbackUrl', requestedCallback)

          window.google.accounts.id.initialize({
            client_id: clientId,
            ux_mode: 'redirect',
            login_uri: loginUri.toString(),
            auto_select: false,
          })
          isInitializedRef.current = true
        }

        const buttonContainer = containerRef.current?.querySelector<HTMLDivElement>('#google-signin-btn-container')
        if (buttonContainer) {
          buttonContainer.replaceChildren()
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            width: String(btnWidth),
            text: text.toLowerCase().startsWith('sign up') ? 'signup_with' : 'signin_with',
            shape: 'pill',
            locale: 'en',
            logo_alignment: 'center',
          })
        }
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeGsi
      document.head.appendChild(script)
    } else {
      initializeGsi()
    }
  }, [clientId, callbackUrl, btnWidth, text])

  if (!clientId) {
    return null
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Sleek Divider */}
      {showDivider && (
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs font-black uppercase tracking-widest">
            <span className="bg-card px-3 text-muted-foreground">or</span>
          </div>
        </div>
      )}

      {/* Google Button Container */}
      <div ref={containerRef} className="relative w-full">
        <div id="google-signin-btn-container" className="w-full flex justify-center" />
      </div>
    </div>
  )
}
