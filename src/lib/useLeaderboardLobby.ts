"use client";

import { useEffect, useRef, useState } from "react";
import type { LeaderboardPlayer } from "@/components/data/Leaderboard";

export type LobbyStatus = "open" | "live" | "ended";

export interface LobbyParticipant {
  sessionId: string;
  name: string;
  photoURL?: string | null;
}

export interface LeaderboardLobbyState {
  players: LeaderboardPlayer[];
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
  prizes?: string[];
  description?: string;
}

const WRITE_DEBOUNCE_MS = 400;
const POLL_INTERVAL_MS = 2000;
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
      participants?: LobbyParticipant[];
      scheduledStartTime?: string | null;
    })
  | null;

async function fetchLobby(lobbyId: string, editToken: string | null): Promise<LobbyData> {
  const url = editToken ? `/api/lobby/${lobbyId}?token=${encodeURIComponent(editToken)}` : `/api/lobby/${lobbyId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json: { data: LobbyData } = await res.json();
  return json.data ?? null;
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
  const [meta, setMeta] = useState<{
    name: string;
    region: string;
    authorName: string;
    authorPhotoURL: string | null;
    authorSessionId: string;
    participants: LobbyParticipant[];
    scheduledStartTime: string | null;
  } | null>(null);
  const [status, setStatus] = useState<LobbyStatus>("open");
  const [loaded, setLoaded] = useState(false);
  const [closed, setClosed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const closedRef = useRef(false);
  const skipNextWrite = useRef(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWritten = useRef<string>("");

  const markClosed = () => {
    closedRef.current = true;
    setClosed(true);
    setCanEdit(false);
  };

  const applyData = (data: LobbyData) => {
    setState((s) => ({ ...defaultState, ...s, ...data }));
    setMeta({
      name: data?.name ?? "",
      region: data?.region ?? "",
      authorName: data?.authorName ?? "",
      authorPhotoURL: data?.authorPhotoURL ?? null,
      authorSessionId: data?.authorSessionId ?? "",
      participants: data?.participants ?? [],
      scheduledStartTime: data?.scheduledStartTime ?? null,
    });
    if (data?.status) setStatus(data.status);
  };

  useEffect(() => {
    if (!lobbyId) return;
    let cancelled = false;
    closedRef.current = false;
    setLoaded(false);
    setClosed(false);
    setCanEdit(false);

    const load = async () => {
      const data = await fetchLobby(lobbyId, editToken);
      if (cancelled || closedRef.current) return;
      // Even a closed lobby's final data should render — freeze on it rather
      // than discarding it, so viewers can still see the last standings.
      skipNextWrite.current = true;
      setState(data ? { ...defaultState, ...data } : defaultState);
      applyData(data);
      setCanEdit(Boolean(editToken) && data != null && !data?.closed);
      if (data?.closed) {
        closedRef.current = true;
        setClosed(true);
      }
      setLoaded(true);
    };
    load();

    const poll = setInterval(async () => {
      if (cancelled || closedRef.current) {
        clearInterval(poll);
        return;
      }
      const data = await fetchLobby(lobbyId, editToken);
      if (cancelled || closedRef.current) return;
      if (!data) return;
      const serialized = JSON.stringify(data);
      if (serialized !== lastWritten.current) {
        skipNextWrite.current = true;
        setState({ ...defaultState, ...data });
      }
      applyData(data);
      if (data.closed) {
        closedRef.current = true;
        setClosed(true);
        clearInterval(poll);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, editToken]);

  useEffect(() => {
    if (!lobbyId || !loaded || !canEdit || closed) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      if (closedRef.current) return;
      const body = JSON.stringify({ state, sessionId: getSessionId(), editToken });
      lastWritten.current = JSON.stringify(state);
      fetch(`/api/lobby/${lobbyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loaded, lobbyId, canEdit, closed, editToken]);

  const setLobbyStatus = async (next: LobbyStatus) => {
    if (!lobbyId || !editToken) return false;
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

  return { state, setState, meta, status, loaded, closed, canEdit, markClosed, setLobbyStatus };
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

export async function joinLobby(lobbyId: string, sessionId: string, name: string): Promise<boolean> {
  const res = await fetch(`/api/lobby/${lobbyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, name }),
  });
  return res.ok;
}

export async function closeLobby(lobbyId: string, editToken: string, authorSessionId: string) {
  await fetch(
    `/api/lobby/${lobbyId}?token=${encodeURIComponent(editToken)}&sessionId=${encodeURIComponent(authorSessionId)}`,
    { method: "DELETE" },
  ).catch(() => {});
}
