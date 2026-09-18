"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  UserPlus, Plus, RotateCcw, Users, Eye, Check, WifiOff, Play, Flag, ChevronLeft, Zap,
  Globe, Server, Calendar, Award, BarChart2, Settings, LogOut, X, Lock, Mail, Copy,
} from "lucide-react";
import { Avatar, Button, Card, Dialog, Divider, FormField, Input, LoadingScreen, Tag, Textarea, Tooltip } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { Leaderboard } from "@/components/data/Leaderboard";
import {
  useLeaderboardLobby, LeaderboardLobbyState, LobbyPerson, getSessionId,
  joinLobby, leaveLobby, setParticipantApproval,
} from "@/lib/useLeaderboardLobby";
import { type RiotServer } from "@/api/riot/account";
import { POINTS_SCALE, ENTRY_MODE, defaultLobbyState, previewPlayers } from "../shared";
import {
  DateTimePicker, LobbyEssentialsFields, SearchableSelect, GLOBAL_SERVER, SORTED_RIOT_SERVERS,
  regionForServer, regionForServerChoice, type ServerChoice,
} from "../LobbyFormFields";

const REGION_SUGGESTIONS = ["Americas", "APAC", "EMEA", "Global"];

const STATUS_SCHEME = { open: "positive", live: "brand", ended: "neutral" } as const;
const STATUS_LABEL = { open: "OPEN", live: "LIVE", ended: "ENDED" } as const;

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-gold-500">{icon}</span>
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/62">{label}</div>
        <div className="mt-0.5 text-[14.5px] font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "TBD";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function LeaderboardLobbyPage() {
  const params = useParams<{ lobbyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const lobbyId = params.lobbyId;
  const editToken = searchParams.get("token");

  const { showToast } = useToast();
  const [copied, setCopied] = React.useState<"edit" | "view" | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [nameFilter, setNameFilter] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("");
  const [joining, setJoining] = React.useState(false);
  const [joined, setJoined] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [joinUsername, setJoinUsername] = React.useState("");
  const [joinTagline, setJoinTagline] = React.useState("");
  const [joinServer, setJoinServer] = React.useState<RiotServer | "">("");
  const [hostSettingsOpen, setHostSettingsOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editServerChoice, setEditServerChoice] = React.useState<ServerChoice>("");
  const [editLimit, setEditLimit] = React.useState("");
  const [editScheduledAt, setEditScheduledAt] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editPrizeTiers, setEditPrizeTiers] = React.useState<string[]>([]);
  const [editSaving, setEditSaving] = React.useState(false);
  const [hostEditStep, setHostEditStep] = React.useState<1 | 2>(1);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [hasLeft, setHasLeft] = React.useState(false);
  const [leaveConfirming, setLeaveConfirming] = React.useState(false);
  const [leavingInFlight, setLeavingInFlight] = React.useState(false);
  const [leaveError, setLeaveError] = React.useState<string | null>(null);

  const { state, setState, people, setPeople, meta, status, loaded, closed, canEdit, setLobbyStatus, updateMeta, refetch, flushWrite } = useLeaderboardLobby(
    lobbyId, editToken, React.useMemo(defaultLobbyState, []),
  );
  const {
    roundCount, scores, order, prizeTiers,
    rankMode, showPrize, cutoffOn, cutoffRank, cutoffLabel,
  } = state;

  // The loading screen is a deliberate brand moment (spinner + rotating tip),
  // not just a spinner while we wait on the network — so it stays up at least
  // this long, even when the fetch resolves instantly. But that's only worth
  // doing once per tab session — a host repeatedly jumping back into a live
  // lobby shouldn't eat a forced 3s wait every single time.
  const MIN_LOADING_SCREEN_MS = 3000;
  const LOADING_SCREEN_SEEN_KEY = "4hope:lobbyLoadingSeen";
  const [minLoadingElapsed, setMinLoadingElapsed] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(LOADING_SCREEN_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    if (minLoadingElapsed) return;
    const t = setTimeout(() => {
      setMinLoadingElapsed(true);
      try {
        sessionStorage.setItem(LOADING_SCREEN_SEEN_KEY, "1");
      } catch {}
    }, MIN_LOADING_SCREEN_MS);
    return () => clearTimeout(t);
  }, [lobbyId, minLoadingElapsed]);
  const showLoadingScreen = !loaded || !minLoadingElapsed;

  // Text-field edits (name/region/score cells, cutoff label, ...) only save on
  // blur/Enter — see flushWrite. A discrete action (click/checkbox/toggle) has
  // no blur to hang off of, so it passes { save: true } to commit right away;
  // it computes `next` synchronously since `state`/`people` won't reflect this
  // change until the next render.
  //
  // dirtyRef tracks an in-progress, not-yet-flushed text edit. The 60s
  // auto-refresh below replaces `state`/`people` wholesale with whatever the
  // server last had — if that lands while someone's mid-keystroke in a
  // name/region cell, it silently reverts what they just typed. Pausing the
  // refresh while dirty avoids that; it resumes once the field blurs and flushes.
  const dirtyRef = React.useRef(false);
  const patch = (partial: Partial<LeaderboardLobbyState>, opts?: { save?: boolean }) => {
    const next = { ...state, ...partial };
    setState(next);
    if (opts?.save) {
      flushWrite(next);
      dirtyRef.current = false;
    } else {
      dirtyRef.current = true;
    }
  };
  const patchPeople = (next: LobbyPerson[], opts?: { save?: boolean }) => {
    setPeople(next);
    if (opts?.save) {
      flushWrite(undefined, next);
      dirtyRef.current = false;
    } else {
      dirtyRef.current = true;
    }
  };
  const commitField = () => {
    flushWrite();
    dirtyRef.current = false;
  };

  const sessionId = React.useMemo(() => getSessionId(), []);
  const myUserId = session?.user?.id ?? null;
  const isAuthor = canEdit || (meta?.authorSessionId === sessionId) || (Boolean(myUserId) && meta?.ownerUserId === myUserId);
  const alreadyParticipant = Boolean(myUserId && people.some((p) => p.userId === myUserId));

  // A "My lobbies" row's Edit button links here with ?edit=1 so the host
  // lands straight in Host settings instead of the info page first.
  const autoOpenedEditRef = React.useRef(false);
  React.useEffect(() => {
    if (autoOpenedEditRef.current) return;
    if (searchParams.get("edit") !== "1" || !isAuthor) return;
    autoOpenedEditRef.current = true;
    setHostSettingsOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("edit");
    const qs = next.toString();
    router.replace(qs ? `/lobbies/${lobbyId}?${qs}` : `/lobbies/${lobbyId}`, { scroll: false });
  }, [isAuthor, searchParams, router, lobbyId]);
  // people isn't refetched after a self-service leave, so drop ourselves from
  // the displayed roster optimistically until the next full page load.
  const displayParticipants = hasLeft ? people.filter((p) => p.userId !== myUserId) : people;

  // Before the host has added any real board rows, show an illustrative demo
  // roster — a pure display fallback, never written to `people` until the
  // host actually edits a row (see onPlayersChange below), so a fake demo
  // name can never be silently promoted into a persisted record. Once anyone
  // has isPlayer:true — a real board row, or an approved join (the server
  // sets isPlayer on approve/self-join automatically) — that's what shows.
  const isPreviewBoard = isAuthor && status === "open";
  const demoPreviewPlayers = React.useMemo(() => previewPlayers(), []);
  const realBoardPlayers = React.useMemo(
    () => people.filter((p) => p.isPlayer).map((p) => ({ id: p.id, name: p.name, region: p.region ?? "" })),
    [people],
  );
  const usingDemoFallback = isPreviewBoard && realBoardPlayers.length === 0;
  const boardPlayers = usingDemoFallback ? demoPreviewPlayers : realBoardPlayers;

  const q = nameFilter.trim().toLowerCase();
  const rq = regionFilter.trim().toLowerCase();
  const visiblePlayers = boardPlayers.filter(
    (p) => (!q || p.name.toLowerCase().includes(q)) && (!rq || (p.region || "").toLowerCase().includes(rq))
  );

  const addPlayer = () => {
    const rawId = crypto.randomUUID();
    const newPerson: LobbyPerson = {
      id: "p" + rawId,
      sessionId: rawId,
      name: "NEW PLAYER",
      region: "",
      approvalStatus: "approved",
      isPlayer: true,
    };
    patchPeople([...people, newPerson], { save: true });
  };
  const reset = () => patch({ scores: {} }, { save: true });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const editLink = editToken ? `${origin}/lobbies/${lobbyId}?token=${editToken}` : "";
  const viewLink = `${origin}/lobbies/${lobbyId}`;

  const copyLink = (kind: "edit" | "view") => {
    const link = kind === "edit" ? editLink : viewLink;
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(kind);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
  };

  const confirmDisableSharing = async () => {
    if (!canEdit) return;
    setClosing(true);
    // Ending a lobby freezes it in place — it stays visible (read-only) to
    // anyone with the link. It is never deleted here; deleting only happens
    // from the owner's profile ("Delete lobby"), which is a separate, explicit action.
    await setLobbyStatus("ended");
    setClosing(false);
    setConfirmCloseOpen(false);
  };

  const startLobby = async () => {
    setStarting(true);
    await setLobbyStatus("live");
    setStarting(false);
  };

  // A lobby with a specific riotServer locks every participant to it; a
  // Global lobby (riotServer null) leaves the choice open.
  const lobbyFixedServer = (meta?.riotServer as RiotServer | null | undefined) ?? null;

  // Joining requires being signed in — that's what lets the server identify
  // "already joined" / "blocked after rejection" by real account, not just
  // an anonymous per-browser id. Not signed in yet? Send them to log in and
  // land right back here.
  const openJoin = async () => {
    if (sessionStatus !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/lobbies/${lobbyId}`)}`);
      return;
    }
    setJoinError(null);
    setJoinUsername("");
    setJoinTagline("");
    setJoinServer(lobbyFixedServer ?? "");
    try {
      const profileRes = await fetch("/api/profile/me");
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const riot = profileJson?.profile?.riot;
        if (riot) {
          setJoinUsername(riot.gameName ?? "");
          setJoinTagline(riot.tagLine ?? "");
          // Only take the profile's server when the lobby leaves it open —
          // a locked lobby always uses its own fixed server.
          if (!lobbyFixedServer && riot.server) {
            setJoinServer(riot.server);
          }
        }
      }
    } catch {
      // Prefill is best-effort — an empty form with placeholders still works.
    }
    setJoinOpen(true);
  };

  const submitJoin = async () => {
    const username = joinUsername.trim();
    const tagline = joinTagline.trim();
    if (!username || !tagline || !joinServer) {
      setJoinError("Fill in all fields.");
      return;
    }
    setJoinError(null);
    setJoining(true);
    const result = await joinLobby(lobbyId, sessionId, {
      name: `${username}#${tagline}`,
      gameName: username,
      tagLine: tagline,
      server: joinServer,
      region: regionForServer(joinServer),
    });
    if (result.ok) {
      await refetch();
      setJoined(true);
      setHasLeft(false);
      setJoinOpen(false);
      showToast({ title: "Request sent — waiting on the host to approve you.", type: "positive" });
    } else if (result.error === "login required to join") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/lobbies/${lobbyId}`)}`);
    } else if (result.error?.includes("removed from this lobby")) {
      setJoinError("You can't join this lobby again.");
    } else if (result.error?.includes("already taken")) {
      setJoinError("That name is already taken in this lobby — try a different one.");
    } else {
      setJoinError("Couldn't join — try again.");
    }
    setJoining(false);
  };

  const doLeave = async () => {
    setLeavingInFlight(true);
    setLeaveError(null);
    const ok = await leaveLobby(lobbyId, sessionId);
    if (ok) {
      await refetch();
      setHasLeft(true);
      setJoined(false);
      setLeaveConfirming(false);
      showToast({ title: "You left the lobby.", type: "positive" });
    } else {
      setLeaveError("Couldn't leave — try again.");
    }
    setLeavingInFlight(false);
  };

  const [reviewingUserId, setReviewingUserId] = React.useState<string | null>(null);
  const [copiedEmailFor, setCopiedEmailFor] = React.useState<string | null>(null);

  const copyParticipantEmail = (key: string, email: string) => {
    navigator.clipboard?.writeText(email);
    setCopiedEmailFor(key);
    setTimeout(() => setCopiedEmailFor((k) => (k === key ? null : k)), 1500);
  };

  const reviewParticipant = async (targetUserId: string, action: "approve" | "reject") => {
    setReviewingUserId(targetUserId);
    const ok = await setParticipantApproval(lobbyId, sessionId, editToken, targetUserId, action);
    if (ok) {
      await refetch();
      showToast({
        title: action === "approve" ? "Participant approved." : "Participant rejected.",
        type: action === "approve" ? "positive" : "warning",
      });
    } else {
      showToast({ title: "Couldn't update that request — try again.", type: "danger" });
    }
    setReviewingUserId(null);
  };

  React.useEffect(() => {
    if (!hostSettingsOpen || !meta) return;
    setEditError(null);
    setHostEditStep(1);
    setEditName(meta.name);
    setEditServerChoice((meta.riotServer as RiotServer) || (meta.region === "Global" ? GLOBAL_SERVER : ""));
    setEditLimit(meta.limit ? String(meta.limit) : "");
    setEditScheduledAt(toLocalDatetimeInput(meta.scheduledStartTime));
    setEditDescription(meta.description ?? "");
    setEditPrizeTiers(prizeTiers);
  }, [hostSettingsOpen, meta]);

  const saveHostSettings = async () => {
    setEditSaving(true);
    setEditError(null);
    const limitNumber = Number(editLimit);
    if (!editName.trim() || !editServerChoice || !Number.isFinite(limitNumber) || limitNumber < 2) {
      setEditError("Fill in all required fields.");
      setEditSaving(false);
      return;
    }
    const result = await updateMeta({
      name: editName.trim(),
      region: regionForServerChoice(editServerChoice),
      riotServer: editServerChoice === GLOBAL_SERVER ? null : editServerChoice || null,
      limit: limitNumber,
      scheduledStartTime: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
      description: editDescription.trim(),
    });
    if (result.ok) {
      const trimmedTiers = editPrizeTiers.map((t) => t.trim());
      patch({ prizeTiers: trimmedTiers, showPrize: trimmedTiers.some((t) => t.length > 0) });
      setHostSettingsOpen(false);
    } else {
      setEditError(result.error === "lobby details can only be edited before it starts" ? result.error : "Couldn't save changes — try again.");
    }
    setEditSaving(false);
  };

  // Only toast when the lobby actually transitions to closed during this
  // visit (the host just ended it, or a background refetch picked it up) —
  // not every time someone opens a lobby that was already closed before
  // they got here.
  const closedSeenRef = React.useRef<{ lobbyId: string; seenInitialLoad: boolean }>({ lobbyId: "", seenInitialLoad: false });
  React.useEffect(() => {
    if (!loaded) return;
    if (closedSeenRef.current.lobbyId !== lobbyId) {
      closedSeenRef.current = { lobbyId, seenInitialLoad: true };
      return;
    }
    if (closed) {
      showToast({
        title: "This lobby has ended.",
        message: "The leaderboard is final and will no longer update.",
        type: "warning",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed, loaded, lobbyId]);

  const readOnly = !canEdit;
  const isOpenPhase = status === "open";
  // Everyone lands on the lobby info (description, prizes, participants) by
  // default and opts into the board explicitly: the host to set it up (add
  // players/rounds, cutoff line) any time, a non-host viewer only once the
  // lobby is live or ended (there's nothing to see on the board before that).
  const [showScoreboard, setShowScoreboard] = React.useState(() => searchParams.get("view") === "board");
  const showingBoard = showScoreboard;

  // No live sync — someone else's score edit only shows up here on a
  // re-fetch. The lobby-info screen (participants, host review) is always
  // manual-refresh-only. The board auto-refreshes for everyone while it's
  // open, but only the host sees the countdown/button — a read-only viewer
  // gets the same silent background polling with no visible control.
  const REFRESH_INTERVAL_S = 60;
  const [refreshCountdown, setRefreshCountdown] = React.useState(REFRESH_INTERVAL_S);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const refetchRef = React.useRef(refetch);
  const autoRefreshActiveRef = React.useRef(showingBoard);
  React.useEffect(() => {
    refetchRef.current = refetch;
    autoRefreshActiveRef.current = showingBoard;
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!autoRefreshActiveRef.current || dirtyRef.current) return;
      setRefreshCountdown((s) => {
        if (s <= 1) {
          refetchRef.current();
          return REFRESH_INTERVAL_S;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Entering the board (not the very first load — that already fetched fresh
  // data) gets one immediate refetch plus a full-length countdown, rather
  // than picking up mid-countdown from a previous visit.
  const enteredBoardRef = React.useRef(showingBoard);
  React.useEffect(() => {
    if (showingBoard && !enteredBoardRef.current) {
      refetchRef.current();
      setRefreshCountdown(REFRESH_INTERVAL_S);
    }
    enteredBoardRef.current = showingBoard;
  }, [showingBoard]);

  const manualRefresh = async () => {
    setManualRefreshing(true);
    await refetch();
    setRefreshCountdown(REFRESH_INTERVAL_S);
    setManualRefreshing(false);
  };

  // Reflect the board view in the URL so a refresh doesn't bounce the host
  // back to the lobby-info screen mid-preview/setup.
  const setBoardView = (on: boolean) => {
    setShowScoreboard(on);
    const next = new URLSearchParams(searchParams.toString());
    if (on) next.set("view", "board");
    else next.delete("view");
    const qs = next.toString();
    router.replace(qs ? `/lobbies/${lobbyId}?${qs}` : `/lobbies/${lobbyId}`, { scroll: false });
  };

  const confirmCloseModal = (
    <Dialog
      open={confirmCloseOpen}
      title={status === "live" ? "End this lobby?" : "Stop sharing this lobby?"}
      onClose={closing ? undefined : () => setConfirmCloseOpen(false)}
      actions={
        <>
          <Button variant="subtle" onClick={() => setConfirmCloseOpen(false)} disabled={closing} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmDisableSharing} disabled={closing} className="flex-1 justify-center">
            {closing ? "Ending…" : status === "live" ? "End lobby" : "Stop sharing"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="m-0 font-mono text-xs leading-relaxed text-white/50">
          Once ended, this lobby can&apos;t be reopened or edited again — the leaderboard freezes as-is for anyone with the link. It stays visible until you delete it from your profile.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={viewLink}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-[7px] border border-white/15 bg-ink-700 px-3 py-2 text-center font-mono text-[13px] font-bold tracking-[0.1em] text-white outline-none"
          />
          <Button variant="subtle" size="sm" iconLeft={copied === "view" ? <Check size={13} /> : undefined} onClick={() => copyLink("view")}>
            {copied === "view" ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
    </Dialog>
  );

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const setPrizeAt = (index: number, value: string) => {
    setEditPrizeTiers((tiers) => tiers.map((t, i) => (i === index ? value : t)));
  };
  const editLimitNumber = Number(editLimit);
  const addPrizeTier = () =>
    setEditPrizeTiers((tiers) => (Number.isFinite(editLimitNumber) && tiers.length >= editLimitNumber ? tiers : [...tiers, ""]));
  const removePrizeTier = (index: number) => setEditPrizeTiers((tiers) => tiers.filter((_, i) => i !== index));

  const hostEditStep1Valid = Boolean(editName.trim()) && Boolean(editServerChoice) && Number.isFinite(Number(editLimit)) && Number(editLimit) >= 2;

  const hostSettingsModal = (
    <Dialog
      open={hostSettingsOpen}
      title="Host settings"
      onClose={editSaving ? undefined : () => setHostSettingsOpen(false)}
      actions={
        isOpenPhase ? (
          <>
            {hostEditStep === 1 ? (
              <Button type="button" variant="subtle" size="md" onClick={() => setHostSettingsOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="subtle" size="md" onClick={() => setHostEditStep(1)} disabled={editSaving}>
                Back
              </Button>
            )}
            <Button
              type="submit"
              form="host-settings-form"
              variant="primary"
              size="md"
              disabled={editSaving || (hostEditStep === 1 && !hostEditStep1Valid)}
            >
              {hostEditStep === 1 ? "Next" : editSaving ? "Saving…" : "Save changes"}
            </Button>
          </>
        ) : undefined
      }
    >
      {isOpenPhase ? (
        <>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">
            Step {hostEditStep} of 2 — {hostEditStep === 1 ? "the essentials" : "optional details"}
          </div>
          <form
            id="host-settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (hostEditStep === 1) {
                if (hostEditStep1Valid) setHostEditStep(2);
              } else {
                saveHostSettings();
              }
            }}
            className="flex flex-col gap-4"
          >
            {hostEditStep === 1 ? (
              <>
                <LobbyEssentialsFields
                  name={editName}
                  onNameChange={setEditName}
                  limit={editLimit}
                  onLimitChange={setEditLimit}
                  server={editServerChoice}
                  onServerChange={setEditServerChoice}
                  game={meta?.game ?? "TFT"}
                />
                <FormField label="Event date & time" hint="Shown in your local time." className="min-w-0">
                  <DateTimePicker value={editScheduledAt} onChange={setEditScheduledAt} />
                </FormField>
              </>
            ) : (
              <>
                <FormField label="Description" hint="Optional — what's this lobby about?">
                  <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={2000} rows={4} />
                </FormField>
                <FormField
                  label="Prizes"
                  hint={`Optional — set a prize for each finishing place (up to ${Number.isFinite(editLimitNumber) && editLimitNumber > 0 ? editLimitNumber : "capacity"}).`}
                >
                  <div className="flex flex-col gap-2">
                    {editPrizeTiers.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 font-mono text-xs text-white/50">{ordinal(i + 1)}</span>
                        <Input value={tier} onChange={(e) => setPrizeAt(i, e.target.value)} placeholder="e.g. $100 gift card" maxLength={40} className="flex-1" />
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
                      disabled={Number.isFinite(editLimitNumber) && editPrizeTiers.length >= editLimitNumber}
                      className="self-start"
                    >
                      Add a place
                    </Button>
                  </div>
                </FormField>
              </>
            )}
            {editError ? <p className="text-sm text-red-400">{editError}</p> : null}
          </form>
        </>
      ) : (
        <p className="m-0 flex items-center gap-2 text-sm text-white/62">
          <Lock size={14} className="shrink-0 text-gold-500" />
          Lobby details lock once the lobby starts — this one&apos;s {status === "live" ? "live" : "ended"} now.
        </p>
      )}
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-ink-1000 font-body text-white">
      <style>{`
        .lobby-desc h1{font-family:var(--font-display);font-size:22px;font-weight:800;margin:0 0 8px}
        .lobby-desc h2{font-family:var(--font-display);font-size:18px;font-weight:800;margin:0 0 8px}
        .lobby-desc h3{font-family:var(--font-display);font-size:15px;font-weight:700;margin:0 0 8px}
        .lobby-desc p{margin:0 0 10px}
        .lobby-desc ul{margin:0 0 10px 18px;padding:0}
      `}</style>
      {showLoadingScreen ? (
        <LoadingScreen variant={meta?.game === "TFT" ? "TFT" : "Match loading"} title="LOADING LOBBY" showPercent={false} />
      ) : !showingBoard ? (
        <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-9">
          <button
            type="button"
            onClick={() => router.push("/lobbies")}
            className="mb-4 inline-flex items-center gap-1.5 border-none bg-transparent p-0 font-mono text-xs text-white/62 hover:text-white/80"
          >
            <ChevronLeft size={14} /> Back to lobbies
          </button>

          <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-gold-500 font-display text-[15px] font-black text-ink-1000"
                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
              >
                {meta?.game === "TFT" ? "TFT" : "LoL"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-nowrap items-center gap-2.5">
                  <Tooltip label={meta?.name || "Lobby"} className="min-w-0">
                    <span className="block truncate font-display text-[20px] font-black uppercase leading-none tracking-[-0.02em] sm:text-[24px]">
                      {meta?.name || "Lobby"}
                    </span>
                  </Tooltip>
                  <Tag scheme={STATUS_SCHEME[status]} size="sm" className="shrink-0">{STATUS_LABEL[status]}</Tag>
                </div>
                <div className="mt-1.5 flex items-center gap-2 font-mono text-[12.5px] text-white/62">
                  <Avatar src={meta?.authorPhotoURL} name={isAuthor ? "You" : meta?.authorName} size="xs" />
                  Hosted by {isAuthor ? "You" : meta?.authorName || "—"} · {meta?.game || "League of Legends"}
                </div>
              </div>
            </div>
            {isAuthor ? (
              <div className="flex gap-2 sm:shrink-0">
                <Button variant="subtle" size="sm" className="flex-1 justify-center sm:flex-none" iconLeft={<BarChart2 size={15} />} onClick={() => setBoardView(true)}>
                  Leaderboard
                </Button>
                <Button variant="subtle" size="sm" className="flex-1 justify-center sm:flex-none" iconLeft={<Settings size={15} />} onClick={() => setHostSettingsOpen(true)}>
                  Host settings
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-5 min-w-0">
              <Card tone="arena" className="p-6">
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/62">{"// Description"}</span>
                <Divider className="my-3.5" />
                {meta?.description ? (
                  <div className="lobby-desc text-sm leading-relaxed text-white/72" dangerouslySetInnerHTML={{ __html: meta.description }} />
                ) : (
                  <p className="m-0 text-sm leading-relaxed text-white/62">
                    {isOpenPhase
                      ? `The leaderboard unlocks once ${meta?.authorName || "the host"} starts the lobby. Join now to be on the list.`
                      : status === "live"
                        ? "The lobby is live — check the leaderboard for current standings."
                        : "This lobby has ended — check the leaderboard for final standings."}
                  </p>
                )}
              </Card>

              <Card tone="arena" className="p-6">
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/62">{"// Prizes"}</span>
                <Divider className="my-3.5" />
                {prizeTiers.some((t) => t.trim()) ? (
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {prizeTiers.map((prize, i) => prize.trim() ? (
                      <li key={i} className="flex items-center gap-2.5 text-[14.5px] text-white">
                        <Award size={16} className="shrink-0 text-gold-500" />
                        <span className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-gold-500">{ordinal(i + 1)}</span>
                        {prize}
                      </li>
                    ) : null)}
                  </ul>
                ) : (
                  <p className="m-0 flex items-center gap-2 text-sm text-white/62">
                    <Award size={16} className="text-gold-500" /> No prizes for this lobby.
                  </p>
                )}
              </Card>

              <Card tone="arena" className="p-6">
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/62">
                  {`// Participants (${displayParticipants.length}${meta?.limit ? `/${meta.limit}` : ""})`}
                </span>
                <Divider className="my-3.5" />
                {displayParticipants.length ? (
                  <div className="flex flex-col gap-2.5">
                    {displayParticipants.map((p) => {
                      const isHostRow = Boolean(p.userId) && p.userId === meta?.ownerUserId;
                      const isPending = !isHostRow && p.approvalStatus !== "approved";
                      // Only a real join-requester has an email on file (host-added board
                      // rows never collect one) — so this naturally excludes the host's
                      // own row and any player the host added directly.
                      const canContactByEmail = isAuthor && !isHostRow && Boolean(p.email);
                      const emailKey = p.userId || p.sessionId;
                      return (
                        <div key={p.userId || p.sessionId} className="flex items-center gap-2.5">
                          <Avatar src={p.photoURL} name={p.name} size="xs" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white">{p.name}</span>
                            {canContactByEmail ? (
                              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                <Mail size={11} className="shrink-0 text-white/40" />
                                <span className="min-w-0 truncate font-mono text-[11px] text-white/50">{p.email}</span>
                                <button
                                  type="button"
                                  aria-label={`Copy ${p.name}'s email`}
                                  onClick={() => copyParticipantEmail(emailKey, p.email as string)}
                                  className="inline-flex shrink-0 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                                >
                                  {copiedEmailFor === emailKey ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                                </button>
                              </div>
                            ) : null}
                          </div>
                          {isHostRow ? (
                            <span className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-gold-500">HOST</span>
                          ) : isPending ? (
                            <span className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-white/50">PENDING</span>
                          ) : (
                            <span className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-green-400">APPROVED</span>
                          )}
                          {isAuthor && isPending && p.userId ? (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                aria-label={`Approve ${p.name}`}
                                onClick={() => reviewParticipant(p.userId as string, "approve")}
                                disabled={reviewingUserId === p.userId}
                                className="inline-flex rounded-full p-1 text-green-400 hover:bg-white/10 disabled:opacity-40"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Reject ${p.name}`}
                                onClick={() => reviewParticipant(p.userId as string, "reject")}
                                disabled={reviewingUserId === p.userId}
                                className="inline-flex rounded-full p-1 text-red-400 hover:bg-white/10 disabled:opacity-40"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="m-0 text-sm text-white/62">No one has joined yet — be the first.</p>
                )}
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card tone="arena" className="p-5">
                {!isAuthor && !isOpenPhase ? (
                  <Button
                    variant={status === "live" ? "primary" : "subtle"}
                    size="lg"
                    full
                    iconLeft={status === "live" ? <Eye size={18} /> : <BarChart2 size={18} />}
                    onClick={() => setBoardView(true)}
                  >
                    {status === "live" ? "Watch live" : "View final results"}
                  </Button>
                ) : !(joined || alreadyParticipant) || hasLeft ? (
                  joinOpen ? (
                    <div className="flex flex-col gap-3">
                      <FormField label="Riot ID" required>
                        <Input
                          value={joinUsername}
                          onChange={(e) => setJoinUsername(e.target.value)}
                          placeholder="e.g. Faker"
                          maxLength={40}
                        />
                      </FormField>
                      <FormField label="Tagline" required hint="After the # in your Riot ID.">
                        <Input value={joinTagline} onChange={(e) => setJoinTagline(e.target.value)} placeholder="e.g. NA1" maxLength={10} />
                      </FormField>
                      <FormField label="Server" required>
                        {lobbyFixedServer ? (
                          <Tooltip label={`This lobby is locked to ${lobbyFixedServer} by the host.`} className="w-full">
                            <div className="flex h-[42px] w-full cursor-not-allowed items-center gap-2 rounded-lg border border-white/15 bg-ink-900 px-3.5 text-[15px] text-white/70">
                              {lobbyFixedServer}
                              <Lock size={13} className="ml-auto text-white/40" />
                            </div>
                          </Tooltip>
                        ) : (
                          <SearchableSelect
                            value={joinServer}
                            onChange={(v) => setJoinServer(v as RiotServer)}
                            options={SORTED_RIOT_SERVERS}
                            placeholder="Select your server"
                          />
                        )}
                      </FormField>
                      {joinServer ? (
                        <p className="m-0 font-mono text-[11px] text-white/50">Region: {regionForServer(joinServer)}</p>
                      ) : null}
                      {joinError ? <p className="m-0 text-center text-xs text-red-500">{joinError}</p> : null}
                      <div className="flex gap-2">
                        <Button variant="subtle" size="sm" className="flex-1 justify-center" onClick={() => setJoinOpen(false)} disabled={joining}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={submitJoin} disabled={joining}>
                          {joining ? "Joining…" : "Join lobby"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {joinError ? <p className="m-0 text-center text-xs text-red-500">{joinError}</p> : null}
                      <Button variant="primary" size="lg" full iconLeft={<Zap size={18} />} onClick={openJoin} disabled={joining || !isOpenPhase}>
                        Participate
                      </Button>
                    </div>
                  )
                ) : !isOpenPhase ? (
                  <Button
                    variant="subtle"
                    size="lg"
                    full
                    iconLeft={<BarChart2 size={18} />}
                    onClick={() => setBoardView(true)}
                  >
                    {status === "ended" ? "View final results" : "Open leaderboard"}
                  </Button>
                ) : leaveConfirming ? (
                  <div className="flex flex-col gap-2.5">
                    {leaveError ? <p className="m-0 text-center text-xs text-red-500">{leaveError}</p> : null}
                    <p className="m-0 text-center text-xs text-white/62">Give up your spot? Someone else may take it.</p>
                    <div className="flex gap-2">
                      <Button variant="subtle" size="sm" className="flex-1 justify-center" onClick={() => setLeaveConfirming(false)} disabled={leavingInFlight}>
                        Cancel
                      </Button>
                      <Button variant="danger" size="sm" className="flex-1 justify-center" onClick={doLeave} disabled={leavingInFlight}>
                        {leavingInFlight ? "Leaving…" : "Leave lobby"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="subtle" size="lg" full iconLeft={<LogOut size={18} />} onClick={() => setLeaveConfirming(true)}>
                    You&apos;re on the list — Leave
                  </Button>
                )}
              </Card>
              {isAuthor && isOpenPhase ? (
                <Button variant="subtle" size="lg" full iconLeft={<Play size={18} />} onClick={startLobby} disabled={starting}>
                  {starting ? "Starting…" : "Start lobby"}
                </Button>
              ) : null}
              <Card tone="arena" className="flex flex-col gap-4 p-5">
                <MetaItem icon={<Globe size={16} />} label="Region" value={meta?.region || "—"} />
                <MetaItem icon={<Server size={16} />} label="Riot server" value={meta?.riotServer || (meta?.region === "Global" ? "Global" : "—")} />
                <MetaItem icon={<Calendar size={16} />} label="Event time" value={fmtDate(meta?.scheduledStartTime ?? null)} />
                <MetaItem
                  icon={<Users size={16} />}
                  label="Capacity"
                  value={`${displayParticipants.length}${meta?.limit ? ` / ${meta.limit}` : ""}`}
                />
              </Card>
            </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
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
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBoardView(false)}
                    className="inline-flex items-center gap-1.5 border-none bg-transparent p-0 font-mono text-xs text-white/62 hover:text-white/80"
                  >
                    <ChevronLeft size={14} /> Back to lobby info
                  </button>
                </div>
                <div className="mb-2 font-mono text-[11px] font-bold tracking-[0.18em] text-gold-500">
                  {"// 4HOPE TOURNAMENT TOOLS"}
                </div>
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center bg-gold-500 font-display text-[15px] font-black text-ink-1000"
                    style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                  >
                    {meta?.game === "TFT" ? "TFT" : "LoL"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-nowrap items-center gap-2.5">
                      <Tooltip label={meta?.name || "Leaderboard"} className="min-w-0">
                        <span className="block truncate font-display text-[24px] font-black uppercase leading-none tracking-[-0.02em] sm:text-[32px]">
                          {meta?.name || "Leaderboard"}
                        </span>
                      </Tooltip>
                      <Tag scheme={STATUS_SCHEME[status]} size="sm" className="shrink-0">{STATUS_LABEL[status]}</Tag>
                    </div>
                    {meta?.region ? (
                      <div className="mt-1.5 font-mono text-[11px] text-white/50">{meta.region}</div>
                    ) : null}
                    {status === "open" && meta?.scheduledStartTime ? (
                      <div className="mt-1.5 font-mono text-[11px] text-gold-500">
                        Starts {new Date(meta.scheduledStartTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                    ) : null}
                    {isPreviewBoard ? (
                      <div className="mt-1.5 font-mono text-[11px] text-gold-500">
                        Preview — round scores here won&apos;t be saved; your setup (players, rounds, cutoff, prizes) will.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Bar 1: lobby + actions */}
            {!(readOnly && !isAuthor) && (
            <div className="flex flex-col gap-2.5 border-b border-white/8 bg-ink-900 px-4 py-3 sm:px-9">
              {!isPreviewBoard && !readOnly && status !== "live" && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                  <Button variant="subtle" size="sm" iconLeft={<WifiOff size={13} />} onClick={() => setConfirmCloseOpen(true)}>
                    Stop sharing
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                  {!readOnly && (
                    <>
                      <Button variant="subtle" size="sm" iconLeft={<UserPlus size={13} />} onClick={addPlayer}>Add player</Button>
                      <Button variant="subtle" size="sm" iconLeft={<Plus size={13} />} onClick={() => patch({ roundCount: Math.max(1, roundCount + 1) }, { save: true })}>Add round</Button>
                      <Button variant="subtle" size="sm" iconLeft={<RotateCcw size={13} />} onClick={reset}>Reset scores</Button>
                      <Button variant="subtle" size="sm" iconLeft={copied === "view" ? <Check size={13} /> : <Eye size={13} />} onClick={() => copyLink("view")}>
                        {copied === "view" ? "Copied!" : "Copy Viewer link"}
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {!readOnly && (
                    <Button
                      variant="subtle"
                      size="sm"
                      iconLeft={<RotateCcw size={13} className={manualRefreshing ? "animate-spin" : undefined} />}
                      onClick={manualRefresh}
                      disabled={manualRefreshing}
                    >
                      {manualRefreshing ? "Refreshing…" : `Refresh · auto in ${refreshCountdown}s`}
                    </Button>
                  )}
                  {!readOnly && status === "open" && (
                    <Button variant="primary" size="sm" iconLeft={<Play size={13} />} onClick={startLobby} disabled={starting}>
                      {starting ? "Starting…" : "Start lobby"}
                    </Button>
                  )}
                  {!readOnly && status === "live" && (
                    <Button variant="primary" size="sm" iconLeft={<Flag size={13} />} onClick={() => setConfirmCloseOpen(true)}>
                      End lobby
                    </Button>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Bar 2: settings */}
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-white/8 bg-ink-950 px-4 py-3.5 sm:px-9">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cutoffOn}
                    onChange={(e) =>
                      patch(
                        {
                          cutoffOn: e.target.checked,
                          cutoffLabel: e.target.checked && !cutoffLabel.trim() ? "QUALIFY TO NEXT STAGE" : cutoffLabel,
                        },
                        { save: true },
                      )
                    }
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">Cutoff line</span>
                </label>
                {cutoffOn && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">after rank</span>
                      <input type="number" min="1" value={cutoffRank}
                        onChange={(e) => patch({ cutoffRank: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        onBlur={commitField}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        className="w-[52px] rounded-[7px] border border-white/14 bg-ink-700 px-2 py-1.5 text-center font-mono text-[11.5px] font-bold text-white outline-none" />
                    </div>
                    <div className="flex flex-1 items-center gap-2 sm:max-w-[260px] sm:flex-none">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">label</span>
                      <input value={cutoffLabel} onChange={(e) => patch({ cutoffLabel: e.target.value })}
                        onBlur={commitField}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        placeholder="QUALIFY TO NEXT STAGE"
                        className="min-w-0 flex-1 rounded-[7px] border border-white/14 bg-ink-700 px-2 py-1.5 font-mono text-[11.5px] font-bold text-white outline-none" />
                    </div>
                  </>
                )}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={showPrize} onChange={(e) => patch({ showPrize: e.target.checked }, { save: true })} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/42">Prize column</span>
                </label>
              </div>
            )}

            <div className="px-4 py-5 pb-10 sm:px-9">
              <Leaderboard
                players={visiblePlayers}
                onPlayersChange={(edited) => {
                  // Any edit promotes the visible rows (real, or the illustrative
                  // demo fallback) into real `people` entries — this is what turns
                  // a demo-preview row into a saved one the first time it's touched.
                  const visibleIds = new Set(visiblePlayers.map((p) => p.id));
                  const editedById = new Map(edited.map((p) => [p.id, p]));
                  const next: LobbyPerson[] = [];
                  for (const person of people) {
                    if (!visibleIds.has(person.id)) {
                      next.push(person);
                      continue;
                    }
                    const row = editedById.get(person.id);
                    editedById.delete(person.id);
                    if (!row) {
                      // Removed from the board — people[] is the one list, so
                      // this drops them entirely (same as a host reject).
                      continue;
                    }
                    const changed = row.name !== person.name || (row.region ?? "") !== (person.region ?? "") || !person.isPlayer;
                    next.push(changed ? { ...person, name: row.name, region: row.region, isPlayer: true } : person);
                  }
                  // Anything left over came from the demo fallback — brand-new rows.
                  for (const row of editedById.values()) {
                    next.push({ id: row.id, sessionId: row.id, name: row.name, region: row.region, approvalStatus: "approved", isPlayer: true });
                  }
                  patchPeople(next);
                }}
                roundCount={roundCount} onRoundCountChange={(n) => patch({ roundCount: n }, { save: true })}
                scores={scores} onScoresChange={(s) => patch({ scores: s })}
                pointsScale={POINTS_SCALE} entryMode={ENTRY_MODE}
                rankMode={rankMode} order={order} onOrderChange={(o) => patch({ order: o }, { save: true })}
                showPrize={showPrize} prizeTiers={prizeTiers} onPrizeTiersChange={(t) => patch({ prizeTiers: t })}
                nameFilter={nameFilter} onNameFilterChange={setNameFilter}
                regionFilter={regionFilter} onRegionFilterChange={setRegionFilter}
                cutoffRank={cutoffOn ? cutoffRank : null} cutoffLabel={cutoffLabel}
                readOnly={readOnly || status === "ended" || usingDemoFallback}
                regionOptions={REGION_SUGGESTIONS}
                onFieldBlur={commitField}
                onRemovePlayer={
                  readOnly
                    ? undefined
                    : (pid) => {
                        // people[] is the one list for board + roster — removing
                        // a row drops that person entirely, same as a host reject.
                        // A discrete click, not a series of keystrokes, so save it
                        // right away rather than waiting for a field to blur (see
                        // onRemovePlayer's doc comment in Leaderboard.tsx).
                        const next = people.filter((p) => p.id !== pid);
                        patchPeople(next, { save: true });
                      }
                }
              />
            </div>
          </div>
        )}
      {confirmCloseModal}
      {hostSettingsModal}
    </div>
  );
}
