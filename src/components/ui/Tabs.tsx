import { cn } from '@/lib/utils'

interface TabsProps {
  tabs: string[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-white/10', className)}>
      {tabs.map((tab) => {
        const active = tab === value
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              'relative px-3.5 py-2.5 font-display text-sm font-bold tracking-[0.03em] uppercase transition-colors',
              active ? 'text-white' : 'text-white/50 hover:text-white/80',
            )}
          >
            {tab}
            <span
              className={cn('absolute inset-x-0 -bottom-px h-[2.5px] rounded-sm transition-colors', active ? 'bg-gold-500' : 'bg-transparent')}
            />
          </button>
        )
      })}
    </div>
  )
}
