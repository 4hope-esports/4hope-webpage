import { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ error = false, disabled, className, ...rest }: TextareaProps) {
  return (
    <textarea
      disabled={disabled}
      className={cn(
        'w-full resize-y rounded-lg border bg-ink-900 px-3.5 py-2.5 text-[15px] text-white outline-none transition-colors box-border',
        'placeholder:text-white/40 focus:border-gold-500 focus:ring-[3px] focus:ring-gold-500/26',
        error ? 'border-red-500' : 'border-white/15',
        disabled && 'opacity-60',
        className,
      )}
      {...rest}
    />
  )
}
