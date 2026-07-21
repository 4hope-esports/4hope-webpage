import { Newspaper } from 'lucide-react'

export function NewsSection() {
  return (
    <section id="news" className="relative bg-ink-800 px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs font-medium tracking-[0.12em] uppercase text-gold-500">// Latest</span>
        <h2 className="font-display font-[900] text-[clamp(1.5rem,4vw,2.25rem)] uppercase tracking-tight">News</h2>
        <p className="max-w-md text-sm leading-relaxed text-white/60">
          Recaps, roster moves, and announcements — nothing posted yet, first drop is coming.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-[14px] border border-dashed border-white/10 bg-ink-1000 p-6"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/30">
              <Newspaper size={18} />
            </div>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-white/35">Coming soon</span>
          </div>
        ))}
      </div>
    </section>
  )
}
