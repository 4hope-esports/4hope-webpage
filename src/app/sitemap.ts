import type { MetadataRoute } from "next";
import { listPublicLobbyUrls } from "@/lib/publicLobbies";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const lobbies = await listPublicLobbyUrls();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/lobbies`, changeFrequency: "hourly", priority: 0.8 },
    ...lobbies.map((l) => ({
      url: `${base}/lobbies/${l.id}`,
      lastModified: l.lastModified ?? undefined,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
