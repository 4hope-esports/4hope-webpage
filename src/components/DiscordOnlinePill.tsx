'use client'

import { useEffect, useState } from 'react'

const AVATAR_COUNT = 5

function formatCount(count: number): string {
  if (count < 1000) return String(count)
  return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k`
}

export function DiscordOnlinePill() {
  const [online, setOnline] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/discord/count')
      .then((res) => res.json())
      .then((data: { online: number | null }) => {
        if (!cancelled) setOnline(data.online)
      })
      .catch(() => {
        if (!cancelled) setOnline(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (online === null) return null

  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex -space-x-2.5">
        {Array.from({ length: AVATAR_COUNT }).map((_, i) => (
          <span
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-700 ring-2 ring-ink-1000"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/clover-mark.png" alt="" className="h-4.5 w-4.5 opacity-85" />
          </span>
        ))}
      </div>
      <span className="text-sm text-white/70">
        <span className="font-semibold text-white">+{formatCount(online)}</span> online, join
      </span>
    </div>
  )
}
