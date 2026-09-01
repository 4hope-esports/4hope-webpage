"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  UserPlus, Plus, RotateCcw, Users, Eye, Check, WifiOff, Play, Flag, ChevronLeft, Zap,
} from "lucide-react";
import { Avatar, Button, Card, Dialog, Divider, Tag } from "@/components/ui";
import { Leaderboard } from "@/components/data/Leaderboard";
import { useLeaderboardLobby, LeaderboardLobbyState, getSessionId, closeLobby, joinLobby } from "@/lib/useLeaderboardLobby";
import { POINTS_SCALE, ENTRY_MODE, defaultLobbyState } from "../shared";

const TOAST_MS = 4000;

const STATUS_SCHEME = { open: "positive", live: "brand", ended: "neutral" } as const;
const STATUS_LABEL = { open: "OPEN", live: "LIVE", ended: "CLOSED — FINAL" } as const;

export default function LeaderboardLobbyPage() {
  const params = useParams<{ lobbyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const lobbyId = params.lobbyId;
  const editToken = searchParams.get("token");

  const [copied, setCopied] = React.useState<"edit" | "view" | null>(null);
  const [lobbyIdCopied, setLobbyIdCopied] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [nameFilter, setNameFilter] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("");
  const [joining, setJoining] = React.useState(false);
  const [joined, setJoined] = React.useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((t) => (t === message ? null : t)), TOAST_MS);
  };

  const { state, setState, meta, status, loaded, closed, canEdit, markClosed, setLobbyStatus } = useLeaderboardLobby(
    lobbyId, editToken, React.useMemo(defaultLobbyState, []),
  );
  const {
    players, roundCount, scores, order, prizeTiers,
    rankMode, showPrize, cutoffOn, cutoffRank, cutoffLabel,
  } = state;

  const patch = (partial: Partial<LeaderboardLobbyState>) => setState((s) => ({ ...s, ...partial }));

  const sessionId = React.useMemo(() => getSessionId(), []);
  const isAuthor = canEdit || (meta?.authorSessionId === sessionId);
  const alreadyParticipant = Boolean(meta?.participants?.some((p) => p.sessionId === sessionId));

  const q = nameFilter.trim().toLowerCase();
  const rq = regionFilter.trim().toLowerCase();
  const visiblePlayers = players.filter(
    (p) => (!q || p.name.toLowerCase().includes(q)) && (!rq || (p.region || "").toLowerCase().includes(rq))
  );

  const addPlayer = () => {
    const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    patch({ players: [...players, { id, name: "NEW PLAYER", region: "" }], order: [...order, id] });
  };
  const reset = () => patch({ scores: {} });

  const syncFromParticipants = () => {
    const participants = meta?.participants ?? [];
    if (participants.length === 0) return;
    const byName = new Map(players.map((p) => [p.name, p]));
    const nextPlayers = participants.map((p) => byName.get(p.name) ?? { id: "p" + p.sessionId, name: p.name, region: "" });
    patch({ players: nextPlayers, order: nextPlayers.map((p) => p.id) });
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const editLink = editToken ? `${origin}/tournament/leaderboard/${lobbyId}?token=${editToken}` : "";
  const viewLink = `${origin}/tournament/leaderboard/${lobbyId}`;

  const copyLink = (kind: "edit" | "view") => {
    const link = kind === "edit" ? editLink : viewLink;
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(kind);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
  };

  const copyLobbyId = () => {
    navigator.clipboard?.writeText(lobbyId);
    setLobbyIdCopied(true);
    setTimeout(() => setLobbyIdCopied(false), 1500);
  };

  const confirmDisableSharing = async () => {
    if (!editToken) return;
    setClosing(true);
    const authorSessionId = getSessionId();
    markClosed();
    await closeLobby(lobbyId, editToken, authorSessionId);
    router.push("/tournament/leaderboard");
  };

  const startLobby = async () => {
    setStarting(true);
    await setLobbyStatus("live");
    setStarting(false);
  };

  const joinAsSelf = async () => {
    if (sessionStatus !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/tournament/leaderboard/${lobbyId}`)}`);
      return;
    }
    setJoining(true);

    const profileRes = await fetch("/api/profile/me");
    if (profileRes.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/tournament/leaderboard/${lobbyId}`)}`);
      return;
    }
    const profileJson = await profileRes.json();
    if (!profileJson.exists) {
      router.push(`/register?callbackUrl=${encodeURIComponent(`/tournament/leaderboard/${lobbyId}`)}`);
      return;
    }

    const ok = await joinLobby(lobbyId, sessionId, profileJson.profile.displayName);
    if (ok) setJoined(true);
    setJoining(false);
  };

  React.useEffect(() => {
    if (closed) showToast("This lobby is closed. The leaderboard is final and will no longer update.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  const readOnly = !canEdit;
  const isOpenPhase = status === "open";
  const canSeeBoard = !isOpenPhase || isAuthor;

  const toastEl = toast && (
    <div className="fixed bottom-5 right-5 z-50 max-w-[320px] rounded-[10px] border border-gold-500 bg-ink-900 px-4 py-3 font-mono text-xs font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      {toast}
    </div>
  );

  const confirmCloseModal = (
    <Dialog
      open={confirmCloseOpen}
      title="Stop sharing this lobby?"
      onClose={closing ? undefined : () => setConfirmCloseOpen(false)}
      actions={
        <>
          <Button variant="subtle" onClick={() => setConfirmCloseOpen(false)} disabled={closing} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmDisableSharing} disabled={closing} className="flex-1 justify-center">
            {closing ? "Closing…" : "Stop sharing"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="m-0 font-mono text-xs leading-relaxed text-white/50">
          Once closed, this lobby can&apos;t be reopened or edited again — the leaderboard freezes as-is for anyone with the link.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={lobbyId}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-[7px] border border-white/15 bg-ink-700 px-3 py-2 text-center font-mono text-[13px] font-bold tracking-[0.1em] text-white outline-none"
          />
          <Button variant="subtle" size="sm" iconLeft={lobbyIdCopied ? <Check size={13} /> : undefined} onClick={copyLobbyId}>
            {lobbyIdCopied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-ink-1000 font-body text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: "repeating-linear-gradient(-32deg, transparent 0 60px, var(--gold-500) 60px 82px)",
            maskImage: "linear-gradient(90deg, transparent 80%, black 92%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 80%, black 92%)",
          }}
        />
        <div className="relative mx-auto max-w-[900px] px-4 py-[22px] sm:px-9 sm:py-8.5">
          <div className="mb-2 font-mono text-[11px] font-bold tracking-[0.18em] text-gold-500">
            {"// 4HOPE TOURNAMENT TOOLS"}
          </div>
          <div className="flex items-start gap-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-gold-500 font-display text-[15px] font-black text-ink-1000"
              style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
            >
              LB
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display text-[30px] font-black uppercase leading-none tracking-[-0.02em] sm:text-[42px]">
                  {meta?.name || "Leaderboard"}
                </span>
                <Tag scheme={STATUS_SCHEME[status]} size="sm">{STATUS_LABEL[status]}</Tag>
              </div>
              {meta?.region ? (
                <div className="mt-1.5 font-mono text-[11px] text-white/50">{meta.region}</div>
              ) : null}
              {status === "open" && meta?.scheduledStartTime ? (
                <div className="mt-1.5 font-mono text-[11px] text-gold-500">
                  Starts {new Date(meta.scheduledStartTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bar 1: lobby + actions */}
      <div className="flex flex-col gap-2.5 border-b border-white/8 bg-ink-900 px-4 py-3 sm:px-9">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          {readOnly ? (
            !isAuthor && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">VIEW ONLY</span>
          ) : (
            <>
              <Button variant="subtle" size="sm" iconLeft={copied === "edit" ? <Check size={13} /> : <Users size={13} />} onClick={() => copyLink("edit")}>
                {copied === "edit" ? "Copied!" : "Copy Collaborator link"}
              </Button>
              <Button variant="subtle" size="sm" iconLeft={copied === "view" ? <Check size={13} /> : <Eye size={13} />} onClick={() => copyLink("view")}>
                {copied === "view" ? "Copied!" : "Copy Viewer link"}
              </Button>
              {status === "open" && (
                <Button variant="primary" size="sm" iconLeft={<Play size={13} />} onClick={startLobby} disabled={starting}>
                  {starting ? "Starting…" : "Start lobby"}
                </Button>
              )}
              {status === "live" && (
                <Button variant="subtle" size="sm" iconLeft={<Flag size={13} />} onClick={() => setConfirmCloseOpen(true)}>
                  End lobby
                </Button>
              )}
              {status !== "live" && (
                <Button variant="subtle" size="sm" iconLeft={<WifiOff size={13} />} onClick={() => setConfirmCloseOpen(true)}>
                  Stop sharing
                </Button>
              )}
            </>
          )}
        </div>

        {!readOnly && canSeeBoard && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <Button variant="subtle" size="sm" iconLeft={<UserPlus size={13} />} onClick={addPlayer}>Add player</Button>
            <Button variant="subtle" size="sm" iconLeft={<Plus size={13} />} onClick={() => patch({ roundCount: Math.max(1, roundCount + 1) })}>Add round</Button>
            <Button variant="subtle" size="sm" iconLeft={<RotateCcw size={13} />} onClick={reset}>Reset scores</Button>
            {status === "open" && (meta?.participants?.length ?? 0) > 0 && (
              <Button variant="subtle" size="sm" iconLeft={<Users size={13} />} onClick={syncFromParticipants}>
                Set up from participants
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bar 2: settings */}
      {!readOnly && canSeeBoard && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-white/8 bg-ink-950 px-4 py-3.5 sm:px-9">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={cutoffOn} onChange={(e) => patch({ cutoffOn: e.target.checked })} />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">Cutoff line</span>
          </label>
          {cutoffOn && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">after rank</span>
                <input type="number" min="1" value={cutoffRank}
                  onChange={(e) => patch({ cutoffRank: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-[52px] rounded-[7px] border border-white/14 bg-ink-700 px-2 py-1.5 text-center font-mono text-[11.5px] font-bold text-white outline-none" />
              </div>
              <div className="flex flex-1 items-center gap-2 sm:max-w-[260px] sm:flex-none">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">label</span>
                <input value={cutoffLabel} onChange={(e) => patch({ cutoffLabel: e.target.value })}
                  className="min-w-0 flex-1 rounded-[7px] border border-white/14 bg-ink-700 px-2 py-1.5 font-mono text-[11.5px] font-bold text-white outline-none" />
              </div>
            </>
          )}
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showPrize} onChange={(e) => patch({ showPrize: e.target.checked })} />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">Prize column</span>
          </label>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-5 pb-10 sm:px-9">
        {!loaded ? (
          <div className="p-6 font-mono text-xs text-white/50">LOADING…</div>
        ) : !canSeeBoard ? (
          <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 py-2 sm:grid-cols-[1.6fr_1fr]">
            <Card tone="arena" className="flex flex-col gap-4 p-6">
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/tournament/leaderboard")}
                  className="mb-4 inline-flex items-center gap-1.5 border-none bg-transparent p-0 font-mono text-xs text-white/50 hover:text-white/70"
                >
                  <ChevronLeft size={14} /> Back to lobbies
                </button>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{"// This lobby hasn't started yet"}</span>
                <Divider className="my-3.5" />
                <p className="m-0 text-sm leading-relaxed text-white/60">
                  The leaderboard unlocks once {meta?.authorName || "the host"} starts the lobby. Join now to be on the list.
                </p>
              </div>

              <div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/50">
                  Participants ({meta?.participants?.length ?? 0})
                </span>
                <div className="mt-2.5 flex flex-col gap-2">
                  {(meta?.participants ?? []).map((p) => (
                    <div key={p.sessionId} className="flex items-center gap-2 font-mono text-[13px] text-white">
                      <Avatar src={p.photoURL} name={p.name} size="xs" />
                      {p.name}
                      {p.sessionId === meta?.authorSessionId ? (
                        <span className="text-[10px] tracking-[0.06em] text-gold-500">HOST</span>
                      ) : null}
                    </div>
                  ))}
                  {(meta?.participants ?? []).length === 0 ? (
                    <div className="font-mono text-xs text-white/35">No one has joined yet.</div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card tone="arena" className="flex flex-col gap-4 p-5">
              {!joined && !alreadyParticipant ? (
                <Button variant="primary" size="lg" full iconLeft={<Zap size={18} />} onClick={joinAsSelf} disabled={joining}>
                  {joining ? "Joining…" : "Join lobby"}
                </Button>
              ) : (
                <div className="text-center font-mono text-xs text-gold-500">You&apos;re on the list.</div>
              )}
            </Card>
          </div>
        ) : (
          <Leaderboard
            players={visiblePlayers}
            onPlayersChange={(edited) => {
              const visibleIds = new Set(visiblePlayers.map((p) => p.id));
              const editedById = new Map(edited.map((p) => [p.id, p]));
              const merged = players
                .filter((p) => !visibleIds.has(p.id) || editedById.has(p.id))
                .map((p) => editedById.get(p.id) || p);
              patch({ players: merged });
            }}
            roundCount={roundCount} onRoundCountChange={(n) => patch({ roundCount: n })}
            scores={scores} onScoresChange={(s) => patch({ scores: s })}
            pointsScale={POINTS_SCALE} entryMode={ENTRY_MODE}
            rankMode={rankMode} order={order} onOrderChange={(o) => patch({ order: o })}
            showPrize={showPrize} prizeTiers={prizeTiers} onPrizeTiersChange={(t) => patch({ prizeTiers: t })}
            nameFilter={nameFilter} onNameFilterChange={setNameFilter}
            regionFilter={regionFilter} onRegionFilterChange={setRegionFilter}
            cutoffRank={cutoffOn ? cutoffRank : null} cutoffLabel={cutoffLabel}
            readOnly={readOnly || status === "ended"}
          />
        )}
      </div>
      {toastEl}
      {confirmCloseModal}
    </div>
  );
}
