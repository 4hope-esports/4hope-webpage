import { NextRequest, NextResponse } from "next/server";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * Public lobby directory, newest first. Cursor-paginated via `after`
 * (the createdAt of the last row from the previous page) for infinite scroll.
 * No search/filtering server-side yet — the client filters the loaded page.
 */
export async function GET(req: NextRequest) {
  const after = req.nextUrl.searchParams.get("after");
  const limitParam = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_PAGE_SIZE) : PAGE_SIZE;

  let query = getAdminDb()
    .collection(envCollection("lobbies"))
    .where("visibility", "==", "public")
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (after) {
    query = query.startAfter(after);
  }

  const snap = await query.get();
  const now = Date.now();

  const lobbies = await Promise.all(
    snap.docs.map(async (doc) => {
      let data = doc.data() as Record<string, unknown>;
      // Scheduled lobbies self-heal to "live" once their start time has passed.
      if (data.status === "open" && typeof data.scheduledStartTime === "string" && new Date(data.scheduledStartTime).getTime() <= now) {
        await doc.ref.set({ status: "live" }, { merge: true });
        data = { ...data, status: "live" };
      }
      return {
        id: doc.id,
        name: data.name,
        game: data.game,
        region: data.region,
        status: data.status,
        authorName: data.authorName,
        authorPhotoURL: data.authorPhotoURL ?? null,
        scheduledStartTime: data.scheduledStartTime ?? null,
        participantCount: Array.isArray(data.people) ? data.people.length : 0,
        limit: typeof data.limit === "number" ? data.limit : null,
        createdAt: data.createdAt,
      };
    }),
  );

  const nextCursor = lobbies.length === limit ? (lobbies[lobbies.length - 1].createdAt as string) : null;

  return NextResponse.json({ lobbies, nextCursor });
}
