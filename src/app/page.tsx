import { Navigation } from '@/components/Navigation'
import { TitleSlide } from '@/components/TitleSlide'
import { RoastSlide } from '@/components/RoastSlide'
import { fetchAllRoastPlayerStats, parseRoastPlayers } from '@/api/riot/roster'

function initialsOf(name: string): string {
  // Riot IDs here share a "4H " team prefix, so strip it before taking initials
  // or every player collapses to the same "4H" tag.
  const withoutTeamPrefix = name.replace(/^4H\s+/i, '')
  return withoutTeamPrefix.slice(0, 2).toUpperCase()
}

export default async function Home() {
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? ''
  const teamDescription = process.env.TEAM_DESCRIPTION ?? ''
  const heroKicker = process.env.HERO_KICKER
  const heroHeading: [string, string] = [
    process.env.HERO_HEADING_LINE_1 ?? 'Play',
    process.env.HERO_HEADING_LINE_2 ?? 'for keeps',
  ]

  const liveStats = await fetchAllRoastPlayerStats()

  const players = liveStats.length > 0
    ? liveStats.map((stats) => ({
        initials: initialsOf(stats.displayName),
        name: stats.displayName,
        tier: `${stats.tier}${stats.rank ? ` ${stats.rank}` : ''}`,
        lp: stats.lp,
        region: stats.region,
        avatarUrl: stats.avatarUrl,
        ladderRank: stats.ladderRank,
      }))
    : parseRoastPlayers(process.env.ROAST_PLAYERS).map((player) => ({
        initials: initialsOf(player.displayName),
        name: player.displayName,
        tier: 'Unranked',
        lp: 0,
        region: player.platform,
      }))

  return (
    <>
      <Navigation discordUrl={discordUrl} />

      <div id="home" className="scroll-mt-16">
        <TitleSlide
          kicker={heroKicker}
          heading={heroHeading}
          subheading={teamDescription}
          discordUrl={discordUrl}
        />
      </div>

      <div id="roster" className="scroll-mt-16">
        <RoastSlide players={players} />
      </div>

      <div className="relative flex justify-center py-6 font-mono text-[0.6875rem] text-white/30 tracking-[0.08em] uppercase">
        4Hope &copy; 2026
      </div>
    </>
  )
}
