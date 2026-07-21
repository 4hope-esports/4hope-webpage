import { CalendarClock } from 'lucide-react'

const COLUMNS = ['Opponent', 'Game', 'Date', 'Result']

export function MatchesSection() {
  return (
    <section id="matches" className="relative bg-ink-1000 px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs font-medium tracking-[0.12em] uppercase text-gold-500">// Schedule</span>
        <h2 className="font-display font-[900] text-[clamp(1.5rem,4vw,2.25rem)] uppercase tracking-tight">
          Matches
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-white/60">
          Scrims and series land here once rosters go live. First call-time drops soon.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-[14px] border border-white/10">
        <div className="grid grid-cols-4 border-b border-white/10 bg-ink-800 px-5 py-3">
          {COLUMNS.map((col) => (
            <span key={col} className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-white/40">
              {col}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/30">
            <CalendarClock size={22} />
          </div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-white/70">
            No matches scheduled yet
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-white/45">
            Follow along in Discord — that&apos;s where we post lobby codes and call-times first.
          </p>
        </div>
      </div>
    </section>
  )
}
