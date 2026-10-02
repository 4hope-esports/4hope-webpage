'use client'

import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Notification } from './Notification'

interface Toast {
  id: number
  title?: string
  message?: string
  type: 'info' | 'positive' | 'warning' | 'danger'
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<Toast['type'], ReactNode> = {
  positive: <CheckCircle2 size={20} />,
  danger: <XCircle size={20} />,
  info: null,
  warning: null,
}

const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { ...toast, id }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Notification title={t.title} type={t.type} icon={ICONS[t.type]} onClose={() => dismiss(t.id)}>
              {t.message}
            </Notification>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
