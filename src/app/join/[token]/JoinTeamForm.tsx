'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Link2Off } from 'lucide-react'
import { Button, Card, GoldBars } from '@/components/ui'

export function JoinTeamForm() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamLogoURL, setTeamLogoURL] = useState<string | null>(null)
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    fetch('/api/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token }),
    })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace(`/login?callbackUrl=/join/${params.token}`)
          return
        }
        const data = await res.json()
        if (res.status === 412 && data.needsRegistration) {
          router.replace(`/register?callbackUrl=/join/${params.token}`)
          return
        }
        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || 'Could not join this team.')
          return
        }
        setTeamName(data.teamName)
        setTeamLogoURL(data.teamLogoURL ?? null)
        setAlreadyMember(Boolean(data.alreadyMember))
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      })
  }, [params.token, router])

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-ink-1000 p-6">
      <GoldBars />
      <Card tone="arena" className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-4 p-10 text-center shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        {status === 'loading' ? (
          <>
            <Loader2 size={28} className="animate-spin text-white/60" />
            <p className="text-white/70">Joining team…</p>
          </>
        ) : status === 'success' ? (
          <>
            {teamLogoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamLogoURL} alt="" className="h-16 w-16 rounded-[14px] object-cover" />
            ) : (
              <CheckCircle2 size={32} className="text-gold-500" />
            )}
            <h1 className="font-display text-xl font-extrabold uppercase text-white">
              {alreadyMember ? 'Already on the roster' : "You're in!"}
            </h1>
            <p className="text-white/70">
              {alreadyMember ? `You're already a member of ${teamName}.` : `You've joined ${teamName}.`}
            </p>
            <Button variant="primary" onClick={() => router.push('/profile')}>
              Go to your profile
            </Button>
          </>
        ) : (
          <>
            <Link2Off size={32} className="text-red-400" />
            <h1 className="font-display text-xl font-extrabold uppercase text-white">Couldn&apos;t join</h1>
            <p className="text-white/70">{message}</p>
            <Button variant="subtle" className="text-white" onClick={() => router.push('/profile')}>
              Back to profile
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
