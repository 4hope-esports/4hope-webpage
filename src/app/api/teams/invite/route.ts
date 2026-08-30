import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireSession, requireTeamOwner, requireUserTeamId } from "@/lib/teamAuth";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const teamId = await requireUserTeamId(session.user.id);
  if (teamId instanceof NextResponse) return teamId;

  const teamDoc = await requireTeamOwner(teamId, session.user.id, "Only the team manager can invite.");
  if (teamDoc instanceof NextResponse) return teamDoc;

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  // A single `invite` field on the team doc itself: regenerating overwrites it in
  // place, so only the most recently copied link is ever valid.
  await teamDoc.ref.set(
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
