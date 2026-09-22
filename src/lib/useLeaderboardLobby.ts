"use client";

import { useEffect, useRef, useState } from "react";

export type LobbyStatus = "open" | "live" | "ended";

/**
 * One record per person in the lobby — the roster entry and the scoreboard
 * row used to be two separate arrays (`participants[]` + `players[]`)
 * linked only by a derived id. `isPlayer` now marks board membership
 * directly on the one record, so there's nothing left to fall out of sync.
 */
export interface LobbyPerson {
  id: string;
  /**
   * The anonymous per-browser write-credential for this row — the server
   * never echoes it back in a GET response (see sanitizePeopleForResponse),
   * so it's only ever populated locally on a row this client just created.
   */
  sessionId?: string;
  /** NextAuth session.user.id of the participant — joining requires login, so this is always set on new records. */
  userId?: string;
  name: string;
  photoURL?: string | null;
  gameName?: string;
  tagLine?: string;
  server?: string;
  region?: string;
  /** Contact email, taken from the signed-in account at join time — lets the host reach a participant about their request. */
  email?: string;
  /** The host is always "approved" implicitly; everyone else starts "pending" until the host reviews them. */
  approvalStatus?: "pending" | "approved";
  /** Whether this person currently has a row on the scoreboard. */
  isPlayer: boolean;
}

export interface LeaderboardLobbyState {
  roundCount: number;
  scores: Record<string, Record<number, number | null>>;
  order: string[];
  prizeTiers: string[];
  rankMode: "auto" | "manual";
  showPrize: boolean;
  cutoffOn: boolean;
  cutoffRank: number;
  cutoffLabel: string;
}

export interface LobbyMeta {
  name: string;
  region: string;
  authorName: string;
  authorPhotoURL: string | null;
  /** ISO 8601 datetime with UTC offset, e.g. "2026-09-01T18:00:00-07:00". Null when not scheduled. */
  scheduledStartTime: string | null;
  /** NextAuth session.user.id of the creator — used server-side for the per-host active-lobby cap. */
  ownerUserId: string;
  game?: "League of Legends" | "TFT";
  riotServer?: string | null;
  limit?: number;
  description?: string;
  prizes?: string[];
  /** Whether the host is seeded as a participant on creation. Defaults to false — the host joins like anyone else, if they want to. */
  authorParticipates?: boolean;
}

const SESSION_ID_KEY = "4h-leaderboard-session-id";

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type LobbyData =
  | (Partial<LeaderboardLobbyState> & {
      status?: LobbyStatus;
      closed?: boolean;
      name?: string;
      region?: string;
      authorName?: string;
      authorPhotoURL?: string | null;
      authorSessionId?: string;
      ownerUserId?: string;
      people?: LobbyPerson[];
      scheduledStartTime?: string | null;
      game?: LobbyMeta["game"];
      riotServer?: string | null;
      limit?: number;
      description?: string;
      prizes?: string[];
    })
  | null;

const STATE_KEYS = [
  "roundCount", "scores", "order", "prizeTiers",
  "rankMode", "showPrize", "cutoffOn", "cutoffRank", "cutoffLabel",
] as const satisfies readonly (keyof LeaderboardLobbyState)[];

/**
 * `data` is the raw lobby document — meta, state, and system fields all
 * flattened together on the wire. Pulling only the real state keys out of it
 * keeps `state` from picking up stale copies of meta fields (name,
 * description, ...): those would otherwise get re-broadcast — and overwrite
 * fresher meta edits — on the next debounced state autosave.
 */
function pickState(base: LeaderboardLobbyState, data: LobbyData): LeaderboardLobbyState {
  const next = { ...base };
  if (data) {
    for (const key of STATE_KEYS) {
      const value = data[key];
      if (value !== undefined) (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

async function fetchLobby(lobbyId: string, editToken: string | null): Promise<{ data: LobbyData; isEditor: boolean }> {
  const url = editToken ? `/api/lobby/${lobbyId}?token=${encodeURIComponent(editToken)}` : `/api/lobby/${lobbyId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { data: null, isEditor: false };
  const json: { data: LobbyData; isEditor?: boolean } = await res.json();
  return { data: json.data ?? null, isEditor: Boolean(json.isEditor) };
}

/**
 * Every lobby lives in Firebase, addressed by its GUID in the URL path.
 * Joining with just the lobby id is always read-only — write access requires
 * a valid editToken (GUID), supplied only to whoever opened the lobby, via
 * ?token=. A lobby's `status` gates what non-authors can see: "open" hides
 * the score table (participants list only), "live" and "ended" reveal it.
 * A lobby the server reports as `closed` (status "ended") stops polling and
 * can no longer be written to.
 */
export function useLeaderboardLobby(
  lobbyId: string | null,
  editToken: string | null,
  defaultState: LeaderboardLobbyState,
) {
  const [state, setState] = useState<LeaderboardLobbyState>(defaultState);
  const [people, setPeople] = useState<LobbyPerson[]>([]);
  const [meta, setMeta] = useState<{
    name: string;
    region: string;
    authorName: string;
    authorPhotoURL: string | null;
    authorSessionId: string;
    ownerUserId: string;
    scheduledStartTime: string | null;
    game?: LobbyMeta["game"];
    riotServer?: string | null;
    limit?: number;
    description?: string;
    prizes?: string[];
  } | null>(null);
  const [status, setStatus] = useState<LobbyStatus>("open");
  const [loaded, setLoaded] = useState(false);
  const [closed, setClosed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const closedRef = useRef(false);
  // Counts writes that have been fired but not yet confirmed by the server —
  // flushWrite is fire-and-forget, so a caller clearing its own "dirty" flag
  // the instant it calls flushWrite doesn't mean the edit has landed yet. A
  // refetch racing that window would overwrite the still-in-flight edit with
  // stale server data, so refetch callers check hasPendingWrite() too.
  const pendingWritesRef = useRef(0);

  const markClosed = () => {
    closedRef.current = true;
    setClosed(true);
    setCanEdit(false);
  };

  const applyData = (data: LobbyData) => {
    setState((s) => pickState(s, data));
    // The server never echoes a row's sessionId back over GET (see
    // sanitizePeopleForResponse) — it's a write-credential only the browser
    // that created the row should hold on to. Restore it here from whatever
    // this client already had locally for that row, or a later board write
    // (add player / add round / flush) would submit that row with neither a
    // sessionId nor (for a host-added, non-participant row) a userId, which
    // the server rejects outright.
    setPeople((prevPeople) => {
      const incoming = data?.people ?? [];
      const priorById = new Map(prevPeople.map((p) => [p.id, p]));
      return incoming.map((p) => {
        const prior = priorById.get(p.id);
        return prior?.sessionId && !p.sessionId ? { ...p, sessionId: prior.sessionId } : p;
      });
    });
    setMeta({
      name: data?.name ?? "",
      region: data?.region ?? "",
      authorName: data?.authorName ?? "",
      authorPhotoURL: data?.authorPhotoURL ?? null,
      authorSessionId: data?.authorSessionId ?? "",
      ownerUserId: data?.ownerUserId ?? "",
      scheduledStartTime: data?.scheduledStartTime ?? null,
      game: data?.game,
      riotServer: data?.riotServer,
      limit: data?.limit,
      description: data?.description,
      prizes: data?.prizes,
    });
    if (data?.status) setStatus(data.status);
  };

  useEffect(() => {
    if (!lobbyId) return;
    let cancelled = false;
    let scheduleTimer: ReturnType<typeof setTimeout> | null = null;
    closedRef.current = false;
    setLoaded(false);
    setClosed(false);
    setCanEdit(false);

    const load = async () => {
      const { data, isEditor } = await fetchLobby(lobbyId, editToken);
      if (cancelled || closedRef.current) return;
      // Even a closed lobby's final data should render — freeze on it rather
      // than discarding it, so viewers can still see the last standings.
      setState(pickState(defaultState, data));
      applyData(data);
      setCanEdit(isEditor && data != null && !data?.closed);
      if (data?.closed) {
        closedRef.current = true;
        setClosed(true);
      }
      setLoaded(true);

      // There's no background job flipping a scheduled lobby's status —
      // the server only self-heals "open" -> "live" on read (see the GET
      // handler). Without polling, a tab left open past the scheduled time
      // would otherwise show a stale "open" lobby forever, so schedule one
      // re-fetch for exactly when the countdown ends to pick up the flip.
      if (data?.status === "open" && typeof data.scheduledStartTime === "string") {
        const delay = new Date(data.scheduledStartTime).getTime() - Date.now();
        if (Number.isFinite(delay)) {
          // setTimeout overflows (fires immediately) past ~24.8 days — clamp
          // and let a distant scheduled time re-check itself periodically.
          const MAX_DELAY_MS = 12 * 60 * 60 * 1000;
          scheduleTimer = setTimeout(load, Math.min(Math.max(delay, 0) + 1000, MAX_DELAY_MS));
        }
      }
    };
    load();

    // Aside from the scheduled-start re-fetch above, polling stays disabled —
    // other changes (participants joining, host edits) still need a manual reload.
    return () => {
      cancelled = true;
      if (scheduleTimer) clearTimeout(scheduleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, editToken]);

  /**
   * No debounce, no autosave-on-change — a board edit only reaches the server
   * when this is called (wired to a field's blur / Enter-then-blur). `overrideState`/
   * `overridePeople` let a caller that just computed a new value synchronously
   * (e.g. a button handler) save it immediately, without waiting for the next
   * render to see it via the `state`/`people` closures. Both slices are always
   * sent together — same last-write-wins semantics the single `state` write
   * always had.
   */
  const flushWrite = (overrideState?: LeaderboardLobbyState, overridePeople?: LobbyPerson[]): Promise<boolean> => {
    // Not a failure — there's nothing to save (not yet loaded, read-only viewer,
    // or the lobby closed) — resolve truthy so a caller tracking confirmation
    // doesn't get stuck waiting on a write that was never going to happen.
    if (!lobbyId || !loaded || !canEdit || closed || closedRef.current) return Promise.resolve(true);
    const s = overrideState ?? state;
    const p = overridePeople ?? people;
    // Before the lobby starts, the board is just a preview — round scores
    // entered while testing the setup shouldn't persist, only the actual
    // configuration (roster, rounds, cutoff, prizes) should.
    const { scores: _scores, ...rest } = s;
    void _scores;
    const outgoingState = status === "open" ? rest : s;
    const body = JSON.stringify({ state: outgoingState, people: p, sessionId: getSessionId(), editToken });
    pendingWritesRef.current += 1;
    return fetch(`/api/lobby/${lobbyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      });
  };

  const hasPendingWrite = () => pendingWritesRef.current > 0;

  /** Re-fetches the lobby doc and applies it — used after a join/leave, which the server
   *  sees but this client otherwise has no way to learn about without polling. */
  const refetch = async () => {
    if (!lobbyId) return;
    // Skip while a write we just fired hasn't been confirmed yet — a GET
    // racing ahead of it would apply stale data and clobber the pending edit.
    if (hasPendingWrite()) return;
    const { data, isEditor } = await fetchLobby(lobbyId, editToken);
    if (!data) return;
    applyData(data);
    setCanEdit(isEditor && !data.closed);
  };

  const setLobbyStatus = async (next: LobbyStatus) => {
    if (!lobbyId || !canEdit) return false;
    const res = await fetch(`/api/lobby/${lobbyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, sessionId: getSessionId(), editToken }),
    });
    if (res.ok) {
      setStatus(next);
      if (next === "ended") markClosed();
    }
    return res.ok;
  };

  const updateMeta = async (
    patch: Partial<Pick<LobbyMeta, "name" | "region" | "riotServer" | "limit" | "scheduledStartTime" | "description">>,
  ): Promise<{ ok: true } | { ok: false; error: string | null }> => {
    if (!lobbyId || !canEdit) return { ok: false, error: "not allowed" };
    const res = await fetch(`/api/lobby/${lobbyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta: patch, sessionId: getSessionId(), editToken }),
    });
    if (res.ok) {
      setMeta((m) => (m ? { ...m, ...patch } : m));
      return { ok: true };
    }
    const json = await res.json().catch(() => null);
    return { ok: false, error: json?.error ?? null };
  };

  return { state, setState, people, setPeople, meta, status, loaded, closed, canEdit, markClosed, setLobbyStatus, updateMeta, refetch, flushWrite, hasPendingWrite };
}

export async function createLobby(
  lobbyId: string,
  editToken: string,
  sessionId: string,
  meta: LobbyMeta,
  state: LeaderboardLobbyState,
): Promise<{ ok: true } | { ok: false; error: string | null }> {
  const res = await fetch(`/api/lobby/${lobbyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meta, state, sessionId, editToken }),
  });
  if (res.ok) return { ok: true };
  const json = await res.json().catch(() => null);
  return { ok: false, error: json?.error ?? null };
}

/** Joining requires the caller to be signed in — the server derives identity/email from the session, not the request body. */
export async function joinLobby(
  lobbyId: string,
  sessionId: string,
  participant: { name: string; gameName?: string; tagLine?: string; server?: string; region?: string },
): Promise<{ ok: true } | { ok: false; error: string | null }> {
  const res = await fetch(`/api/lobby/${lobbyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, ...participant }),
  });
  if (res.ok) return { ok: true };
  const json = await res.json().catch(() => null);
  return { ok: false, error: json?.error ?? null };
}

export async function leaveLobby(lobbyId: string, sessionId: string): Promise<boolean> {
  const res = await fetch(`/api/lobby/${lobbyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, leave: true }),
  });
  return res.ok;
}

/** Host-only: approve a pending participant, or reject them (and block them from requesting to join again). */
export async function setParticipantApproval(
  lobbyId: string,
  hostSessionId: string,
  editToken: string | null,
  targetUserId: string,
  action: "approve" | "reject",
): Promise<boolean> {
  const res = await fetch(`/api/lobby/${lobbyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: hostSessionId, editToken, targetUserId, action }),
  });
  return res.ok;
}

export async function closeLobby(lobbyId: string, editToken: string, authorSessionId: string) {
  await fetch(
    `/api/lobby/${lobbyId}?token=${encodeURIComponent(editToken)}&sessionId=${encodeURIComponent(authorSessionId)}`,
    { method: "DELETE" },
  ).catch(() => {});
}

/** Permanently deletes a lobby the signed-in caller owns — no edit token needed, the server checks ownerUserId against the session. */
export async function deleteOwnedLobby(lobbyId: string): Promise<boolean> {
  const res = await fetch(`/api/lobby/${lobbyId}`, { method: "DELETE" }).catch(() => null);
  return Boolean(res?.ok);
}
