import { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

const PLACEMENT_CLASSES = {
  top: 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
  right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
} as const

interface TooltipProps {
  label: string
  placement?: keyof typeof PLACEMENT_CLASSES
  children: ReactNode
  className?: string
}

export function Tooltip({ label, placement = 'top', children, className }: TooltipProps) {
  const [show, setShow] = useState(false)
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show ? (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink-1000 px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-lg',
            PLACEMENT_CLASSES[placement],
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
