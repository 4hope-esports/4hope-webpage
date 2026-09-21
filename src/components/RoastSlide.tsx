import Image from 'next/image'

interface RoastPlayer {
  initials: string
  name: string
  tier: string
  lp: number
  region: string
  avatarUrl?: string
  ladderRank?: number | null
}

interface RoastSlideProps {
  kicker?: string
  heading?: string
  players: RoastPlayer[]
}

export function RoastSlide({
  kicker = '// TFT · roast report',
  heading = 'The roster',
  players,
}: RoastSlideProps) {
  return (
    <section className="relative isolate w-full overflow-hidden bg-ink-1000 px-8 py-20 sm:px-20">
      <div className="pointer-events-none absolute -right-24 -top-10 h-8 w-[220px] -rotate-[32deg] rounded-md bg-gold-500 sm:-right-16 sm:-top-4 sm:h-12 sm:w-[360px]" />

      <span className="relative font-mono text-lg uppercase tracking-[0.16em] text-gold-500">{kicker}</span>

      <h2 className="relative mb-12 mt-3 font-display text-[clamp(2.25rem,6vw,4.5rem)] font-black uppercase leading-none tracking-[-0.02em] text-white">
        {heading}
      </h2>

      <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2">
        {players.map((player) => (
          <div
            key={player.name}
            className="rounded-2xl border border-white/10 bg-ink-800 p-6"
          >
            <div className="flex items-center gap-4">
              {player.avatarUrl ? (
                <Image
                  src={player.avatarUrl}
                  alt={player.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-full shadow-[0_0_0_2px_var(--color-gold-500)]"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-700 font-display text-xl font-black text-gold-500 shadow-[0_0_0_2px_var(--color-gold-500)]">
                  {player.initials}
                </div>
              )}
              <div>
                <div className="font-display text-lg font-extrabold text-white">{player.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs uppercase tracking-[0.06em] text-white/50">
                  <span className="text-gold-500">{player.tier}</span>
                  <span aria-hidden>·</span>
                  <span>{player.lp} LP</span>
                </div>
                {(player.region || player.ladderRank) && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-ink-900 px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.04em] text-white">
                    {player.region && <span>{player.region}</span>}
                    {player.ladderRank && (
                      <>
                        {player.region && <span aria-hidden className="text-white/40">·</span>}
                        <span className="text-gold-500">#{player.ladderRank}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
