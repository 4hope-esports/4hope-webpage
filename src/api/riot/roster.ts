import { fetchTftPlayerStats, type RiotPlayerStats, type RoastPlayerConfig } from './tft'

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

  if (!apiKey || players.length === 0) return []

  const results = await Promise.all(
    players.map((player) => fetchTftPlayerStats(player, routingRegion, apiKey)),
  )
  return results.filter((r): r is RiotPlayerStats => r !== null)
}
