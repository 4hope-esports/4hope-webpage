import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { GoldBars } from '@/components/ui/GoldBars'

const buttonPrimary =
  'inline-flex h-12 items-center justify-center rounded-lg border border-gold-500 bg-gold-500 px-5.5 font-display text-[17px] font-bold tracking-[0.01em] text-ink-1000 no-underline transition-colors hover:bg-gold-400'
const buttonSubtle =
  'inline-flex h-12 items-center justify-center rounded-lg border border-white/15 bg-transparent px-5.5 font-display text-[17px] font-bold tracking-[0.01em] text-white no-underline transition-colors hover:bg-white/5'

interface StatusErrorPageAction {
  label: string
  href?: string
  external?: boolean
  onClick?: () => void
  variant: 'primary' | 'subtle'
}

interface StatusErrorPageProps {
  discordUrl?: string
  kicker: string
  code: string
  heading: string
  description: string
  actions: StatusErrorPageAction[]
  links?: { label: string; href: string }[]
}

/** Shared full-bleed status page (404, 500, etc.) with the standard nav/hero/footer chrome. */
export function StatusErrorPage({ discordUrl = '', kicker, code, heading, description, actions, links }: StatusErrorPageProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink-1000 text-white">
      <Navigation discordUrl={discordUrl} />

      <main className="relative flex flex-1 items-center overflow-hidden px-10 py-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <GoldBars />
        </div>

        <div className="relative mx-auto w-full max-w-[900px]">
          <div className="mb-4.5 font-mono text-xs tracking-[0.22em] text-gold-500">{kicker}</div>

          <div
            className="font-display font-black text-gold-500"
            style={{ fontSize: 'clamp(72px, 12vw, 148px)', letterSpacing: '-0.045em', lineHeight: 0.8 }}
          >
            {code}
          </div>

          <h1
            className="mt-5 max-w-[20ch] font-display font-extrabold uppercase text-white"
            style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', letterSpacing: '-0.02em', lineHeight: 1.02, maxWidth: 'min(20ch, 60%)' }}
          >
            {heading}
          </h1>

          <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-white/66" style={{ maxWidth: 'min(52ch, 54%)' }}>
            {description}
          </p>

          <div className="mt-6.5 flex flex-wrap gap-3">
            {actions.map((action) => {
              const className = action.variant === 'primary' ? buttonPrimary : buttonSubtle
              if (action.external && action.href) {
                return (
                  <a key={action.label} href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {action.label}
                  </a>
                )
              }
              return action.href ? (
                <Link key={action.label} href={action.href} className={className}>
                  {action.label}
                </Link>
              ) : (
                <button key={action.label} type="button" onClick={action.onClick} className={className}>
                  {action.label}
                </button>
              )
            })}
          </div>

          {links && links.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-white/10 pt-4.5">
              {links.map((link) => (
                <Link key={link.label} href={link.href} className="border-b border-gold-500/40 pb-0.5 text-sm text-white/72 no-underline">
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-10 py-3.5">
        <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.1em] text-white/38">4HOPE.GG</span>
        <span className="font-mono text-[11px] tracking-[0.16em] text-white/28">FOUR TITLES. ONE SQUAD.</span>
      </footer>
    </div>
  )
}
