import { Gamepad2, Swords, UserRound } from 'lucide-react'

const GAMES = [
  {
    name: 'League of Legends',
    icon: Swords,
    slots: 5,
    blurb: '5v5 squad grinding ranked and scrims.',
  },
  {
    name: 'Teamfight Tactics',
    icon: Gamepad2,
    slots: 1,
    blurb: 'Solo climbers repping the crest.',
  },
]

export function TeamsSection() {
  return (
    <section id="teams" className="relative bg-ink-800 px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
        <span className="font-mono text-xs font-medium tracking-[0.12em] uppercase text-gold-500">// Our roster</span>
        <h2 className="font-display font-[900] text-[clamp(1.5rem,4vw,2.25rem)] uppercase tracking-tight">Teams</h2>
        <p className="max-w-md text-sm leading-relaxed text-white/60">
          One crest, two games. Rosters are locking in — check back or hop in Discord to snag a spot.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {GAMES.map((game) => (
          <div
            key={game.name}
            className="rounded-[14px] border border-white/10 bg-ink-1000 p-6 transition-colors hover:border-gold-500/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/10 text-gold-500">
                <game.icon size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-display text-sm font-bold uppercase tracking-wide">{game.name}</h3>
                <p className="text-xs text-white/50">{game.blurb}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: game.slots }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/15 text-white/25"
                  title="Roster announcing soon"
                >
                  <UserRound size={16} />
                </div>
              ))}
            </div>

            <span className="mt-4 inline-block font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-white/35">
              Roster announcing soon
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
