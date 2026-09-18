import { companionIconUrl, normalizePlatform, profileIconUrl, riotFetch, riotFetchWithStatus } from "./client";

const RANKED_TFT_QUEUE_TYPE = "RANKED_TFT";

// The servers offered in the account-link UI, alphabetical, each mapped to the regional
// routing host account-v1 needs (account-v1 is routed by continent, not by platform).
export const RIOT_SERVERS = [
  { value: "BR", label: "Brazil (BR)", routingRegion: "americas" },
  { value: "EUNE", label: "Europe Nordic & East (EUNE)", routingRegion: "europe" },
  { value: "EUW", label: "Europe West (EUW)", routingRegion: "europe" },
  { value: "JP", label: "Japan (JP)", routingRegion: "asia" },
  { value: "KR", label: "Korea (KR)", routingRegion: "asia" },
  { value: "LAN", label: "Latin America North (LAN)", routingRegion: "americas" },
  { value: "LAS", label: "Latin America South (LAS)", routingRegion: "americas" },
  { value: "NA", label: "North America (NA)", routingRegion: "americas" },
  { value: "OCE", label: "Oceania (OCE)", routingRegion: "americas" },
] as const;

export type RiotServer = (typeof RIOT_SERVERS)[number]["value"];

export function isRiotServer(value: string): value is RiotServer {
  return RIOT_SERVERS.some((s) => s.value === value);
}

function routingRegionFor(server: RiotServer): string {
  return RIOT_SERVERS.find((s) => s.value === server)!.routingRegion;
}

const ROUTING_REGION_TO_LABEL: Record<string, string> = {
  americas: "Americas",
  europe: "EMEA",
  asia: "APAC",
};

/** Which display region (Americas/EMEA/APAC) a given Riot server belongs to — the single source of truth, used both client- and server-side so it can't drift out of sync with a per-file copy. */
export function regionForServer(server: string): string {
  const entry = RIOT_SERVERS.find((s) => s.value === server);
  return entry ? ROUTING_REGION_TO_LABEL[entry.routingRegion] ?? "" : "";
}

interface TftMatchParticipant {
  puuid: string;
  companion?: { content_ID: string };
}

/**
 * The Little Legend (companion) isn't on summoner-v1 — it only appears per-match, on that
 * match's participant data. So we pull the player's most recent match and read it from there.
 */
async function lookupCompanionIcon(puuid: string, routingRegion: string, apiKey: string): Promise<string | null> {
  const matchIds = await riotFetch<string[]>(
    `https://${routingRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=1`,
    apiKey,
  );
  const matchId = matchIds?.[0];
  if (!matchId) return null;

  const match = await riotFetch<{ info: { participants: TftMatchParticipant[] } }>(
    `https://${routingRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`,
    apiKey,
  );
  const participant = match?.info.participants.find((p) => p.puuid === puuid);
  const contentId = participant?.companion?.content_ID;
  return contentId ? companionIconUrl(contentId) : null;
}

export interface RiotAccountProfile {
  gameName: string;
  tagLine: string;
  server: RiotServer;
  puuid: string;
  profileIconId: number;
  profileIconUrl: string;
  companionIconUrl: string | null;
  tier: string;
  rank: string;
  lp: number;
}

export type LookupRiotAccountResult =
  | { status: "ok"; account: RiotAccountProfile }
  | { status: "not_found" }
  | { status: "key_invalid" };

/** Looks up a Riot ID + server and returns everything needed to render a linked-account card. */
export async function lookupRiotAccount(
  gameName: string,
  tagLine: string,
  server: RiotServer,
  apiKey: string,
): Promise<LookupRiotAccountResult> {
  const routingRegion = routingRegionFor(server);
  const platform = normalizePlatform(server);

  const accountRes = await riotFetchWithStatus<{ puuid: string; gameName: string; tagLine: string }>(
    `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    apiKey,
  );
  if (!accountRes.ok) {
    // 401/403 means the API key itself was rejected (expired dev key); 404 means the Riot ID
    // genuinely doesn't exist on this server. Anything else (429/5xx) is treated like a key
    // problem too, since it's not the user's data that's wrong.
    return { status: accountRes.status === 404 ? "not_found" : "key_invalid" };
  }
  const account = accountRes.data;

  const summoner = await riotFetch<{ profileIconId: number }>(
    `https://${platform}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${account.puuid}`,
    apiKey,
  );
  if (!summoner) return { status: "key_invalid" };

  const companionIcon = await lookupCompanionIcon(account.puuid, routingRegion, apiKey);

  const leagueEntries = await riotFetch<Array<{ queueType: string; tier: string; rank: string; leaguePoints: number }>>(
    `https://${platform}.api.riotgames.com/tft/league/v1/by-puuid/${account.puuid}`,
    apiKey,
  );
  const rankedEntry = leagueEntries?.find((entry) => entry.queueType === RANKED_TFT_QUEUE_TYPE);

  return {
    status: "ok",
    account: {
      gameName: account.gameName,
      tagLine: account.tagLine,
      server,
      puuid: account.puuid,
      profileIconId: summoner.profileIconId,
      profileIconUrl: await profileIconUrl(summoner.profileIconId),
      companionIconUrl: companionIcon,
      tier: rankedEntry?.tier ?? "Unranked",
      rank: rankedEntry?.rank ?? "",
      lp: rankedEntry?.leaguePoints ?? 0,
    },
  };
}
