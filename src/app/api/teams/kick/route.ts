import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { memberId } = await request.json().catch(() => ({}));
  if (typeof memberId !== "string" || !memberId) {
    return NextResponse.json({ error: "Missing member id." }, { status: 400 });
  }
  if (memberId === session.user.id) {
    return NextResponse.json({ error: "You can't kick yourself — use leave team instead." }, { status: 400 });
  }

  const db = getAdminDb();
  const usersCol = db.collection(envCollection("users"));
  const teamsCol = db.collection(envCollection("teams"));

  const userDoc = await usersCol.doc(session.user.id).get();
  const teamId = userDoc.data()?.teamId;
  if (!teamId) {
    return NextResponse.json({ error: "You're not on a team." }, { status: 404 });
  }

  const teamRef = teamsCol.doc(teamId);
  const teamDoc = await teamRef.get();
  if (!teamDoc.exists || teamDoc.data()?.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the team manager can remove members." }, { status: 403 });
  }

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
