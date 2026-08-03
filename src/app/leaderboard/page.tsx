"use client";

import React from "react";
import { UserPlus, Plus, RotateCcw } from "lucide-react";
import { Leaderboard, LeaderboardPlayer } from "@/components/data/Leaderboard";

const START_NAMES = ["4H Clover", "4H Spade", "4H Ace", "4H Lucky", "4H Jinx", "4H Faker", "4H Blaze", "4H Ghost"];
const START_REGIONS = ["AMER", "EMEA", "APAC", "CN", "AMER", "EMEA", "APAC", "CN"];
const LS_KEY = "4h-leaderboard-tool-v2";

let uid = 0;
const nextId = () => "p" + ++uid + "-" + Date.now().toString(36);

function seedPlayers(): LeaderboardPlayer[] {
  return START_NAMES.map((name, i) => ({ id: nextId(), name, region: START_REGIONS[i] }));
}

const SEED_PLAYERS = seedPlayers();

export default function LeaderboardPage() {
  const [hydrated, setHydrated] = React.useState(false);
  const [players, setPlayers] = React.useState<LeaderboardPlayer[]>(SEED_PLAYERS);
  const [nameFilter, setNameFilter] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("");
  const [roundCount, setRoundCount] = React.useState(8);
  const [scores, setScores] = React.useState<Record<string, Record<number, number | null>>>({});
  const [order, setOrder] = React.useState<string[]>(SEED_PLAYERS.map((p) => p.id));
  const [prizeTiers, setPrizeTiers] = React.useState<string[]>(["$500", "$300", "$200", "$100", "", "", "", ""]);
  const [rankMode, setRankMode] = React.useState<"auto" | "manual">("auto");
  const [entryMode, setEntryMode] = React.useState<"points" | "placement">("points");
  const [pointsScaleStr, setPointsScaleStr] = React.useState("8,7,6,5,4,3,2,1");
  const [showPrize, setShowPrize] = React.useState(true);
  const [cutoffOn, setCutoffOn] = React.useState(true);
  const [cutoffRank, setCutoffRank] = React.useState(4);
  const [cutoffLabel, setCutoffLabel] = React.useState("QUALIFY TO NEXT STAGE");
  const [narrow, setNarrow] = React.useState(false);

  // Restore from localStorage after mount (client-only)
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved) {
        if (saved.players) setPlayers(saved.players);
        if (saved.roundCount) setRoundCount(saved.roundCount);
        if (saved.scores) setScores(saved.scores);
        if (saved.order) setOrder(saved.order);
        if (saved.prizeTiers) setPrizeTiers(saved.prizeTiers);
        if (saved.rankMode) setRankMode(saved.rankMode);
        if (saved.entryMode) setEntryMode(saved.entryMode);
        if (saved.pointsScaleStr) setPointsScaleStr(saved.pointsScaleStr);
        if (saved.showPrize != null) setShowPrize(saved.showPrize);
        if (saved.cutoffOn != null) setCutoffOn(saved.cutoffOn);
        if (saved.cutoffRank) setCutoffRank(saved.cutoffRank);
        if (saved.cutoffLabel) setCutoffLabel(saved.cutoffLabel);
      }
    } catch {}
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setNarrow(mq.matches);
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Persist to localStorage after hydration
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        players, roundCount, scores, order, prizeTiers,
        rankMode, entryMode, pointsScaleStr, showPrize, cutoffOn, cutoffRank, cutoffLabel,
      }));
    } catch {}
  }, [hydrated, players, roundCount, scores, order, prizeTiers, rankMode, entryMode, pointsScaleStr, showPrize, cutoffOn, cutoffRank, cutoffLabel]);

  const pointsScale = pointsScaleStr.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
  const q = nameFilter.trim().toLowerCase();
  const rq = regionFilter.trim().toLowerCase();
  const visiblePlayers = players.filter(
    (p) => (!q || p.name.toLowerCase().includes(q)) && (!rq || (p.region || "").toLowerCase().includes(rq))
  );

  const addPlayer = () => {
    const id = nextId();
    setPlayers([...players, { id, name: "NEW PLAYER", region: "" }]);
    setOrder([...order, id]);
  };
  const reset = () => setScores({});

  const pad = narrow ? 16 : 36;
  const mono = "var(--font-mono, 'Roboto Mono', monospace)";

  const seg = (active: boolean): React.CSSProperties => ({
    fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    padding: "7px 14px", borderRadius: 7, cursor: "pointer", border: "none",
    background: active ? "var(--gold-500)" : "transparent",
    color: active ? "var(--ink-1000)" : "rgba(255,255,255,0.6)",
  });

  const ghostBtn: React.CSSProperties = {
    fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "8px 14px", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
    background: "transparent", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.16)",
  };

  const smallInput: React.CSSProperties = {
    fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: "#fff", background: "var(--ink-700)",
    border: "1px solid rgba(255,255,255,0.14)", borderRadius: 7, padding: "6px 8px", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.42)", textTransform: "uppercase",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink-1000)", color: "#fff", fontFamily: "var(--family-sans, Inter, sans-serif)" }}>

      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(-32deg, transparent 0 38px, var(--gold-500) 38px 60px)",
          opacity: 0.9,
          maskImage: "linear-gradient(90deg, transparent 45%, black 92%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 45%, black 92%)",
        }} />
        <div style={{ position: "relative", padding: narrow ? "22px 16px 18px" : "34px 36px 28px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--gold-500)", marginBottom: 8 }}>
            // 4HOPE TOURNAMENT TOOLS
          </div>
          <div style={{ fontFamily: "var(--font-display, Archivo, sans-serif)", fontWeight: 900, fontSize: narrow ? 30 : 42, lineHeight: 1, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            Leaderboard
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: `12px ${pad}px`, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "var(--ink-900)" }}>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 9, background: "var(--ink-700)" }}>
          <button style={seg(rankMode === "auto")} onClick={() => setRankMode("auto")}>Auto rank</button>
          <button style={seg(rankMode === "manual")} onClick={() => setRankMode("manual")}>Manual order</button>
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 9, background: "var(--ink-700)" }}>
          <button style={seg(entryMode === "points")} onClick={() => setEntryMode("points")}>Type points</button>
          <button style={seg(entryMode === "placement")} onClick={() => setEntryMode("placement")}>Type placement</button>
        </div>
        <div style={{ flex: 1, minWidth: narrow ? "100%" : 0 }} />
        <button style={ghostBtn} onClick={addPlayer}><UserPlus size={13} /> Add player</button>
        <button style={ghostBtn} onClick={() => setRoundCount((n) => Math.max(1, n + 1))}><Plus size={13} /> Add round</button>
        <button style={ghostBtn} onClick={reset}><RotateCcw size={13} /> Reset scores</button>
      </div>

      {/* Settings bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px", padding: `14px ${pad}px`, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "var(--ink-950)" }}>
        {entryMode === "placement" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Points scale (1st→last)</span>
            <input value={pointsScaleStr} onChange={(e) => setPointsScaleStr(e.target.value)} style={{ ...smallInput, width: 160 }} />
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={cutoffOn} onChange={(e) => setCutoffOn(e.target.checked)} />
          <span style={labelStyle}>Cutoff line</span>
        </label>
        {cutoffOn && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={labelStyle}>after rank</span>
              <input type="number" min="1" value={cutoffRank}
                onChange={(e) => setCutoffRank(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ ...smallInput, width: 52, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: narrow ? "1 0 100%" : "0 1 260px" }}>
              <span style={labelStyle}>label</span>
              <input value={cutoffLabel} onChange={(e) => setCutoffLabel(e.target.value)} style={{ ...smallInput, flex: 1, minWidth: 0 }} />
            </div>
          </>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={showPrize} onChange={(e) => setShowPrize(e.target.checked)} />
          <span style={labelStyle}>Prize column</span>
        </label>
      </div>

      {/* Table */}
      <div style={{ padding: `20px ${pad}px 40px` }}>
        <Leaderboard
          players={visiblePlayers}
          onPlayersChange={(edited) => {
            const visibleIds = new Set(visiblePlayers.map((p) => p.id));
            const editedById = new Map(edited.map((p) => [p.id, p]));
            const merged = players
              .filter((p) => !visibleIds.has(p.id) || editedById.has(p.id))
              .map((p) => editedById.get(p.id) || p);
            setPlayers(merged);
          }}
          roundCount={roundCount} onRoundCountChange={setRoundCount}
          scores={scores} onScoresChange={setScores}
          pointsScale={pointsScale} entryMode={entryMode}
          rankMode={rankMode} order={order} onOrderChange={setOrder}
          showPrize={showPrize} prizeTiers={prizeTiers} onPrizeTiersChange={setPrizeTiers}
          nameFilter={nameFilter} onNameFilterChange={setNameFilter}
          regionFilter={regionFilter} onRegionFilterChange={setRegionFilter}
          cutoffRank={cutoffOn ? cutoffRank : null} cutoffLabel={cutoffLabel}
        />
      </div>
    </div>
  );
}
