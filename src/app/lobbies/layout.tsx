import { Navigation } from '@/components/Navigation'

export default function TournamentLeaderboardLayout({ children }: { children: React.ReactNode }) {
  const discordUrl = process.env.DISCORD_URL ?? ''
  return (
    <>
      <Navigation discordUrl={discordUrl} />
      {children}
    </>
  )
}
