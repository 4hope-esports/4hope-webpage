import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { requireSession, requireTeamOwner, requireUserTeamId } from "@/lib/teamAuth";

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { memberId } = await request.json().catch(() => ({}));
  if (typeof memberId !== "string" || !memberId) {
    return NextResponse.json({ error: "Missing member id." }, { status: 400 });
  }
  if (memberId === session.user.id) {
    return NextResponse.json({ error: "You can't kick yourself — use leave team instead." }, { status: 400 });
  }

  const teamId = await requireUserTeamId(session.user.id);
  if (teamId instanceof NextResponse) return teamId;

  const teamDoc = await requireTeamOwner(teamId, session.user.id, "Only the team manager can remove members.");
  if (teamDoc instanceof NextResponse) return teamDoc;

  const usersCol = getAdminDb().collection(envCollection("users"));
  const teamRef = teamDoc.ref;
  const memberRef = teamRef.collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) {
    return NextResponse.json({ error: "That player isn't on this team." }, { status: 404 });
  }

  const joinedWithToken = memberDoc.data()?.joinedWithToken as string | undefined;

  await memberRef.delete();
  await usersCol.doc(memberId).set({ teamId: FieldValue.delete() }, { merge: true });
  // Retire the invite token the kicked player used, so they can't rejoin by replaying the same link.
  if (joinedWithToken) {
    await teamRef.set({ revokedTokens: FieldValue.arrayUnion(joinedWithToken) }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
