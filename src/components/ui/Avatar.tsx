'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_PX: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 }

interface AvatarProps {
  src?: string | null
  name?: string
  size?: Size
  ring?: boolean
  className?: string
}

export function Avatar({ src = null, name = '', size = 'md', ring = false, className }: AvatarProps) {
  const dim = SIZE_PX[size]
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-ink-700 text-gold-500 font-display font-extrabold overflow-hidden box-border',
        ring && 'ring-2 ring-gold-500',
        className,
      )}
      style={{ width: dim, height: dim, fontSize: dim * 0.38 }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/clover-mark.png" alt="" className="h-[55%] w-[55%] opacity-85" />
      )}
    </span>
  )
}
