import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}

export function Switch({ checked, onChange, disabled = false, label, className }: SwitchProps) {
  return (
    <label className={cn('inline-flex items-center gap-2.5', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', className)}>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-gold-500' : 'bg-white/15',
        )}
      >
        <span
          className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-all"
          style={{ left: checked ? 19 : 3 }}
        />
      </span>
      {label ? <span className="text-[15px] text-white">{label}</span> : null}
    </label>
  )
}
