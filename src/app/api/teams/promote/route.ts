import { NextResponse } from "next/server";
import { requireSession, requireTeamOwner, requireUserTeamId } from "@/lib/teamAuth";

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { memberId } = await request.json().catch(() => ({}));
  if (typeof memberId !== "string" || !memberId) {
    return NextResponse.json({ error: "Missing member id." }, { status: 400 });
  }
  if (memberId === session.user.id) {
    return NextResponse.json({ error: "You're already the manager." }, { status: 400 });
  }

  const teamId = await requireUserTeamId(session.user.id);
  if (teamId instanceof NextResponse) return teamId;

  const teamDoc = await requireTeamOwner(teamId, session.user.id, "Only the team manager can assign a new manager.");
  if (teamDoc instanceof NextResponse) return teamDoc;

  const memberDoc = await teamDoc.ref.collection("members").doc(memberId).get();
  if (!memberDoc.exists) {
    return NextResponse.json({ error: "That player isn't on this team." }, { status: 404 });
  }

  await teamDoc.ref.set({ ownerId: memberId }, { merge: true });

  return NextResponse.json({ ok: true });
}
