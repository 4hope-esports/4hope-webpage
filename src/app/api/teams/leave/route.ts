import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { requireSession, requireUserTeamId } from "@/lib/teamAuth";

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { newOwnerId } = await request.json().catch(() => ({}));

  const db = getAdminDb();
  const usersCol = db.collection(envCollection("users"));
  const teamsCol = db.collection(envCollection("teams"));

  const userRef = usersCol.doc(session.user.id);
  const teamId = await requireUserTeamId(session.user.id);
  if (teamId instanceof NextResponse) return teamId;

  const teamRef = teamsCol.doc(teamId);
  const teamDoc = await teamRef.get();
  if (!teamDoc.exists) {
    await userRef.set({ teamId: FieldValue.delete() }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  const team = teamDoc.data()!;
  const membersCol = teamRef.collection("members");
  const membersSnap = await membersCol.get();
  const remainingMembers = membersSnap.docs.map((d) => d.id).filter((id) => id !== session.user.id);
  const isManager = team.ownerId === session.user.id;

  const selfMemberDoc = membersSnap.docs.find((d) => d.id === session.user.id);
  const joinedWithToken = selfMemberDoc?.data()?.joinedWithToken as string | undefined;
  // Once someone leaves, the token they used to get in is retired — it can't be replayed to
  // rejoin without a fresh invite from the manager.
  const revokeToken = joinedWithToken ? { revokedTokens: FieldValue.arrayUnion(joinedWithToken) } : {};

  if (isManager && remainingMembers.length > 0) {
    if (typeof newOwnerId !== "string" || !remainingMembers.includes(newOwnerId)) {
      return NextResponse.json(
        { error: "Pick a teammate to hand the manager role to before leaving.", requiresNewOwner: true },
        { status: 400 },
      );
    }
    await membersCol.doc(session.user.id).delete();
    await teamRef.set({ ownerId: newOwnerId, ...revokeToken }, { merge: true });
  } else if (isManager) {
    // Last member leaving: keep the team doc (per policy, never delete it), but close it and
    // kill the invite so the empty team can't be joined or found again.
    await membersCol.doc(session.user.id).delete();
    await teamRef.set(
      {
        closedAt: new Date().toISOString(),
        invite: FieldValue.delete(),
        ...revokeToken,
      },
      { merge: true },
    );
  } else {
    await membersCol.doc(session.user.id).delete();
    if (joinedWithToken) {
      await teamRef.set(revokeToken, { merge: true });
    }
  }

  await userRef.set({ teamId: FieldValue.delete() }, { merge: true });

  return NextResponse.json({ ok: true, teamName: team.name, teamClosed: isManager && remainingMembers.length === 0 });
}
