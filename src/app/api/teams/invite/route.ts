import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const db = getAdminDb();
  const userDoc = await db.collection(envCollection("users")).doc(session.user.id).get();
  const teamId = userDoc.data()?.teamId;
  if (!teamId) {
    return NextResponse.json({ error: "You're not on a team." }, { status: 404 });
  }

  const teamDoc = await db.collection(envCollection("teams")).doc(teamId).get();
  if (!teamDoc.exists || teamDoc.data()?.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the team manager can invite." }, { status: 403 });
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  // A single `invite` field on the team doc itself: regenerating overwrites it in
  // place, so only the most recently copied link is ever valid.
  await db
    .collection(envCollection("teams"))
    .doc(teamId)
    .set(
      {
        invite: {
          token,
          createdBy: session.user.id,
          createdAt: new Date().toISOString(),
          expiresAt,
        },
      },
      { merge: true },
    );

  // Built from the incoming request's own host, so the link is correct for whichever
  // environment issued it (localhost, a Vercel preview deploy, or production).
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const inviteUrl = `${origin}/join/${token}`;

  return NextResponse.json({ ok: true, token, inviteUrl, expiresAt });
}
