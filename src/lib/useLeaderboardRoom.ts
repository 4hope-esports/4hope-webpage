"use client";

import { useEffect, useRef, useState } from "react";
import type { LeaderboardPlayer } from "@/components/data/Leaderboard";

export interface LeaderboardRoomState {
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

type RoomData = (Partial<LeaderboardRoomState> & { closed?: boolean }) | null;

async function fetchRoom(roomId: string, editToken: string | null): Promise<RoomData> {
  const url = editToken ? `/api/room/${roomId}?token=${encodeURIComponent(editToken)}` : `/api/room/${roomId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json: { data: RoomData } = await res.json();
  return json.data ?? null;
}

/**
 * Every room lives in Firebase, addressed by its 6-digit room id in the URL
 * path. Joining with just the room id is always read-only — write access
 * requires a valid editToken (GUID), supplied only to whoever opened the
 * room, via ?token=. A room the server reports as `closed` stops polling and
 * can no longer be written to.
 */
export function useLeaderboardRoom(
  roomId: string | null,
  editToken: string | null,
  defaultState: LeaderboardRoomState,
) {
  const [state, setState] = useState<LeaderboardRoomState>(defaultState);
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

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    closedRef.current = false;
    setLoaded(false);
    setClosed(false);
    setCanEdit(false);

    const load = async () => {
      const data = await fetchRoom(roomId, editToken);
      if (cancelled || closedRef.current) return;
      // Even a closed room's final data should render — freeze on it rather
      // than discarding it, so viewers can still see the last standings.
      skipNextWrite.current = true;
      setState(data ? { ...defaultState, ...data } : defaultState);
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
      const data = await fetchRoom(roomId, editToken);
      if (cancelled || closedRef.current) return;
      if (!data) return;
      const serialized = JSON.stringify(data);
      if (serialized !== lastWritten.current) {
        skipNextWrite.current = true;
        setState({ ...defaultState, ...data });
      }
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
  }, [roomId, editToken]);

  useEffect(() => {
    if (!roomId || !loaded || !canEdit || closed) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      if (closedRef.current) return;
      const body = JSON.stringify({ state, sessionId: getSessionId(), editToken });
      lastWritten.current = JSON.stringify(state);
      fetch(`/api/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loaded, roomId, canEdit, closed, editToken]);

  return { state, setState, loaded, closed, canEdit, markClosed };
}

export async function createRoom(roomId: string, editToken: string, sessionId: string, state: LeaderboardRoomState): Promise<boolean> {
  const res = await fetch(`/api/room/${roomId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, sessionId, editToken }),
  });
  return res.ok;
}

export async function closeRoom(roomId: string, editToken: string, ownerSessionId: string) {
  await fetch(
    `/api/room/${roomId}?token=${encodeURIComponent(editToken)}&sessionId=${encodeURIComponent(ownerSessionId)}`,
    { method: "DELETE" },
  ).catch(() => {});
}
