import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { AVATAR_CONTENT_TYPE } from "@/lib/avatar";
import { buildRiotRecord } from "@/lib/riotAccount";
import { isRiotServer } from "@/api/riot/account";

const REFRESH_COOLDOWN_MS = (Number(process.env.RIOT_REFRESH_COOLDOWN_SECONDS) || 180) * 1000;

function riotResponsePayload(riot: Record<string, unknown>) {
  const iconBytes = riot.iconBytes;
  const companionBytes = riot.companionBytes;
  return {
    gameName: riot.gameName,
    tagLine: riot.tagLine,
    server: riot.server,
    tier: riot.tier,
    rank: riot.rank,
    lp: riot.lp,
    verified: riot.verified,
    lastCheckedAt: riot.lastCheckedAt,
    iconURL: Buffer.isBuffer(iconBytes) ? `data:${AVATAR_CONTENT_TYPE};base64,${iconBytes.toString("base64")}` : null,
    companionIconURL: Buffer.isBuffer(companionBytes)
      ? `data:${AVATAR_CONTENT_TYPE};base64,${companionBytes.toString("base64")}`
      : null,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { riotId, server } = await request.json().catch(() => ({}));
  if (typeof riotId !== "string" || !riotId.includes("#")) {
    return NextResponse.json({ error: "Enter your Riot ID as name#tag." }, { status: 400 });
  }
  if (typeof server !== "string" || !isRiotServer(server)) {
    return NextResponse.json({ error: "Choose a valid server." }, { status: 400 });
  }

  const [gameName, tagLine] = riotId.split("#");
  if (!gameName.trim() || !tagLine.trim()) {
    return NextResponse.json({ error: "Enter your Riot ID as name#tag." }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Riot linking is not configured." }, { status: 500 });
  }

  const result = await buildRiotRecord(gameName.trim(), tagLine.trim(), server, apiKey);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await getAdminDb().collection(envCollection("users")).doc(session.user.id).set({ riot: result.riot }, { merge: true });

  return NextResponse.json({ ok: true, riot: riotResponsePayload(result.riot) });
}

/** Manually re-checks the already-linked Riot account, throttled to once per 5 minutes. */
export async function PATCH() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const docRef = getAdminDb().collection(envCollection("users")).doc(session.user.id);
  const doc = await docRef.get();
  const existing = doc.data()?.riot;
  if (!existing) {
    return NextResponse.json({ error: "No Riot account linked." }, { status: 404 });
  }

  if (existing.verified !== false) {
    const lastCheckedAt = existing.lastCheckedAt ? new Date(existing.lastCheckedAt).getTime() : 0;
    if (Date.now() - lastCheckedAt < REFRESH_COOLDOWN_MS) {
      return NextResponse.json({ error: "You can only refresh this every 5 minutes." }, { status: 429 });
    }
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Riot linking is not configured." }, { status: 500 });
  }

  const result = await buildRiotRecord(existing.gameName, existing.tagLine, existing.server, apiKey);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await docRef.set({ riot: result.riot }, { merge: true });

  return NextResponse.json({ ok: true, riot: riotResponsePayload(result.riot) });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  await getAdminDb()
    .collection(envCollection("users"))
    .doc(session.user.id)
    .set({ riot: FieldValue.delete() }, { merge: true });

  return NextResponse.json({ ok: true });
}
