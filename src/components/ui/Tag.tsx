import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Scheme = 'brand' | 'neutral' | 'positive' | 'warning' | 'danger'

const SCHEME_CLASSES: Record<Scheme, string> = {
  brand: 'bg-gold-500/15 text-gold-400',
  neutral: 'bg-white/10 text-white/70',
  positive: 'bg-green-500/15 text-green-400',
  warning: 'bg-yellow-400/15 text-yellow-300',
  danger: 'bg-red-500/15 text-red-400',
}

interface TagProps {
  children: ReactNode
  scheme?: Scheme
  size?: 'sm' | 'md'
  className?: string
}

export function Tag({ children, scheme = 'neutral', size = 'md', className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-display font-semibold tracking-[0.02em] uppercase leading-none',
        size === 'sm' ? 'h-5 px-2 text-xs' : 'h-6 px-2.5 text-[13px]',
        SCHEME_CLASSES[scheme],
        className,
      )}
    >
      {children}
    </span>
  )
}
