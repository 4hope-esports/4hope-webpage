import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { ProfileApp } from '@/components/ProfileApp'
import { auth } from '@/lib/auth'
import { envCollection, getAdminDb } from '@/lib/firebaseAdmin'
import { resolveCompanionIconSrc, resolvePhotoSrc, resolveRiotIconSrc, resolveTeamLogoSrc } from '@/lib/avatar'
import { buildRiotRecord } from '@/lib/riotAccount'
import type { RiotServer } from '@/api/riot/account'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const db = getAdminDb()
  const doc = await db.collection(envCollection('users')).doc(session.user.id).get()
  const rawProfile = doc.data()
  if (!doc.exists || !rawProfile?.username) redirect('/register')
  const profile = rawProfile
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL ?? ''

  // A link saved while the Riot API key was expired/rejected is marked unverified; silently
  // retry it here so it heals itself as soon as a working key is in place, with no action
  // needed from the player. An already-verified link is never re-fetched on page load.
  let riotData = profile.riot;
  if (riotData && riotData.verified === false) {
    const apiKey = process.env.RIOT_API_KEY;
    if (apiKey) {
      const retry = await buildRiotRecord(riotData.gameName, riotData.tagLine, riotData.server as RiotServer, apiKey);
      if ('riot' in retry) {
        riotData = retry.riot;
        await db.collection(envCollection('users')).doc(session.user.id).set({ riot: retry.riot }, { merge: true });
      }
    }
  }

  const riot = riotData
    ? {
        gameName: riotData.gameName as string,
        tagLine: riotData.tagLine as string,
        server: riotData.server as string,
        tier: (riotData.tier as string) ?? null,
        rank: (riotData.rank as string) ?? null,
        lp: (riotData.lp as number) ?? null,
        verified: riotData.verified !== false,
        iconURL: resolveRiotIconSrc({ riot: riotData }),
        companionIconURL: resolveCompanionIconSrc({ riot: riotData }),
        lastCheckedAt: (riotData.lastCheckedAt as string) ?? null,
      }
    : null

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
        riot={riot}
      />
    </>
  )
}
