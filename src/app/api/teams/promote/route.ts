import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "You're already the manager." }, { status: 400 });
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
    return NextResponse.json({ error: "Only the team manager can assign a new manager." }, { status: 403 });
  }

  const memberDoc = await teamRef.collection("members").doc(memberId).get();
  if (!memberDoc.exists) {
    return NextResponse.json({ error: "That player isn't on this team." }, { status: 404 });
  }

  await teamRef.set({ ownerId: memberId }, { merge: true });

  return NextResponse.json({ ok: true });
}
