import type { Metadata } from "next";
import { getPublicLobbySeo } from "@/lib/publicLobbies";
import { getSiteUrl, isIndexableEnv } from "@/lib/siteUrl";

type Props = { params: Promise<{ lobbyId: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { lobbyId } = await params;
  const lobby = await getPublicLobbySeo(lobbyId);
  if (!lobby) return { title: "Lobby", robots: { index: false, follow: false } };

  const title = `${lobby.name} — ${lobby.game || "Lobby"} | 4Hope`;
  const description =
    lobby.description.slice(0, 160) ||
    [`${lobby.name}: ${lobby.game} lobby`, lobby.region && `in ${lobby.region}`, lobby.authorName && `hosted by ${lobby.authorName}`]
      .filter(Boolean)
      .join(" ") + ". Join the squad and follow the live leaderboard on 4Hope.";
  const url = `${getSiteUrl()}/lobbies/${lobby.id}`;

  return {
    title,
    description,
    // Canonical drops ?token=… so edit links never become indexed duplicates.
    alternates: { canonical: url },
    robots: isIndexableEnv() ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, description, url, type: "website", siteName: "4Hope" },
    twitter: { card: "summary", title, description },
  };
}

export default async function LobbyLayout({ params, children }: Props) {
  const { lobbyId } = await params;
  const lobby = await getPublicLobbySeo(lobbyId);

  const jsonLd = lobby && {
    "@context": "https://schema.org",
    "@type": "Event",
    name: lobby.name,
    description: lobby.description || `${lobby.game} lobby on 4Hope`,
    url: `${getSiteUrl()}/lobbies/${lobby.id}`,
    startDate: lobby.scheduledStartTime ?? lobby.createdAt ?? undefined,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "VirtualLocation", url: `${getSiteUrl()}/lobbies/${lobby.id}` },
    organizer: lobby.authorName ? { "@type": "Person", name: lobby.authorName } : undefined,
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {children}
    </>
  );
}
