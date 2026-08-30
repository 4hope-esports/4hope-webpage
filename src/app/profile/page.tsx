import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { ProfileApp } from '@/components/ProfileApp'
import { auth } from '@/lib/auth'
import { envCollection, getAdminDb } from '@/lib/firebaseAdmin'
import { resolvePhotoSrc, resolveTeamLogoSrc } from '@/lib/avatar'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const db = getAdminDb()
  const doc = await db.collection(envCollection('users')).doc(session.user.id).get()
  const rawProfile = doc.data()
  if (!doc.exists || !rawProfile?.username) redirect('/register')
  const profile = rawProfile
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? ''

  let teamName: string | null = null
  let teamCode: string | null = null
  let teamLogoURL: string | null = null
  let isTeamManager = false
  let members: { id: string; displayName: string; photoURL: string | null; isManager: boolean }[] = []
  if (profile.teamId) {
    const teamDoc = await db.collection(envCollection('teams')).doc(profile.teamId).get()
    if (teamDoc.exists) {
      const team = teamDoc.data()!
      teamName = team.name
      teamCode = team.code ?? null
      teamLogoURL = resolveTeamLogoSrc(team)
      isTeamManager = team.ownerId === session.user.id

      const memberSnap = await db.collection(envCollection('teams')).doc(profile.teamId).collection('members').get()
      const memberIds = memberSnap.docs.map((d) => d.id)
      const memberDocs = await Promise.all(memberIds.map((id) => db.collection(envCollection('users')).doc(id).get()))
      members = memberDocs
        .filter((d) => d.exists)
        .map((d) => {
          const data = d.data()!
          return {
            id: d.id,
            displayName: data.displayName ?? data.username ?? 'Unknown',
            photoURL: resolvePhotoSrc(data),
            isManager: d.id === team.ownerId,
          }
        })
    }
  }

  return (
    <>
      <Navigation discordUrl={discordUrl} />
      <ProfileApp
        displayName={profile.displayName ?? profile.username}
        username={profile.username}
        email={session.user.email ?? ''}
        photoURL={resolvePhotoSrc(profile)}
        isTeamManager={isTeamManager}
        teamName={teamName}
        teamCode={teamCode}
        teamLogoURL={teamLogoURL}
        members={members}
        currentUserId={session.user.id}
      />
    </>
  )
}
