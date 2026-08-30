'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Avatar, Button, Card, FormField, GoldBars, Input, ValidatedInput } from '@/components/ui'

interface Account {
  name: string | null
  email: string | null
  picture: string | null
}

function defaultUsername(email: string | null): string {
  if (!email) return ''
  const localPart = email.split('@')[0] ?? ''
  return localPart.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24)
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/profile'
  const [account, setAccount] = useState<Account | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile/me')
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        const data = await res.json()
        if (data.exists) {
          router.replace(callbackUrl)
          return
        }
        setAccount(data.account)
        setUsername(defaultUsername(data.account.email))
        setDisplayName(data.account.name ?? '')
        setStatus('idle')
      })
      .catch(() => setError('Could not load your account. Please try signing in again.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const usernameValid = /^[A-Za-z0-9_-]{1,24}$/.test(username)
  const canSubmit = usernameValid && status === 'idle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch('/api/profile/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')
      router.push(callbackUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile. Please try again.')
      setStatus('idle')
    }
  }

  if (!account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-1000">
        <Loader2 size={24} className="animate-spin text-white/60" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-1000 p-6">
      <GoldBars />

      <Card tone="arena" className="relative z-10 w-full max-w-[440px] p-10 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        <div className="mb-7 flex flex-col items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="4Hope" className="h-12" />
          <h1 className="mt-2.5 text-center font-display text-[22px] font-black uppercase tracking-[-0.02em] text-white">
            Welcome to the squad
          </h1>
          <p className="text-center text-sm text-white/60">One last step — finish your profile to get in.</p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
          <Avatar src={account.picture} name={account.name ?? account.email ?? ''} size="lg" ring />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-white">{account.name ?? account.email}</div>
            <div className="truncate text-[13px] text-white/60">{account.email}</div>
          </div>
          <CheckCircle2 size={18} className="ml-auto shrink-0 text-gold-500" />
        </div>

        <form onSubmit={handleSubmit}>
          <ValidatedInput
            label="Player name"
            value={username}
            onChange={setUsername}
            validate={(v) => (/^[A-Za-z0-9_-]{1,24}$/.test(v) ? null : 'Letters, numbers, underscores, and hyphens only (max 24).')}
            hint="Letters, numbers, underscores, and hyphens only."
            placeholder="e.g. jreyes_gg"
            required
          />
          <FormField label="Display name" hint="Shown instead of your username on your profile." className="mt-4">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jordan Reyes"
              maxLength={40}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            full
            disabled={!canSubmit}
            iconLeft={status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : null}
            className="mt-5"
          >
            {status === 'saving' ? 'Setting up your profile…' : 'Enter the arena'}
          </Button>
        </form>

        {error ? <p className="mt-4 text-center text-sm text-red-400">{error}</p> : null}

        <p className="mt-5 text-center text-xs leading-relaxed text-white/60">
          Signed in as {account.email}. Not you?{' '}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gold-500 underline-offset-2 hover:underline"
          >
            Switch account
          </button>
        </p>
      </Card>
    </div>
  )
}
