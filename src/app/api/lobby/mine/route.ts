import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/** Lobbies the signed-in user owns, newest first — powers the "My Lobbies" card on the profile. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const snap = await getAdminDb()
    .collection(envCollection("lobbies"))
    .where("ownerUserId", "==", session.user.id)
    .get();

  const lobbies = snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        name: data.name,
        game: data.game,
        region: data.region,
        status: data.status,
        scheduledStartTime: data.scheduledStartTime ?? null,
        participantCount: Array.isArray(data.people) ? data.people.length : 0,
        createdAt: data.createdAt as string,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  return NextResponse.json({ lobbies });
}
