interface TitleSlideProps {
  kicker?: string
  heading: [string, string]
  subheading: string
  discordUrl: string
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

const BARS = [
  { w: 360, t: -20, l: -60 },
  { w: 220, t: 120, l: 60 },
  { w: 420, b: -30, r: -50 },
  { w: 180, b: 90, r: 220 },
] as const

export function TitleSlide({
  kicker = '// TFT + League',
  heading,
  subheading,
  discordUrl,
}: TitleSlideProps) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-1000 px-7 pb-14 pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
        {BARS.map((b, i) => (
          <span
            key={i}
            className={`absolute h-10 -rotate-[32deg] rounded bg-gold-500 ${i % 2 ? 'opacity-85' : ''}`}
            style={{
              width: b.w,
              top: 't' in b ? b.t : undefined,
              left: 'l' in b ? b.l : undefined,
              bottom: 'b' in b ? b.b : undefined,
              right: 'r' in b ? b.r : undefined,
            }}
          />
        ))}
        <span className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-ink-1000)_30%,rgba(12,12,13,0.4)_70%)]" />
      </div>

      <div className="relative max-w-[620px]">
        <div className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-gold-500">{kicker}</div>

        <h1 className="m-0 font-display text-[clamp(2.75rem,7.5vw,4.75rem)] font-black uppercase leading-[0.92] tracking-[-0.02em] text-white">
          {heading[0]}
          <br />
          {heading[1].split(' ').map((word, i, arr) => (
            <span key={i}>
              {i === arr.length - 1 ? <span className="text-gold-500">{word}</span> : `${word} `}
            </span>
          ))}
        </h1>

        <p className="mt-5 max-w-[460px] text-lg leading-relaxed text-white/70">{subheading}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-lg bg-gold-500 px-6 py-3 font-display text-base font-extrabold uppercase tracking-wide text-ink-1000 no-underline transition-colors hover:bg-gold-400"
          >
            <DiscordIcon />
            Meet the squad
          </a>
        </div>
      </div>
    </section>
  )
}
