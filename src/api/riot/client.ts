// Riot's league-v1/summoner-v1 platform codes vs. the shorthand people actually type.
const PLATFORM_ALIASES: Record<string, string> = {
  LAN: 'la1',
  LAS: 'la2',
  NA: 'na1',
  NA1: 'na1',
  EUW: 'euw1',
  EUNE: 'eun1',
  BR: 'br1',
  OCE: 'oc1',
  KR: 'kr',
  JP: 'jp1',
}

export function normalizePlatform(platform: string): string {
  const upper = platform.trim().toUpperCase()
  return PLATFORM_ALIASES[upper] ?? platform.trim().toLowerCase()
}

export async function riotFetch<T>(url: string, apiKey: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': apiKey },
    // Dev keys rotate daily and ranked state changes slowly — an hour of caching
    // avoids hammering rate limits without serving stale data for long.
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.error(`Riot API ${res.status} for ${url}`)
    return null
  }
  return res.json() as Promise<T>
}

export type RiotFetchResult<T> = { ok: true; data: T } | { ok: false; status: number }

/** Like riotFetch, but preserves the HTTP status so callers can tell "not found" from "key rejected"/rate-limited. */
export async function riotFetchWithStatus<T>(url: string, apiKey: string): Promise<RiotFetchResult<T>> {
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': apiKey },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.error(`Riot API ${res.status} for ${url}`)
    return { ok: false, status: res.status }
  }
  return { ok: true, data: (await res.json()) as T }
}

/** Latest Data Dragon version, cached for a day — a hardcoded version goes stale and 403s on assets it doesn't have. */
async function latestDdragonVersion(): Promise<string> {
  const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 86400 },
  })
  const versions = (await res.json()) as string[]
  return versions[0]
}

export async function profileIconUrl(profileIconId: number): Promise<string> {
  const version = await latestDdragonVersion()
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`
}

const COMPANIONS_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/companions.json'

interface CommunityDragonCompanion {
  contentId: string
  loadoutsIcon: string
}

let companionsCache: Promise<CommunityDragonCompanion[]> | null = null

function fetchCompanions(): Promise<CommunityDragonCompanion[]> {
  if (!companionsCache) {
    companionsCache = fetch(COMPANIONS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 86400 } })
      .then((res) => (res.ok ? (res.json() as Promise<CommunityDragonCompanion[]>) : []))
      .catch(() => [])
  }
  return companionsCache
}

/** Resolves a TFT summoner's Little Legend companion (by Riot's `content_ID`) to its Community Dragon icon URL. */
export async function companionIconUrl(contentId: string): Promise<string | null> {
  const companions = await fetchCompanions()
  const companion = companions.find((c) => c.contentId === contentId)
  if (!companion) return null

  // loadoutsIcon looks like "/lol-game-data/assets/ASSETS/Loadouts/Companions/Foo.png";
  // Community Dragon serves it lowercased with that prefix stripped.
  const path = companion.loadoutsIcon.replace(/^\/lol-game-data\/assets\//i, '').toLowerCase()
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${path}`
}
