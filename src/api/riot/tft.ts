import { normalizePlatform, profileIconUrl, riotFetch } from './client'

const RANKED_TFT_QUEUE_TYPE = 'RANKED_TFT'
const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])

export interface RoastPlayerConfig {
  gameName: string
  tagLine: string
  platform: string
  displayName: string
}

export interface RiotPlayerStats {
  gameName: string
  tagLine: string
  displayName: string
  tier: string
  rank: string
  lp: number
  profileIconId: number
  avatarUrl: string
  ladderRank: number | null
  region: string
}

interface ApexLeagueEntry {
  puuid: string
  leaguePoints: number
}

interface ApexLeagueList {
  entries: ApexLeagueEntry[]
}

// Master/Grandmaster/Challenger share one ladder (Grandmaster and Challenger are just
// the top slice of it), so the player's overall rank position comes from combining all
// three lists and sorting by LP — matching how the in-game ladder is actually ordered.
const apexLadderCache = new Map<string, Promise<ApexLeagueEntry[]>>()

async function fetchApexLadder(platform: string, apiKey: string): Promise<ApexLeagueEntry[]> {
  const cached = apexLadderCache.get(platform)
  if (cached) return cached

  const promise = (async () => {
    const [master, grandmaster, challenger] = await Promise.all([
      riotFetch<ApexLeagueList>(`https://${platform}.api.riotgames.com/tft/league/v1/master`, apiKey),
      riotFetch<ApexLeagueList>(`https://${platform}.api.riotgames.com/tft/league/v1/grandmaster`, apiKey),
      riotFetch<ApexLeagueList>(`https://${platform}.api.riotgames.com/tft/league/v1/challenger`, apiKey),
    ])

    const entries = [...(master?.entries ?? []), ...(grandmaster?.entries ?? []), ...(challenger?.entries ?? [])]
    return entries.sort((a, b) => b.leaguePoints - a.leaguePoints)
  })()

  apexLadderCache.set(platform, promise)
  return promise
}

async function lookupLadderRank(
  puuid: string,
  tier: string,
  platform: string,
  apiKey: string,
): Promise<number | null> {
  if (!APEX_TIERS.has(tier.toUpperCase())) return null

  const ladder = await fetchApexLadder(platform, apiKey)
  const position = ladder.findIndex((entry) => entry.puuid === puuid)
  return position === -1 ? null : position + 1
}

export async function fetchTftPlayerStats(
  player: RoastPlayerConfig,
  routingRegion: string,
  apiKey: string,
): Promise<RiotPlayerStats | null> {
  const platform = normalizePlatform(player.platform)

  const account = await riotFetch<{ puuid: string }>(
    `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      player.gameName,
    )}/${encodeURIComponent(player.tagLine)}`,
    apiKey,
  )
  if (!account) return null

  const summoner = await riotFetch<{ profileIconId: number }>(
    `https://${platform}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${account.puuid}`,
    apiKey,
  )
  if (!summoner) return null

  const leagueEntries = await riotFetch<
    Array<{ queueType: string; tier: string; rank: string; leaguePoints: number }>
  >(`https://${platform}.api.riotgames.com/tft/league/v1/by-puuid/${account.puuid}`, apiKey)

  const rankedEntry = leagueEntries?.find((entry) => entry.queueType === RANKED_TFT_QUEUE_TYPE)
  const tier = rankedEntry?.tier ?? 'Unranked'

  const ladderRank = await lookupLadderRank(account.puuid, tier, platform, apiKey)

  return {
    gameName: player.gameName,
    tagLine: player.tagLine,
    displayName: player.displayName,
    tier,
    rank: rankedEntry?.rank ?? '',
    lp: rankedEntry?.leaguePoints ?? 0,
    profileIconId: summoner.profileIconId,
    avatarUrl: profileIconUrl(summoner.profileIconId),
    ladderRank,
    region: player.platform,
  }
}
