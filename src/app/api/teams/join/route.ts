import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { resolveTeamLogoSrc } from "@/lib/avatar";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { token } = await request.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }

  const db = getAdminDb();
  const teamsCol = db.collection(envCollection("teams"));
  // The invite lives as a single `invite` field on the team doc itself (one live invite per
  // team), so the token from the URL is looked up there — an older, regenerated token simply
  // won't match any team.
  const teamQuery = await teamsCol.where("invite.token", "==", token).limit(1).get();
  if (teamQuery.empty) {
    return NextResponse.json({ error: "This invite link is invalid or has been replaced by a newer one." }, { status: 404 });
  }

  const teamDoc = teamQuery.docs[0];
  const team = teamDoc.data();
  if (team.closedAt) {
    return NextResponse.json({ error: "This team is no longer active." }, { status: 410 });
  }
  if (new Date(team.invite.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite link has expired." }, { status: 410 });
  }
  const revokedTokens: string[] = Array.isArray(team.revokedTokens) ? team.revokedTokens : [];
  if (revokedTokens.includes(token)) {
    return NextResponse.json(
      { error: "This invite link no longer works. Ask the manager for a new one." },
      { status: 410 },
    );
  }

  const userRef = db.collection(envCollection("users")).doc(session.user.id);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "Finish setting up your profile first.", needsRegistration: true }, { status: 412 });
  }
  const existingTeamId = userDoc.data()?.teamId;
  if (existingTeamId === teamDoc.id) {
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      teamId: teamDoc.id,
      teamName: team.name,
      teamLogoURL: resolveTeamLogoSrc(team),
    });
  }
  if (existingTeamId) {
    return NextResponse.json({ error: "You're already on a different team." }, { status: 409 });
  }

  await teamDoc.ref.collection("members").doc(session.user.id).set({ joinedAt: new Date().toISOString(), joinedWithToken: token });
  await userRef.set({ teamId: teamDoc.id }, { merge: true });

  return NextResponse.json({
    ok: true,
    teamId: teamDoc.id,
    teamName: team.name,
    teamLogoURL: resolveTeamLogoSrc(team),
  });
}
