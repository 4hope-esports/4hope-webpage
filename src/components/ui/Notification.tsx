import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationType = 'info' | 'positive' | 'warning' | 'danger'

const ACCENT_CLASSES: Record<NotificationType, string> = {
  info: 'before:bg-gold-500',
  positive: 'before:bg-green-500',
  warning: 'before:bg-yellow-400',
  danger: 'before:bg-red-500',
}

interface NotificationProps {
  title?: string
  children?: ReactNode
  type?: NotificationType
  icon?: ReactNode
  onClose?: () => void
  className?: string
}

export function Notification({ title, children, type = 'info', icon, onClose, className }: NotificationProps) {
  return (
    <div
      className={cn(
        'relative flex w-full max-w-[420px] gap-3 overflow-hidden rounded-[10px] border border-white/10 bg-ink-800 p-3.5 pl-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)] box-border',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        ACCENT_CLASSES[type],
        className,
      )}
    >
      {icon ? <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 text-white/80">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-display text-[15px] font-bold text-white">{title}</div> : null}
        {children ? <div className="mt-0.5 text-sm leading-snug text-white/70">{children}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="inline-flex h-fit shrink-0 border-none bg-transparent p-0.5 text-white/40 hover:text-white/70"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}
