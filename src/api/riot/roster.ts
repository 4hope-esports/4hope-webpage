import { fetchTftPlayerStats, type RiotPlayerStats, type RoastPlayerConfig } from './tft'
import { envCollection, getAdminDb } from '@/lib/firebaseAdmin'

const SNAPSHOT_COLLECTION = 'siteCache'
const SNAPSHOT_DOC = 'roastSnapshot'

/** Last known-good roster stats, used when Riot can't be reached. */
async function loadRoastSnapshot(): Promise<RiotPlayerStats[]> {
  try {
    const snap = await getAdminDb().collection(envCollection(SNAPSHOT_COLLECTION)).doc(SNAPSHOT_DOC).get()
    const players = snap.data()?.players
    return Array.isArray(players) ? (players as RiotPlayerStats[]) : []
  } catch (err) {
    console.error('Failed to load roast snapshot from Firebase', err)
    return []
  }
}

async function saveRoastSnapshot(players: RiotPlayerStats[]): Promise<void> {
  try {
    await getAdminDb()
      .collection(envCollection(SNAPSHOT_COLLECTION))
      .doc(SNAPSHOT_DOC)
      .set({ players, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Failed to save roast snapshot to Firebase', err)
  }
}

export function parseRoastPlayers(raw: string | undefined): RoastPlayerConfig[] {
  if (!raw) return []
  return raw
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      // gameName#tagLine:platform
      const [riotId, platform] = entry.split(':')
      const [gameName, tagLine] = riotId.split('#')
      return {
        gameName: gameName.trim(),
        tagLine: (tagLine ?? '').trim(),
        platform: (platform ?? '').trim(),
        displayName: gameName.trim(),
      }
    })
}

export async function fetchAllRoastPlayerStats(): Promise<RiotPlayerStats[]> {
  const apiKey = process.env.RIOT_API_KEY
  const routingRegion = process.env.RIOT_ROUTING_REGION ?? 'americas'
  const players = parseRoastPlayers(process.env.ROAST_PLAYERS)

  if (!apiKey || players.length === 0) return loadRoastSnapshot()

  const results = await Promise.all(
    players.map((player) =>
      fetchTftPlayerStats(player, routingRegion, apiKey).catch((err) => {
        console.error(`Riot fetch threw for ${player.gameName}#${player.tagLine}`, err)
        return null
      }),
    ),
  )
  const stats = results.filter((r): r is RiotPlayerStats => r !== null)

  // Only trust this as a full refresh when every configured player actually
  // came back — a partial Riot outage shouldn't overwrite good cached data
  // for the players that failed with an incomplete snapshot.
  if (stats.length === players.length) {
    await saveRoastSnapshot(stats)
    return stats
  }

  const cached = await loadRoastSnapshot()
  return cached.length > 0 ? cached : stats
}
