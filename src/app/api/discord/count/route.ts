import { NextResponse } from "next/server";

export const revalidate = 60;

function inviteCode(url: string): string | null {
  const match = url.match(/discord\.gg\/([^/?]+)/);
  return match ? match[1] : null;
}

export async function GET() {
  const discordUrl = process.env.DISCORD_URL;
  const code = discordUrl ? inviteCode(discordUrl) : null;

  if (!code) {
    return NextResponse.json({ online: null, memberCount: null }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${code}?with_counts=true`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error(`Discord invite API ${res.status}`);
    const data = await res.json();
    return NextResponse.json({
      online: data.approximate_presence_count ?? null,
      memberCount: data.approximate_member_count ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch Discord invite counts", error);
    return NextResponse.json({ online: null, memberCount: null }, { status: 500 });
  }
}
