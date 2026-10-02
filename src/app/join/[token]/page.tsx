import { Navigation } from '@/components/Navigation'
import { JoinTeamForm } from './JoinTeamForm'

export default function JoinTeamPage() {
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? ''

  return (
    <>
      <Navigation discordUrl={discordUrl} />
      <JoinTeamForm />
    </>
  )
}
