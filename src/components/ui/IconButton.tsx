import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'neutral' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-gold-500 text-ink-1000 border-gold-500 hover:bg-gold-400',
  neutral: 'bg-ink-1000 text-white border-ink-1000 hover:bg-ink-700',
  subtle: 'bg-transparent text-white border-white/15 hover:bg-white/5',
  danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600',
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: Variant
  size?: Size
  'aria-label': string
}

export function IconButton({ icon, variant = 'subtle', size = 'md', className, disabled, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
