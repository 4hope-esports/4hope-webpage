import { Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { RegisterForm } from './RegisterForm'

export default function RegisterPage() {
  const discordUrl = process.env.DISCORD_URL ?? ''

  return (
    <>
      <Navigation discordUrl={discordUrl} />
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </>
  )
}
