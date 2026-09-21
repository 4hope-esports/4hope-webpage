"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Plus, Users, Loader2, Clock, X } from "lucide-react";
import {
  Avatar, Button, Card, Dialog, FormField, Input, Tag, Textarea, Tooltip,
} from "@/components/ui";
import { createLobby, getSessionId, LobbyMeta } from "@/lib/useLeaderboardLobby";
import { RIOT_SERVERS, type RiotServer } from "@/api/riot/account";
import { defaultLobbyState, emptyLobbyState } from "./shared";
import { DateTimePicker, LobbyEssentialsFields, GLOBAL_SERVER, regionForServerChoice, type ServerChoice } from "./LobbyFormFields";

const MIN_SCHEDULE_LEAD_MINUTES = 30;
const MIN_SCHEDULE_LEAD_MS = MIN_SCHEDULE_LEAD_MINUTES * 60_000;

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
  limit: number | null;
  createdAt: string;
}

const STATUS_SCHEME = { open: "positive", live: "brand", ended: "neutral" } as const;
const STATUS_LABEL = { open: "OPEN", live: "LIVE", ended: "ENDED" } as const;

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const OPEN_LOBBY_CALLBACK = "/lobbies?openLobbyForm=1";

export default function LeaderboardDirectoryPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardDirectory />
    </Suspense>
  );
}

function LeaderboardDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [limitReachedOpen, setLimitReachedOpen] = React.useState(false);
  const [lobbyName, setLobbyName] = React.useState("");
  const [limit, setLimit] = React.useState("8");
  const [serverChoice, setServerChoice] = React.useState<ServerChoice>("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [prizeTiers, setPrizeTiers] = React.useState<string[]>([]);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!createOpen) return;
    const interval = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [createOpen]);

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
      router.push(`/login?callbackUrl=${encodeURIComponent(OPEN_LOBBY_CALLBACK)}`);
      return;
    }
    const profileRes = await fetch("/api/profile/me");
    if (profileRes.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(OPEN_LOBBY_CALLBACK)}`);
      return;
    }
    const profileJson = await profileRes.json();
    if (!profileJson.exists) {
      router.push(`/register?callbackUrl=${encodeURIComponent(OPEN_LOBBY_CALLBACK)}`);
      return;
    }
    const linkedServer = profileJson.profile?.riot?.server as RiotServer | undefined;
    setCreateError(null);
    setCreateStep(1);
    setLobbyName("");
    setLimit("8");
    setServerChoice(linkedServer && RIOT_SERVERS.some((s) => s.value === linkedServer) ? linkedServer : "LAN");
    setScheduledAt("");
    setDescription("");
    setPrizeTiers([]);
    setCreateOpen(true);
  };

  const autoOpenedRef = React.useRef(false);
  React.useEffect(() => {
    // sessionStatus is "loading" for a beat on first mount — waiting it out
    // avoids treating an actually-signed-in user as logged out and bouncing
    // them straight back to /login.
    if (sessionStatus === "loading") return;
    if (searchParams.get("openLobbyForm") !== "1") return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    // Drop the query param immediately so a refresh/back-nav doesn't reopen the dialog.
    router.replace("/lobbies");
    openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, searchParams]);

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const setPrizeAt = (index: number, value: string) => {
    setPrizeTiers((tiers) => {
      const next = [...tiers];
      next[index] = value;
      return next;
    });
  };
  const addPrizeTier = () =>
    setPrizeTiers((tiers) => (Number.isFinite(limitNumber) && tiers.length >= limitNumber ? tiers : [...tiers, ""]));
  const removePrizeTier = (index: number) => setPrizeTiers((tiers) => tiers.filter((_, i) => i !== index));

  const limitNumber = Number(limit);
  const scheduledAtMs = scheduledAt ? new Date(scheduledAt).getTime() : NaN;
  // Scheduling is optional — leave the field blank to decide the start time later.
  const scheduleTooSoon = Boolean(scheduledAt) && (!Number.isFinite(scheduledAtMs) || scheduledAtMs - nowMs < MIN_SCHEDULE_LEAD_MS);
  const step1Valid =
    Boolean(lobbyName.trim()) &&
    Boolean(serverChoice) &&
    Number.isFinite(limitNumber) &&
    limitNumber >= 2 &&
    limitNumber <= 200 &&
    !scheduleTooSoon;

  const goToStep2 = () => {
    if (scheduleTooSoon) {
      setCreateError(`Scheduled start must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now.`);
      return;
    }
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
      setCreateError(
        scheduleTooSoon
          ? `Scheduled start must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now.`
          : "Fill in all required fields.",
      );
      return;
    }
    setCreating(true);
    setCreateError(null);

    const profileRes = await fetch("/api/profile/me");
    if (profileRes.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/lobbies")}`);
      return;
    }
    const profileJson = await profileRes.json();
    if (!profileJson.exists) {
      router.push(`/register?callbackUrl=${encodeURIComponent("/lobbies")}`);
      return;
    }
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/lobbies")}`);
      return;
    }

    const sessionId = getSessionId();
    const editToken = crypto.randomUUID();
    const lobbyId = crypto.randomUUID();
    // datetime-local has no timezone; new Date() interprets it in the browser's
    // local zone, and toISOString() below then carries that as a UTC offset.
    const scheduledStartTime = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const meta: LobbyMeta = {
      name: lobbyName.trim(),
      region: regionForServerChoice(serverChoice),
      authorName: profileJson.profile.displayName,
      authorPhotoURL: profileJson.profile.photoURL ?? null,
      scheduledStartTime,
      ownerUserId: session.user.id,
      game: "TFT",
      riotServer: serverChoice === GLOBAL_SERVER ? null : serverChoice || null,
      limit: limitNumber,
      description: description.trim(),
    };
    const trimmedTiers = prizeTiers.map((t) => t.trim());
    const hasPrizes = trimmedTiers.some((t) => t.length > 0);
    const state = {
      ...emptyLobbyState(),
      ...(hasPrizes ? { prizeTiers: trimmedTiers, showPrize: true } : {}),
    };
    const result = await createLobby(lobbyId, editToken, sessionId, meta, state);
    if (result.ok) {
      router.push(`/lobbies/${lobbyId}?token=${editToken}`);
      return;
    }
    if (result.error === "LIMIT_REACHED") {
      setCreateOpen(false);
      setLimitReachedOpen(true);
    } else {
      setCreateError("Could not create the lobby. Please try again.");
    }
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
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />} onClick={openCreate} className="mt-4 w-full sm:hidden">
            Open a lobby
          </Button>
        </div>
      </div>

      <div className="sticky top-16 z-10 bg-ink-900">
        <div className="mx-auto max-w-[1200px] px-5 py-4 sm:px-9">
          <Input
            placeholder="Search by title, author, region, or status"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            iconLeft={<Search size={16} />}
            className="w-full sm:max-w-[420px]"
          />
        </div>
      </div>

      <div className="border-b border-white/8 bg-ink-900">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-5 pb-4 sm:px-9">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
            {lobbies.length} {lobbies.length === 1 ? "lobby" : "lobbies"}
          </div>
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />} onClick={openCreate} className="ml-auto hidden sm:inline-flex">
            Open a lobby
          </Button>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1200px] px-5 py-2 pb-12 sm:px-9">
        {loadingInitial ? (
          <div className="relative z-0 flex items-center gap-2 py-16 justify-center font-mono text-xs text-white/50">
            <Loader2 size={16} className="animate-spin" /> LOADING…
          </div>
        ) : visible.length === 0 ? (
          <div className="relative z-0 flex flex-col items-center gap-3 py-20 text-center">
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
          <div className="relative z-0">
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
        <form id="create-lobby-form" onSubmit={submitCreate} className="flex flex-col gap-3.5">
          {createStep === 1 ? (
            <>
              <LobbyEssentialsFields
                name={lobbyName}
                onNameChange={setLobbyName}
                limit={limit}
                onLimitChange={setLimit}
                server={serverChoice}
                onServerChange={setServerChoice}
              />
              <FormField
                label="Event date & time"
                hint="Optional — leave blank to decide later."
                error={scheduleTooSoon ? `Pick a time at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now.` : undefined}
              >
                <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
              </FormField>
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
              <FormField
                label="Prizes"
                hint={`Optional — set a prize for each finishing place (up to ${Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : "capacity"}).`}
              >
                <div className="flex flex-col gap-2">
                  {prizeTiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 font-mono text-xs text-white/50">{ordinal(i + 1)}</span>
                      <Input
                        value={tier}
                        onChange={(e) => setPrizeAt(i, e.target.value)}
                        placeholder="e.g. $100 gift card"
                        maxLength={40}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removePrizeTier(i)}
                        aria-label={`Remove ${ordinal(i + 1)} place prize`}
                        className="inline-flex shrink-0 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={addPrizeTier}
                    disabled={Number.isFinite(limitNumber) && prizeTiers.length >= limitNumber}
                    className="self-start"
                  >
                    Add a place
                  </Button>
                </div>
              </FormField>
            </>
          )}
          {createError ? <p className="text-sm text-red-400">{createError}</p> : null}
        </form>
      </Dialog>

      <Dialog
        open={limitReachedOpen}
        title="You've reached the lobby limit"
        onClose={() => setLimitReachedOpen(false)}
        actions={
          <>
            <Button variant="subtle" size="md" onClick={() => setLimitReachedOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push("/profile?tab=Overview")}
            >
              Go to My Lobbies
            </Button>
          </>
        }
      >
        You already have 3 open lobbies. End or delete one from your profile before opening another.
      </Dialog>
    </div>
  );
}

function LobbyListRow({ lobby }: { lobby: LobbyRow }) {
  const router = useRouter();
  return (
    <Card
      tone="arena"
      className="mb-3 flex cursor-pointer flex-wrap items-center gap-4 p-4 transition-colors hover:border-gold-500/40 sm:flex-nowrap"
      onClick={() => router.push(`/lobbies/${lobby.id}`)}
    >
      <div className="relative hidden h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ink-800 sm:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/clover-mark.png" alt="" className="h-9 w-9 opacity-30" />
        <span className="absolute inset-0 flex items-center justify-center text-center font-display text-[9px] font-black uppercase tracking-[0.02em] text-gold-500">
          {lobby.game}
        </span>
      </div>
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <div className="mb-1 flex flex-nowrap items-center gap-2">
          <Tooltip label={lobby.name} className="min-w-0">
            <span className="block truncate font-display text-[17px] font-extrabold tracking-[-0.01em] text-white">{lobby.name}</span>
          </Tooltip>
          <Tag scheme={STATUS_SCHEME[lobby.status]} variant={lobby.status === "live" ? "solid" : "subtle"} size="sm" className="shrink-0">
            {STATUS_LABEL[lobby.status]}
          </Tag>
        </div>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-[11.5px] text-white/55">
          <span className="flex items-center gap-1.5">
            <Avatar src={lobby.authorPhotoURL} name={lobby.authorName} size="xs" /> {lobby.authorName}
          </span>
          <span>{lobby.game}</span>
          <span>{lobby.region}</span>
          <span className="flex items-center gap-1">
            <Users size={13} /> {lobby.participantCount}{lobby.limit ? `/${lobby.limit}` : ""}
          </span>
          <span className="flex items-center gap-1">
            {lobby.status === "open" && lobby.scheduledStartTime ? <Clock size={11} className="text-gold-500" /> : null}
            Starts {lobby.scheduledStartTime ? formatScheduledTime(lobby.scheduledStartTime) : "TBD"}
          </span>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        className="w-full justify-center sm:w-auto"
        onClick={(e) => { e.stopPropagation(); router.push(`/lobbies/${lobby.id}`); }}
      >
        View lobby
      </Button>
    </Card>
  );
}
