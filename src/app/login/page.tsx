import { Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? ''

  return (
    <>
      <Navigation discordUrl={discordUrl} />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  )
}
