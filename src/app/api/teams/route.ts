import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { compressTeamLogo } from "@/lib/avatar";
import { defaultTeamCode, isValidTeamCode, normalizeTeamName, teamNameKey } from "@/lib/team";
import { requireSession, requireTeamOwner, requireUserTeamId } from "@/lib/teamAuth";

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { name, code, logoDataUrl } = await request.json();

  const normalized = normalizeTeamName(typeof name === "string" ? name : "");
  if ("error" in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }
  const teamName = normalized.value;

  const teamCode = typeof code === "string" && code.length > 0 ? code : defaultTeamCode(teamName);
  if (!isValidTeamCode(teamCode)) {
    return NextResponse.json({ error: "Team code must be exactly 2 characters (0-9, A-Z)." }, { status: 400 });
  }

  const db = getAdminDb();
  const usersCol = db.collection(envCollection("users"));
  const teamsCol = db.collection(envCollection("teams"));

  const userRef = usersCol.doc(session.user.id);
  const userDoc = await userRef.get();
  if (userDoc.exists && userDoc.data()?.teamId) {
    return NextResponse.json({ error: "You're already on a team." }, { status: 409 });
  }

  const nameKey = teamNameKey(teamName);
  const dupe = await teamsCol.where("nameKey", "==", nameKey).limit(1).get();
  if (!dupe.empty) {
    return NextResponse.json({ error: "A team with that name already exists." }, { status: 409 });
  }

  const logoBytes = typeof logoDataUrl === "string" && logoDataUrl ? await compressTeamLogo(logoDataUrl) : null;

  const teamRef = teamsCol.doc();
  await teamRef.set({
    name: teamName,
    nameKey,
    code: teamCode,
    ownerId: session.user.id,
    ...(logoBytes ? { logoBytes } : {}),
    createdAt: new Date().toISOString(),
  });
  await teamRef.collection("members").doc(session.user.id).set({ joinedAt: new Date().toISOString() });

  await userRef.set({ teamId: teamRef.id }, { merge: true });

  return NextResponse.json({ ok: true, teamId: teamRef.id });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { name, code, logoDataUrl } = await request.json();

  const normalized = normalizeTeamName(typeof name === "string" ? name : "");
  if ("error" in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }
  const teamName = normalized.value;

  const teamCode = typeof code === "string" && code.length > 0 ? code : defaultTeamCode(teamName);
  if (!isValidTeamCode(teamCode)) {
    return NextResponse.json({ error: "Team code must be exactly 2 characters (0-9, A-Z)." }, { status: 400 });
  }

  const teamId = await requireUserTeamId(session.user.id);
  if (teamId instanceof NextResponse) return teamId;

  const teamDoc = await requireTeamOwner(teamId, session.user.id, "Only the team manager can edit this team.");
  if (teamDoc instanceof NextResponse) return teamDoc;

  const teamsCol = getAdminDb().collection(envCollection("teams"));
  const nameKey = teamNameKey(teamName);
  const dupe = await teamsCol.where("nameKey", "==", nameKey).limit(1).get();
  if (!dupe.empty && dupe.docs[0].id !== teamId) {
    return NextResponse.json({ error: "A team with that name already exists." }, { status: 409 });
  }

  // logoDataUrl: a new data URL means "replace", null/absent means "remove", so the stored
  // logoBytes always reflects what the client showed when it submitted the form.
  const logoBytes = typeof logoDataUrl === "string" && logoDataUrl ? await compressTeamLogo(logoDataUrl) : null;

  await teamDoc.ref.set(
    {
      name: teamName,
      nameKey,
      code: teamCode,
      logoBytes: logoBytes ?? FieldValue.delete(),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, teamId });
}
