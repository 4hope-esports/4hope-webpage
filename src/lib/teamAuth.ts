import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

/** Resolves the signed-in session, or a ready-to-return 401 response if there isn't one. */
export async function requireSession(): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return session;
}

/** Looks up the caller's `teamId` on their user doc, or a ready-to-return 404 if they're not on a team. */
export async function requireUserTeamId(userId: string): Promise<string | NextResponse> {
  const db = getAdminDb();
  const userDoc = await db.collection(envCollection("users")).doc(userId).get();
  const teamId = userDoc.data()?.teamId;
  if (!teamId) {
    return NextResponse.json({ error: "You're not on a team." }, { status: 404 });
  }
  return teamId;
}

/** Loads the team doc and verifies the caller is its `ownerId`, or a ready-to-return 403 otherwise. */
export async function requireTeamOwner(
  teamId: string,
  userId: string,
  message: string,
): Promise<FirebaseFirestore.DocumentSnapshot | NextResponse> {
  const teamRef = getAdminDb().collection(envCollection("teams")).doc(teamId);
  const teamDoc = await teamRef.get();
  if (!teamDoc.exists || teamDoc.data()?.ownerId !== userId) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return teamDoc;
}
