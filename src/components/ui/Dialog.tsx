import { ReactNode, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  title: string
  children: ReactNode
  onClose?: () => void
  actions?: ReactNode
  className?: string
  /** Whether clicking the backdrop closes the dialog. Defaults to true; set false to require Cancel/X (backdrop click shakes the dialog instead). */
  closeOnBackdropClick?: boolean
}

export function Dialog({ open, title, children, onClose, actions, className, closeOnBackdropClick = true }: DialogProps) {
  const [shaking, setShaking] = useState(false)
  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!open) return null

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose?.()
      return
    }
    setShaking(true)
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current)
    shakeTimeout.current = setTimeout(() => setShaking(false), 400)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" onClick={handleBackdropClick}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-[460px] rounded-[14px] border border-white/10 bg-ink-800 shadow-[0_24px_60px_rgba(0,0,0,0.4)] box-border',
          shaking && 'animate-[dialog-shake_0.4s_ease-in-out]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 rounded-t-[14px] px-5.5 pt-5">
          <h3 className="m-0 font-display text-xl font-extrabold tracking-[-0.01em] text-white">{title}</h3>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex shrink-0 border-none bg-transparent p-0.5 text-white/50 hover:text-white"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>
        <div className="px-5.5 pb-5 pt-3 text-[15px] leading-relaxed text-white/70">{children}</div>
        {actions ? (
          <div className="flex justify-end gap-2.5 rounded-b-[14px] border-t border-white/10 bg-white/[0.02] px-5.5 py-4">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
