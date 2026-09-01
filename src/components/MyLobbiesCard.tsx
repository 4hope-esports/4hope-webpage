'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Loader2 } from 'lucide-react'
import { Card, Divider, Tag } from '@/components/ui'

interface LobbyRow {
  id: string
  name: string
  game: string
  region: string
  status: 'open' | 'live' | 'ended'
  scheduledStartTime: string | null
  participantCount: number
  createdAt: string
}

const STATUS_SCHEME = { open: 'positive', live: 'brand', ended: 'neutral' } as const
const STATUS_LABEL = { open: 'OPEN', live: 'LIVE', ended: 'ENDED' } as const

function EmptyRow({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-9 text-center">
      {icon}
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="max-w-80 text-[13px] text-white/60">{hint}</span>
    </div>
  )
}

export function MyLobbiesCard() {
  const router = useRouter()
  const [lobbies, setLobbies] = useState<LobbyRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/lobby/mine', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { lobbies: [] }))
      .then((data) => {
        if (!cancelled) setLobbies(data.lobbies ?? [])
      })
      .catch(() => {
        if (!cancelled) setLobbies([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card tone="arena" className="p-6">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{'// My lobbies'}</span>
      <Divider className="mt-3" />
      {lobbies === null ? (
        <div className="flex items-center justify-center gap-2 py-9 font-mono text-xs text-white/50">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : lobbies.length === 0 ? (
        <EmptyRow
          icon={<Users size={26} className="text-white/50" />}
          title="No lobbies yet"
          hint="Open one from the Lobbies directory to see it here."
        />
      ) : (
        <div className="flex flex-col gap-1 py-1">
          {lobbies.map((lobby) => (
            <button
              key={lobby.id}
              type="button"
              onClick={() => router.push(`/tournament/leaderboard/${lobby.id}`)}
              className="flex items-center gap-3.5 rounded-[10px] border border-transparent px-3 py-3.5 text-left hover:border-white/10 hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">{lobby.name}</span>
                  <Tag scheme={STATUS_SCHEME[lobby.status]} size="sm">
                    {STATUS_LABEL[lobby.status]}
                  </Tag>
                </div>
                <div className="mt-0.5 text-[13px] text-white/60">
                  {lobby.game} · {lobby.region} · {lobby.participantCount} participant{lobby.participantCount === 1 ? '' : 's'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
