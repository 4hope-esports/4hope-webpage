import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function FormField({ label, hint, error, required, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="font-display text-[13px] font-bold tracking-[0.04em] uppercase text-white/60">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="text-sm text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-sm text-white/50">{hint}</span>
      ) : null}
    </div>
  )
}
