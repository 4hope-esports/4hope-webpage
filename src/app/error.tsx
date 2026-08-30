'use client'

import { useEffect } from 'react'
import { StatusErrorPage } from '@/components/StatusErrorPage'

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusErrorPage
      discordUrl={process.env.NEXT_PUBLIC_DISCORD_URL ?? ''}
      kicker="// ERROR 500 — SERVER DOWN"
      code="500"
      heading="TEAM WIPE."
      description="Something broke on our end. Try again, or head back to the home page while we respawn."
      actions={[
        { label: 'Try again', onClick: retry, variant: 'primary' },
        { label: 'Back to home', href: '/', variant: 'subtle' },
      ]}
    />
  )
}
