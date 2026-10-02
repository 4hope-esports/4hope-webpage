import { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = { sm: 'h-9', md: 'h-[42px]', lg: 'h-12' }

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: Size
  iconLeft?: ReactNode
  iconRight?: ReactNode
  error?: boolean
  wrapperClassName?: string
}

export function Input({
  size = 'md',
  iconLeft,
  iconRight,
  error = false,
  disabled,
  className,
  wrapperClassName,
  ...rest
}: InputProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3.5 bg-ink-900 transition-colors box-border',
        'focus-within:border-gold-500 focus-within:ring-[3px] focus-within:ring-gold-500/26',
        error ? 'border-red-500' : 'border-white/15',
        disabled && 'opacity-60',
        SIZE_CLASSES[size],
        wrapperClassName,
      )}
    >
      {iconLeft ? <span className="inline-flex h-[18px] w-[18px] shrink-0 text-white/50">{iconLeft}</span> : null}
      <input
        disabled={disabled}
        className={cn('min-w-0 flex-1 border-none bg-transparent text-[15px] text-white outline-none placeholder:text-white/40', className)}
        {...rest}
      />
      {iconRight ? <span className="inline-flex h-[18px] w-[18px] shrink-0 text-white/50">{iconRight}</span> : null}
    </div>
  )
}
