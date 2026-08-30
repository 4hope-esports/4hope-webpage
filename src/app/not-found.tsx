import Link from 'next/link'
import { GoldBars } from '@/components/ui/GoldBars'

const buttonPrimary =
  'inline-flex h-12 items-center justify-center rounded-lg border border-gold-500 bg-gold-500 px-5.5 font-display text-[17px] font-bold tracking-[0.01em] text-ink-1000 no-underline transition-colors hover:bg-gold-400'
const buttonSubtle =
  'inline-flex h-12 items-center justify-center rounded-lg border border-white/15 bg-transparent px-5.5 font-display text-[17px] font-bold tracking-[0.01em] text-white no-underline transition-colors hover:bg-white/5'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink-1000 text-white">
      <header className="relative flex items-center justify-between gap-6 border-b border-white/10 px-10 py-4">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="4Hope" className="h-[34px] w-auto" />
          <span className="font-mono text-[11px] tracking-[0.18em] text-white/45">4HOPE</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="block h-[7px] w-[7px] rounded-full bg-gold-500" />
          <span className="font-mono text-[11px] tracking-[0.16em] text-white/55">ALL SYSTEMS NORMAL</span>
        </div>
      </header>

      <main className="relative flex flex-1 items-center overflow-hidden px-10 py-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <GoldBars />
        </div>

        <div className="relative mx-auto w-full max-w-[900px]">
          <div className="mb-4.5 font-mono text-xs tracking-[0.22em] text-gold-500">// ERROR 404 — NOT FOUND</div>

          <div
            className="font-display font-black text-gold-500"
            style={{ fontSize: 'clamp(72px, 12vw, 148px)', letterSpacing: '-0.045em', lineHeight: 0.8 }}
          >
            404
          </div>

          <h1
            className="mt-5 max-w-[20ch] font-display font-extrabold uppercase text-white"
            style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', letterSpacing: '-0.02em', lineHeight: 1.02, maxWidth: 'min(20ch, 60%)' }}
          >
            WRONG LOBBY.
          </h1>

          <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-white/66" style={{ maxWidth: 'min(52ch, 54%)' }}>
            That page isn&apos;t on the roster. It may have been moved, renamed, or it never existed. Check the link, or
            start again from the home page.
          </p>

          <div className="mt-6.5 flex flex-wrap gap-3">
            <Link href="/" className={buttonPrimary}>
              Back to home
            </Link>
            <a href="https://discord.gg/59FFF4a5Q" target="_blank" rel="noopener noreferrer" className={buttonSubtle}>
              Report a problem
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-white/10 pt-4.5">
            <Link href="/#roster" className="border-b border-gold-500/40 pb-0.5 text-sm text-white/72 no-underline">
              Roster
            </Link>
            <Link href="/" className="border-b border-gold-500/40 pb-0.5 text-sm text-white/72 no-underline">
              Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-10 py-3.5">
        <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.1em] text-white/38">4HOPE.GG</span>
        <span className="font-mono text-[11px] tracking-[0.16em] text-white/28">FOUR TITLES. ONE SQUAD.</span>
      </footer>
    </div>
  )
}
