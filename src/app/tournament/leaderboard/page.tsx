"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, LogIn, X } from "lucide-react";
import { createRoom, getSessionId } from "@/lib/useLeaderboardRoom";
import { MONO, randomRoomId, defaultRoomState } from "./shared";

const MAX_CREATE_ATTEMPTS = 5;

export default function LeaderboardLandingPage() {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [joinError, setJoinError] = React.useState<string | null>(null);

  const openRoom = async () => {
    setCreating(true);
    const sessionId = getSessionId();
    const editToken = crypto.randomUUID();

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
      const roomId = randomRoomId();
      const ok = await createRoom(roomId, editToken, sessionId, defaultRoomState());
      if (ok) {
        router.push(`/tournament/leaderboard/${roomId}?token=${editToken}`);
        return;
      }
    }
    setCreating(false);
  };

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setJoinError("Enter the 6-digit room code.");
      return;
    }
    router.push(`/tournament/leaderboard/${code}`);
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "var(--ink-1000)", color: "#fff",
    fontFamily: "var(--family-sans, Inter, sans-serif)",
    display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28, padding: 24,
  };

  const cardBtn: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    width: 220, padding: "28px 20px", borderRadius: 14, cursor: "pointer",
    background: "var(--ink-900)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff",
    fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
  };

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--gold-500)", marginBottom: 10 }}>
          // 4HOPE TOURNAMENT TOOLS
        </div>
        <div style={{ fontFamily: "var(--font-display, Archivo, sans-serif)", fontWeight: 900, fontSize: 42, lineHeight: 1, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
          Leaderboard
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
        <button style={cardBtn} onClick={openRoom} disabled={creating}>
          <DoorOpen size={26} color="var(--gold-500)" />
          {creating ? "Opening…" : "Open a room"}
        </button>
        <button style={cardBtn} onClick={() => { setJoinOpen(true); setJoinError(null); }}>
          <LogIn size={26} color="var(--gold-500)" />
          Join a room
        </button>
      </div>

      {joinOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setJoinOpen(false)}
        >
          <form
            onSubmit={submitJoin}
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--ink-900)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 24, width: 320, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                Join a room
              </span>
              <button type="button" onClick={() => setJoinOpen(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)); setJoinError(null); }}
              style={{
                fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.3em", textAlign: "center",
                color: "#fff", background: "var(--ink-700)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8, padding: "10px 8px", outline: "none",
              }}
            />
            {joinError && (
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#FCA5A5" }}>{joinError}</span>
            )}
            <button
              type="submit"
              style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: "none",
                background: "var(--gold-500)", color: "var(--ink-1000)",
              }}
            >
              Join
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
