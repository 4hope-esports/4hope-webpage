"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Plus, RotateCcw, Users, Eye, Check, WifiOff, X } from "lucide-react";
import { Leaderboard } from "@/components/data/Leaderboard";
import { useLeaderboardRoom, LeaderboardRoomState, getSessionId, closeRoom } from "@/lib/useLeaderboardRoom";
import { MONO, POINTS_SCALE, ENTRY_MODE, defaultRoomState } from "../shared";

const TOAST_MS = 4000;

export default function LeaderboardRoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId;
  const editToken = searchParams.get("token");

  const [copied, setCopied] = React.useState<"edit" | "view" | null>(null);
  const [roomIdCopied, setRoomIdCopied] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [narrow, setNarrow] = React.useState(false);
  const [nameFilter, setNameFilter] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((t) => (t === message ? null : t)), TOAST_MS);
  };

  const { state, setState, loaded, closed, canEdit, markClosed } = useLeaderboardRoom(
    roomId, editToken, React.useMemo(defaultRoomState, []),
  );
  const {
    players, roundCount, scores, order, prizeTiers,
    rankMode, showPrize, cutoffOn, cutoffRank, cutoffLabel,
  } = state;

  const patch = (partial: Partial<LeaderboardRoomState>) => setState((s) => ({ ...s, ...partial }));

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setNarrow(mq.matches);
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const editLink = editToken ? `${origin}/tournament/leaderboard/${roomId}?token=${editToken}` : "";
  const viewLink = `${origin}/tournament/leaderboard/${roomId}`;

  const copyLink = (kind: "edit" | "view") => {
    const link = kind === "edit" ? editLink : viewLink;
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(kind);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
  };

  const copyRoomId = () => {
    navigator.clipboard?.writeText(roomId);
    setRoomIdCopied(true);
    setTimeout(() => setRoomIdCopied(false), 1500);
  };

  const confirmDisableSharing = async () => {
    if (!editToken) return;
    setClosing(true);
    const sessionId = getSessionId();
    markClosed();
    await closeRoom(roomId, editToken, sessionId);
    router.push("/tournament/leaderboard");
  };

  React.useEffect(() => {
    if (closed) showToast("This room is closed. The leaderboard is final and will no longer update.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  const pad = narrow ? 16 : 36;
  const readOnly = !canEdit;

  const ghostBtn: React.CSSProperties = {
    fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "8px 14px", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
    background: "transparent", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.16)",
    whiteSpace: "nowrap", flexShrink: 0,
  };

  const smallInput: React.CSSProperties = {
    fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: "#fff", background: "var(--ink-700)",
    border: "1px solid rgba(255,255,255,0.14)", borderRadius: 7, padding: "6px 8px", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.42)", textTransform: "uppercase",
  };

  const toastEl = toast && (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 50,
      background: "var(--ink-900)", border: "1px solid var(--gold-500)", borderRadius: 10,
      padding: "12px 16px", fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)", maxWidth: 320,
    }}>
      {toast}
    </div>
  );

  const confirmCloseModal = confirmCloseOpen && (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onClick={() => !closing && setConfirmCloseOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ink-900)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
            Stop sharing this room?
          </span>
          {!closing && (
            <button type="button" onClick={() => setConfirmCloseOpen(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex" }}>
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          Once closed, this room can&apos;t be reopened or edited again — the leaderboard freezes as-is for anyone with the link.
          Save the room ID below if you want to reference it later.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            readOnly
            value={roomId}
            onFocus={(e) => e.currentTarget.select()}
            style={{ ...smallInput, flex: 1, minWidth: 0, fontSize: 13, textAlign: "center", letterSpacing: "0.1em" }}
          />
          <button style={ghostBtn} onClick={copyRoomId}>
            {roomIdCopied ? <Check size={13} /> : null}
            {roomIdCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}
            onClick={() => setConfirmCloseOpen(false)}
            disabled={closing}
          >
            Cancel
          </button>
          <button
            style={{
              ...ghostBtn, flex: 1, justifyContent: "center",
              background: "var(--gold-500)", color: "var(--ink-1000)", border: "none",
            }}
            onClick={confirmDisableSharing}
            disabled={closing}
          >
            {closing ? "Closing…" : "Stop sharing"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink-1000)", color: "#fff", fontFamily: "var(--family-sans, Inter, sans-serif)" }}>

      {/* Hero — bottom edge only, no top edge (nothing above it to separate from) */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(-32deg, transparent 0 60px, var(--gold-500) 60px 82px)",
          opacity: 0.4,
          maskImage: "linear-gradient(90deg, transparent 80%, black 92%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 80%, black 92%)",
        }} />
        <div style={{ position: "relative", padding: narrow ? "22px 16px 18px" : "34px 36px 28px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--gold-500)", marginBottom: 8 }}>
            // 4HOPE TOURNAMENT TOOLS
          </div>
          <div style={{ fontFamily: "var(--font-display, Archivo, sans-serif)", fontWeight: 900, fontSize: narrow ? 30 : 42, lineHeight: 1, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            Leaderboard
          </div>
        </div>
      </div>

      {/* Bar 1: room + actions — bottom edge only */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: `12px ${pad}px`, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "var(--ink-900)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Room ID</span>
            <span style={{ ...smallInput, background: "transparent", border: "none", padding: "6px 2px" }}>{roomId}</span>
          </div>

          {readOnly ? (
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--gold-500)", border: "1px solid var(--gold-500)", borderRadius: 6, padding: "4px 8px" }}>
              {closed ? "CLOSED — FINAL" : "VIEW ONLY"}
            </span>
          ) : (
            <>
              <button style={ghostBtn} onClick={() => copyLink("edit")}>
                {copied === "edit" ? <Check size={13} /> : <Users size={13} />}
                {copied === "edit" ? "Copied!" : "Copy Collaborator link"}
              </button>
              <button style={ghostBtn} onClick={() => copyLink("view")}>
                {copied === "view" ? <Check size={13} /> : <Eye size={13} />}
                {copied === "view" ? "Copied!" : "Copy Viewer link"}
              </button>
              <button style={ghostBtn} onClick={() => setConfirmCloseOpen(true)}>
                <WifiOff size={13} /> Stop sharing
              </button>
            </>
          )}
        </div>

        {!readOnly && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}>
            <button style={ghostBtn} onClick={addPlayer}><UserPlus size={13} /> Add player</button>
            <button style={ghostBtn} onClick={() => patch({ roundCount: Math.max(1, roundCount + 1) })}><Plus size={13} /> Add round</button>
            <button style={ghostBtn} onClick={reset}><RotateCcw size={13} /> Reset scores</button>
          </div>
        )}
      </div>

      {/* Bar 2: settings — bottom edge only (its top edge is the bar above's own bottom edge, not doubled) */}
      {!readOnly && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px", padding: `14px ${pad}px`, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "var(--ink-950)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={cutoffOn} onChange={(e) => patch({ cutoffOn: e.target.checked })} />
            <span style={labelStyle}>Cutoff line</span>
          </label>
          {cutoffOn && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={labelStyle}>after rank</span>
                <input type="number" min="1" value={cutoffRank}
                  onChange={(e) => patch({ cutoffRank: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  style={{ ...smallInput, width: 52, textAlign: "center" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: narrow ? "1 0 100%" : "0 1 260px" }}>
                <span style={labelStyle}>label</span>
                <input value={cutoffLabel} onChange={(e) => patch({ cutoffLabel: e.target.value })} style={{ ...smallInput, flex: 1, minWidth: 0 }} />
              </div>
            </>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={showPrize} onChange={(e) => patch({ showPrize: e.target.checked })} />
            <span style={labelStyle}>Prize column</span>
          </label>
        </div>
      )}

      {/* Table */}
      <div style={{ padding: `20px ${pad}px 40px` }}>
        {!loaded ? (
          <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.5)", padding: 24 }}>LOADING…</div>
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
            readOnly={readOnly}
          />
        )}
      </div>
      {toastEl}
      {confirmCloseModal}
    </div>
  );
}
