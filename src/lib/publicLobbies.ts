import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

export interface PublicLobbySeo {
  id: string;
  name: string;
  game: string;
  region: string;
  status: string;
  description: string;
  authorName: string;
  scheduledStartTime: string | null;
  createdAt: string | null;
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

/** Server-side read of the SEO-safe fields of a public lobby; null if missing or not public. */
export async function getPublicLobbySeo(lobbyId: string): Promise<PublicLobbySeo | null> {
  try {
    const snap = await getAdminDb().collection(envCollection("lobbies")).doc(lobbyId).get();
    if (!snap.exists) return null;
    const d = snap.data() as Record<string, unknown>;
    if (d.visibility !== "public") return null;
    return {
      id: snap.id,
      name: str(d.name, "Lobby"),
      game: str(d.game),
      region: str(d.region),
      status: str(d.status, "open"),
      description: str(d.description),
      authorName: str(d.authorName),
      scheduledStartTime: typeof d.scheduledStartTime === "string" ? d.scheduledStartTime : null,
      createdAt: typeof d.createdAt === "string" ? d.createdAt : null,
    };
  } catch {
    return null;
  }
}

/** Most recent public lobbies, for the sitemap. */
export async function listPublicLobbyUrls(limit = 1000): Promise<{ id: string; lastModified: string | null }[]> {
  try {
    const snap = await getAdminDb()
      .collection(envCollection("lobbies"))
      .where("visibility", "==", "public")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, lastModified: str(doc.data().createdAt) || null }));
  } catch {
    return [];
  }
}
