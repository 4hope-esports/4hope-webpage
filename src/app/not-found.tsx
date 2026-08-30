import { StatusErrorPage } from '@/components/StatusErrorPage'

export default function NotFound() {
  const discordUrl = process.env.DISCORD_URL ?? ''

  return (
    <StatusErrorPage
      discordUrl={discordUrl}
      kicker="// ERROR 404 — NOT FOUND"
      code="404"
      heading="WRONG LOBBY."
      description="That page isn't on the roster. It may have been moved, renamed, or it never existed. Check the link, or start again from the home page."
      actions={[
        { label: 'Back to home', href: '/', variant: 'primary' },
        { label: 'Report a problem', href: discordUrl, external: true, variant: 'subtle' },
      ]}
      links={[
        { label: 'Roster', href: '/#roster' },
        { label: 'Home', href: '/' },
      ]}
    />
  )
}
