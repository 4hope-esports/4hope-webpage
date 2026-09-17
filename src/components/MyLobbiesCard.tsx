'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Loader2, Trash2, Plus, Pencil } from 'lucide-react'
import { Button, Card, Dialog, Divider, IconButton, Tag, Tooltip } from '@/components/ui'
import { deleteOwnedLobby } from '@/lib/useLeaderboardLobby'

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
  const [deleteTarget, setDeleteTarget] = useState<LobbyRow | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const ok = await deleteOwnedLobby(deleteTarget.id)
    if (ok) setLobbies((prev) => (prev ? prev.filter((l) => l.id !== deleteTarget.id) : prev))
    setDeleting(false)
    setDeleteTarget(null)
  }

  const openCreate = () => router.push('/lobbies?openLobbyForm=1')

  return (
    <Card tone="arena" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{'// My lobbies'}</span>
        <Button variant="subtle" size="sm" iconLeft={<Plus size={14} />} onClick={openCreate}>
          Add lobby
        </Button>
      </div>
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
            <div
              key={lobby.id}
              className="flex items-center gap-3.5 rounded-[10px] border border-transparent px-3 py-3.5 hover:border-white/10 hover:bg-white/5"
            >
              <button
                type="button"
                onClick={() => router.push(`/lobbies/${lobby.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">{lobby.name}</span>
                  <Tag scheme={STATUS_SCHEME[lobby.status]} variant={lobby.status === 'live' ? 'solid' : 'subtle'} size="sm">
                    {STATUS_LABEL[lobby.status]}
                  </Tag>
                </div>
                <div className="mt-0.5 text-[13px] text-white/60">
                  {lobby.game} · {lobby.region} · {lobby.participantCount} participant{lobby.participantCount === 1 ? '' : 's'}
                </div>
              </button>
              <Tooltip label="Edit lobby">
                <IconButton
                  icon={<Pencil size={16} />}
                  variant="subtle"
                  aria-label={`Edit ${lobby.name}`}
                  className="text-white/60 hover:text-white"
                  onClick={() => router.push(`/lobbies/${lobby.id}?edit=1`)}
                />
              </Tooltip>
              <Tooltip label="Delete lobby">
                <IconButton
                  icon={<Trash2 size={16} />}
                  variant="subtle"
                  aria-label={`Delete ${lobby.name}`}
                  className="text-white/60 hover:text-red-400"
                  onClick={() => setDeleteTarget(lobby)}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        title="Delete this lobby?"
        onClose={deleting ? undefined : () => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="subtle" className="text-white" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete lobby'}
            </Button>
          </>
        }
      >
        This permanently removes <strong className="text-white">{deleteTarget?.name}</strong> and its leaderboard — anyone
        with the link will see it as not found. This can&apos;t be undone.
      </Dialog>
    </Card>
  )
}
