import { fetchAndCompressImage } from "@/lib/avatar";
import { lookupRiotAccount, type RiotServer } from "@/api/riot/account";

/** Runs the Riot lookup and returns the Firestore-ready `riot` object, verified or not. */
export async function buildRiotRecord(
  gameName: string,
  tagLine: string,
  server: RiotServer,
  apiKey: string,
): Promise<{ error: string } | { riot: Record<string, unknown> }> {
  const result = await lookupRiotAccount(gameName, tagLine, server, apiKey);

  if (result.status === "not_found") {
    return { error: "Couldn't find that Riot ID on this server." };
  }

  if (result.status === "key_invalid") {
    // Save what the player entered so we can retry silently later, but don't claim it's verified.
    return {
      riot: {
        gameName,
        tagLine,
        server,
        verified: false,
        lastCheckedAt: new Date().toISOString(),
      },
    };
  }

  const iconBytes = await fetchAndCompressImage(result.account.profileIconUrl, 128);
  const companionBytes = result.account.companionIconUrl
    ? await fetchAndCompressImage(result.account.companionIconUrl, 128)
    : null;
  return {
    riot: {
      gameName: result.account.gameName,
      tagLine: result.account.tagLine,
      server: result.account.server,
      puuid: result.account.puuid,
      profileIconId: result.account.profileIconId,
      tier: result.account.tier,
      rank: result.account.rank,
      lp: result.account.lp,
      verified: true,
      verifiedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      ...(iconBytes ? { iconBytes } : {}),
      ...(companionBytes ? { companionBytes } : {}),
    },
  };
}
