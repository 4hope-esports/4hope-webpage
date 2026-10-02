import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'neutral' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-5.5 text-[17px] gap-2',
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-gold-500 text-ink-1000 border-gold-500 hover:bg-gold-400',
  neutral: 'bg-ink-1000 text-white border-ink-1000 hover:bg-ink-700',
  subtle: 'bg-transparent text-white border-white/15 hover:bg-white/5',
  danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  iconLeft?: ReactNode
  iconRight?: ReactNode
  full?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  full = false,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-display font-bold tracking-[0.01em] whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        full && 'flex w-full',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {iconLeft ? <span className="inline-flex shrink-0">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="inline-flex shrink-0">{iconRight}</span> : null}
    </button>
  )
}
