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

const DDRAGON_VERSION = '14.23.1'

export function profileIconUrl(profileIconId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${profileIconId}.png`
}
