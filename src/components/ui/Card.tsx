import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'arena'
}

export function Card({ tone = 'default', className, children, ...rest }: CardProps) {
  const dark = tone === 'arena'
  return (
    <div
      className={cn(
        'rounded-[14px] border box-border',
        dark ? 'bg-ink-800 border-white/10 text-white' : 'bg-white border-black/10 text-ink-1000',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
