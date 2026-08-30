'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { Button, Card, GoldBars } from '@/components/ui'

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.5 24c0-1.6-.15-3.15-.42-4.64H24v9.02h12.06c-.52 2.8-2.1 5.17-4.48 6.76v5.61h7.23C43.16 36.9 45.5 30.98 45.5 24z" />
      <path fill="#34A853" d="M24 46c6.03 0 11.08-2 14.81-5.25l-7.23-5.61c-2.01 1.35-4.58 2.16-7.58 2.16-5.83 0-10.77-3.93-12.53-9.22H4.05v5.79C7.7 41.14 15.2 46 24 46z" />
      <path fill="#FBBC05" d="M11.47 27.08A13.9 13.9 0 0 1 10.75 24c0-1.07.18-2.1.5-3.08v-5.79H4.05A21.9 21.9 0 0 0 2 24c0 3.55.85 6.9 2.05 9.87l7.42-5.79z" />
      <path fill="#EA4335" d="M24 10.75c3.28 0 6.22 1.13 8.53 3.33l6.4-6.4C34.86 3.9 29.9 2 24 2 15.2 2 7.7 6.86 4.05 14.13l7.42 5.79c1.76-5.29 6.7-9.17 12.53-9.17z" />
    </svg>
  )
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  const handleGoogleLogin = () => {
    setStatus('loading')
    signIn('google', { callbackUrl: searchParams.get('callbackUrl') || '/register' })
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-ink-1000 p-6">
      <GoldBars />

      <Card tone="arena" className="relative z-10 w-full max-w-[400px] p-10 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        <div className="mb-8 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="4Hope" className="h-14" />
          <h1 className="text-center font-display text-[22px] font-black uppercase tracking-[-0.02em] text-white">
            Sign in to 4Hope
          </h1>
          <p className="text-center text-sm text-white/60">Your squad, your stats, your matches — all in one place.</p>
        </div>

        <Button
          variant="primary"
          size="lg"
          full
          disabled={status === 'loading'}
          onClick={handleGoogleLogin}
          iconLeft={status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <GoogleG size={18} />}
          className="border border-black/10 bg-white text-[#1f1f1f] hover:bg-white/90"
        >
          {status === 'loading' ? 'Signing in…' : 'Continue with Google'}
        </Button>

        <p className="mt-6 text-center text-xs leading-relaxed text-white/60">
          Only Gmail accounts can sign in right now. By continuing you agree to the 4Hope Terms and Privacy Policy.
        </p>
      </Card>
    </div>
  )
}
