"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Plus, Users, Loader2, Clock, X } from "lucide-react";
import { Avatar, Button, Card, Dialog, FormField, GoldBars, Input, Switch, Tag, Textarea } from "@/components/ui";
import { createLobby, getSessionId, LobbyMeta } from "@/lib/useLeaderboardLobby";
import { RIOT_SERVERS, type RiotServer } from "@/api/riot/account";
import { defaultLobbyState } from "./shared";

const GAMES = ["League of Legends", "TFT"] as const;
type Game = (typeof GAMES)[number];
const SORTED_RIOT_SERVERS = [...RIOT_SERVERS].sort((a, b) => a.label.localeCompare(b.label));

interface LobbyRow {
  id: string;
  name: string;
  game: string;
  region: string;
  status: "open" | "live" | "ended";
  authorName: string;
  authorPhotoURL: string | null;
  scheduledStartTime: string | null;
  participantCount: number;
  createdAt: string;
}

const STATUS_SCHEME = { open: "positive", live: "brand", ended: "neutral" } as const;
const STATUS_LABEL = { open: "OPEN", live: "LIVE", ended: "ENDED" } as const;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeaderboardDirectoryPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [lobbies, setLobbies] = React.useState<LobbyRow[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createStep, setCreateStep] = React.useState<1 | 2>(1);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [lobbyName, setLobbyName] = React.useState("");
  const [game, setGame] = React.useState<Game>("TFT");
  const [limit, setLimit] = React.useState("8");
  const [region, setRegion] = React.useState("");
  const [riotServer, setRiotServer] = React.useState<RiotServer>("NA");
  const [scheduled, setScheduled] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [prizes, setPrizes] = React.useState<string[]>([]);
  const [prizeInput, setPrizeInput] = React.useState("");
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const loadPage = React.useCallback(async (after: string | null) => {
    const url = after ? `/api/lobby?after=${encodeURIComponent(after)}` : "/api/lobby";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { lobbies: LobbyRow[]; nextCursor: string | null };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await loadPage(null);
      if (cancelled) return;
      setLobbies(page?.lobbies ?? []);
      setCursor(page?.nextCursor ?? null);
      setHasMore(Boolean(page?.nextCursor));
      setLoadingInitial(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    const page = await loadPage(cursor);
    setLobbies((prev) => [...prev, ...(page?.lobbies ?? [])]);
    setCursor(page?.nextCursor ?? null);
    setHasMore(Boolean(page?.nextCursor));
    setLoadingMore(false);
  }, [cursor, hasMore, loadingMore, loadPage]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const q = query.trim().toLowerCase();
  const visible = lobbies.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.authorName.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q) ||
      STATUS_LABEL[r.status].toLowerCase().includes(q),
  );

  const openCreate = async () => {
    if (sessionStatus !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/tournament/leaderboard")}`);
      return;
    }
    const profileRes = await fetch("/api/profile/me");
    if (profileRes.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/tournament/leaderboard")}`);
      return;
    }
    const profileJson = await profileRes.json();
    if (!profileJson.exists) {
      router.push(`/register?callbackUrl=${encodeURIComponent("/tournament/leaderboard")}`);
      return;
    }
    setCreateError(null);
    setCreateStep(1);
    setLobbyName("");
    setGame("TFT");
    setLimit("8");
    setRegion("");
    setRiotServer("NA");
    setScheduled(false);
    setScheduledAt("");
    setDescription("");
    setPrizes([]);
    setPrizeInput("");
    setCreateOpen(true);
  };

  const addPrize = () => {
    const value = prizeInput.trim();
    if (!value) return;
    setPrizes((p) => [...p, value]);
    setPrizeInput("");
  };
  const removePrize = (index: number) => setPrizes((p) => p.filter((_, i) => i !== index));

  const limitNumber = Number(limit);
  const step1Valid = Boolean(lobbyName.trim()) && Boolean(region.trim()) && Number.isFinite(limitNumber) && limitNumber >= 2 && limitNumber <= 200 && (!scheduled || Boolean(scheduledAt));

  const goToStep2 = () => {
    if (!step1Valid) {
      setCreateError("Fill in all required fields.");
      return;
    }
    setCreateError(null);
    setCreateStep(2);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep === 1) {
      goToStep2();
      return;
    }
    if (!step1Valid) {
      setCreateStep(1);
      setCreateError("Fill in all required fields.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    const profileRes = await fetch("/api/profile/me");
    if (profileRes.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/tournament/leaderboard")}`);
      return;
    }
    const profileJson = await profileRes.json();
    if (!profileJson.exists) {
      router.push(`/register?callbackUrl=${encodeURIComponent("/tournament/leaderboard")}`);
      return;
    }
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/tournament/leaderboard")}`);
      return;
    }

    const sessionId = getSessionId();
    const editToken = crypto.randomUUID();
    const lobbyId = crypto.randomUUID();
    // datetime-local has no timezone; new Date() interprets it in the browser's
    // local zone, and toISOString() below then carries that as a UTC offset.
    const scheduledStartTime = scheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const meta: LobbyMeta = {
      name: lobbyName.trim(),
      region: region.trim(),
      authorName: profileJson.profile.displayName,
      authorPhotoURL: profileJson.profile.photoURL ?? null,
      scheduledStartTime,
      ownerUserId: session.user.id,
      game,
      riotServer,
      limit: limitNumber,
      prizes,
      description: description.trim(),
    };
    const result = await createLobby(lobbyId, editToken, sessionId, meta, defaultLobbyState());
    if (result.ok) {
      router.push(`/tournament/leaderboard/${lobbyId}?token=${editToken}`);
      return;
    }
    setCreateError(
      result.error === "LIMIT_REACHED"
        ? "You already have 3 open lobbies — end or close one before opening another."
        : "Could not create the lobby. Please try again.",
    );
    setCreating(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ink-1000">
      <div className="relative overflow-hidden border-b border-white/8">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: "repeating-linear-gradient(-32deg, transparent 0 60px, var(--color-gold-500) 60px 82px)",
            maskImage: "linear-gradient(90deg, transparent 80%, black 92%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 80%, black 92%)",
          }}
        />
        <div className="relative px-5 py-6 sm:px-9 sm:py-8">
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-gold-500">
            {"// Browse & join"}
          </div>
          <h1 className="font-display text-[30px] font-black uppercase leading-none tracking-[-0.02em] text-white sm:text-[42px]">
            Lobbies
          </h1>
        </div>
      </div>

      <div className="border-b border-white/8 bg-ink-900">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-5 py-4 sm:px-9">
          <div className="min-w-0 flex-1 basis-full sm:basis-[320px]">
            <Input
              placeholder="Search by title, author, region, or status"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              iconLeft={<Search size={16} />}
              className="w-full"
            />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
            {lobbies.length} {lobbies.length === 1 ? "lobby" : "lobbies"}
          </div>
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />} onClick={openCreate} className="ml-auto">
            Open a lobby
          </Button>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1200px] px-5 py-2 pb-12 sm:px-9">
        <GoldBars />
        {loadingInitial ? (
          <div className="relative z-10 flex items-center gap-2 py-16 justify-center font-mono text-xs text-white/50">
            <Loader2 size={16} className="animate-spin" /> LOADING…
          </div>
        ) : visible.length === 0 ? (
          <div className="relative z-10 flex flex-col items-center gap-3 py-20 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.06em] text-white/40">
              {lobbies.length === 0 ? "No lobbies yet — be the first to open one." : "No lobbies match — try a different search."}
            </p>
            {lobbies.length === 0 ? (
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />} onClick={openCreate}>
                Open a lobby
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="relative z-10">
            {visible.map((lobby) => (
              <LobbyListRow key={lobby.id} lobby={lobby} />
            ))}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 py-6 font-mono text-xs text-white/50">
                <Loader2 size={14} className="animate-spin" /> Loading more…
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Dialog
        open={createOpen}
        title="Open a lobby"
        onClose={creating ? undefined : () => setCreateOpen(false)}
        actions={
          <>
            {createStep === 1 ? (
              <Button type="button" variant="subtle" size="md" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="subtle" size="md" onClick={() => setCreateStep(1)} disabled={creating}>
                Back
              </Button>
            )}
            <Button type="submit" form="create-lobby-form" variant="primary" size="md" disabled={creating || (createStep === 1 && !step1Valid)}>
              {createStep === 1 ? "Next" : creating ? "Opening…" : "Open lobby"}
            </Button>
          </>
        }
      >
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">
          Step {createStep} of 2 — {createStep === 1 ? "the essentials" : "optional details"}
        </div>
        <form id="create-lobby-form" onSubmit={submitCreate} className="flex flex-col gap-4">
          {createStep === 1 ? (
            <>
              <FormField label="Lobby name" required>
                <Input value={lobbyName} onChange={(e) => setLobbyName(e.target.value)} placeholder="e.g. Sunday night 5-stack" maxLength={80} />
              </FormField>
              <div className="flex gap-3">
                <FormField label="Game" required className="flex-1">
                  <select
                    value={game}
                    onChange={(e) => setGame(e.target.value as Game)}
                    className="h-[42px] w-full rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white outline-none focus:border-gold-500 focus:ring-[3px] focus:ring-gold-500/26"
                  >
                    {GAMES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Participant limit" required className="w-32 shrink-0">
                  <Input
                    type="number"
                    min={2}
                    max={200}
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="flex gap-3">
                <FormField label="Region" required className="flex-1">
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. AMER" maxLength={40} />
                </FormField>
                <FormField label="Riot server" required className="flex-1">
                  <select
                    value={riotServer}
                    onChange={(e) => setRiotServer(e.target.value as RiotServer)}
                    className="h-[42px] w-full rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white outline-none focus:border-gold-500 focus:ring-[3px] focus:ring-gold-500/26"
                  >
                    {SORTED_RIOT_SERVERS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <Switch checked={scheduled} onChange={setScheduled} label="Schedule this lobby" />
              {scheduled ? (
                <FormField label="Starts at" hint="Shown in your local time.">
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </FormField>
              ) : null}
            </>
          ) : (
            <>
              <FormField label="Description" hint="Optional — what's this lobby about?">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ranked grind, scrim block, chill pug…"
                  maxLength={2000}
                  rows={4}
                />
              </FormField>
              <FormField label="Prizes" hint="Optional — add one or more prizes.">
                <div className="flex gap-2">
                  <Input
                    value={prizeInput}
                    onChange={(e) => setPrizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPrize();
                      }
                    }}
                    placeholder="e.g. $100 gift card"
                    maxLength={40}
                    className="flex-1"
                  />
                  <Button type="button" variant="subtle" size="md" onClick={addPrize}>
                    Add
                  </Button>
                </div>
                {prizes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {prizes.map((p, i) => (
                      <Tag key={i} scheme="neutral" size="sm" className="gap-1.5 pr-1.5">
                        {p}
                        <button
                          type="button"
                          onClick={() => removePrize(i)}
                          aria-label={`Remove ${p}`}
                          className="inline-flex rounded-full p-0.5 hover:bg-white/15"
                        >
                          <X size={11} />
                        </button>
                      </Tag>
                    ))}
                  </div>
                ) : null}
              </FormField>
            </>
          )}
          {createError ? <p className="text-sm text-red-400">{createError}</p> : null}
        </form>
      </Dialog>
    </div>
  );
}

function LobbyListRow({ lobby }: { lobby: LobbyRow }) {
  const router = useRouter();
  return (
    <Card
      tone="arena"
      className="mb-3 flex cursor-pointer flex-wrap items-center gap-4 p-4 transition-colors hover:border-gold-500/40"
      onClick={() => router.push(`/tournament/leaderboard/${lobby.id}`)}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-white">{lobby.name}</span>
          <Tag scheme={STATUS_SCHEME[lobby.status]} size="sm">
            {STATUS_LABEL[lobby.status]}
          </Tag>
          {lobby.status === "open" && lobby.scheduledStartTime ? (
            <Tag scheme="brand" size="sm">
              <Clock size={11} /> {formatScheduledTime(lobby.scheduledStartTime)}
            </Tag>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3.5 font-mono text-[11.5px] text-white/55">
          <span className="flex items-center gap-1.5">
            <Avatar src={lobby.authorPhotoURL} name={lobby.authorName} size="xs" /> {lobby.authorName}
          </span>
          <span>{lobby.region}</span>
          <span className="flex items-center gap-1">
            <Users size={13} /> {lobby.participantCount}
          </span>
          <span>{timeAgo(lobby.createdAt)}</span>
        </div>
      </div>
      <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/tournament/leaderboard/${lobby.id}`); }}>
        View lobby
      </Button>
    </Card>
  );
}
