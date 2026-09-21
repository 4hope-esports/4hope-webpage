"use client";

import React from "react";
import { Search, X } from "lucide-react";

export interface LeaderboardPlayer {
  id: string;
  name: string;
  region?: string;
}

export interface LeaderboardProps {
  players?: LeaderboardPlayer[];
  onPlayersChange?: (players: LeaderboardPlayer[]) => void;
  roundCount?: number;
  onRoundCountChange?: (count: number) => void;
  scores?: Record<string, Record<number, number | null>>;
  onScoresChange?: (scores: Record<string, Record<number, number | null>>) => void;
  pointsScale?: number[];
  entryMode?: "points" | "placement";
  rankMode?: "auto" | "manual";
  order?: string[];
  onOrderChange?: (order: string[]) => void;
  showPrize?: boolean;
  prizeTiers?: string[];
  onPrizeTiersChange?: (tiers: string[]) => void;
  cutoffRank?: number | null;
  cutoffLabel?: string;
  nameFilter?: string;
  onNameFilterChange?: (value: string) => void;
  regionFilter?: string;
  onRegionFilterChange?: (value: string) => void;
  /** Autocomplete suggestions offered on the per-row Region input. */
  regionOptions?: string[];
  /** Removes one row — a discrete action, so (unlike onPlayersChange edits) the caller is expected to save it immediately rather than wait for a blur. Falls back to onPlayersChange if omitted. */
  onRemovePlayer?: (id: string) => void;
  /** Fires on blur of any editable cell — used to commit a pending debounced save right away. */
  onFieldBlur?: () => void;
  /** Renders all cells/actions inert (no edits, no add/remove) — for a shared view-only link */
  readOnly?: boolean;
  style?: React.CSSProperties;
}

const REGION_COLORS: Record<string, [string, string]> = {
  AMER: ["#7DD3FC", "#04212E"], // blue
  AMERICAS: ["#7DD3FC", "#04212E"], // blue
  EMEA: ["#86EFAC", "#052E12"], // green
  APAC: ["#C084FC", "#210634"], // purple
  CN:   ["#F2C200", "#1A1300"], // gold
  GLOBAL: ["#F2C200", "#1A1300"], // gold
};

const REGION_FALLBACK: [string, string][] = [
  ["#FCA5A5", "#310808"], ["#FDBA74", "#331603"],
  ["#67E8F9", "#022A2E"], ["#F9A8D4", "#2E0620"],
];

function regionColor(tag: string | undefined): [string, string] {
  if (!tag) return ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.6)"];
  if (REGION_COLORS[tag.toUpperCase()]) return REGION_COLORS[tag.toUpperCase()];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = ((h * 31 + tag.charCodeAt(i)) >>> 0);
  return REGION_FALLBACK[h % REGION_FALLBACK.length];
}

const mono = "var(--font-mono, 'Roboto Mono', monospace)";
const COLW = { rank: 40, name: 168, region: 104, total: 74, prize: 104, round: 58 };

/** Enter commits a cell the same way tabbing away does — it just blurs, which fires onBlur/onFieldBlur. */
function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") e.currentTarget.blur();
}

function cellInputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%", height: "100%", boxSizing: "border-box", background: "transparent",
    border: "none", outline: "none", color: "#fff", fontFamily: mono, fontSize: 12.5,
    textAlign: "center", ...extra,
  };
}

export function Leaderboard({
  players = [],
  onPlayersChange,
  roundCount = 8,
  onRoundCountChange,
  scores = {},
  onScoresChange,
  pointsScale = [8, 7, 6, 5, 4, 3, 2, 1],
  entryMode = "points",
  rankMode = "auto",
  order,
  onOrderChange,
  showPrize = true,
  prizeTiers = [],
  onPrizeTiersChange,
  cutoffRank = null,
  cutoffLabel = "QUALIFY",
  nameFilter,
  onNameFilterChange,
  regionFilter,
  onRegionFilterChange,
  regionOptions,
  onRemovePlayer,
  onFieldBlur,
  readOnly = false,
  style = {},
}: LeaderboardProps) {
  const [nameFilterOpen, setNameFilterOpen] = React.useState(false);
  const [regionFilterOpen, setRegionFilterOpen] = React.useState(false);

  const total = (pid: string) => {
    const row = scores[pid] || {};
    let t = 0;
    for (let r = 0; r < roundCount; r++) t += Number(row[r]) || 0;
    return t;
  };

  const rowOrder = React.useMemo(() => {
    if (rankMode === "manual" && order && order.length) {
      const known = order.filter((id) => players.some((p) => p.id === id));
      const missing = players.map((p) => p.id).filter((id) => !known.includes(id));
      return [...known, ...missing];
    }
    return [...players].map((p) => p.id).sort((a, b) => total(b) - total(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, scores, roundCount, rankMode, order]);

  const move = (pid: string, dir: number) => {
    if (!onOrderChange) return;
    const arr = [...rowOrder];
    const i = arr.indexOf(pid), j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onOrderChange(arr);
  };

  const setScore = (pid: string, r: number, raw: string) => {
    if (!onScoresChange) return;
    let pts: number | null = null;
    if (raw === "" || raw == null) pts = null;
    else if (entryMode === "placement") {
      const p = Math.max(1, parseInt(raw, 10) || 1);
      pts = pointsScale[p - 1] ?? 0;
    } else {
      pts = Math.max(0, parseFloat(raw) || 0);
    }
    onScoresChange({ ...scores, [pid]: { ...(scores[pid] || {}), [r]: pts } });
  };

  const setPlayer = (pid: string, patch: Partial<LeaderboardPlayer>) => {
    if (!onPlayersChange) return;
    onPlayersChange(players.map((p) => (p.id === pid ? { ...p, ...patch } : p)));
  };

  const removePlayer = (pid: string) => {
    if (onRemovePlayer) {
      onRemovePlayer(pid);
      return;
    }
    if (!onPlayersChange) return;
    onPlayersChange(players.filter((p) => p.id !== pid));
  };

  const headCell = (w: number, extra?: React.CSSProperties): React.CSSProperties => ({
    width: w, flex: `0 0 ${w}px`, padding: "8px 6px", boxSizing: "border-box",
    fontFamily: mono, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.4)", textTransform: "uppercase", textAlign: "center",
    borderRight: "1px solid rgba(255,255,255,0.06)", ...extra,
  });

  const stickyBg = "var(--ink-900)";

  return (
    <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, ...style }}>
      {/* Below ~640px, only Rank + Name stay pinned — Region/Pts/Prize joining
          the horizontal scroll (instead of all four crowding the sticky-left
          band) is what actually leaves room to see the round columns. */}
      <style>{`
        @media (max-width: 640px) {
          .lb-col-name {
            width: 140px !important;
            flex: 0 0 140px !important;
            min-width: 140px !important;
          }
          .lb-col-region, .lb-col-total, .lb-col-prize {
            position: static !important;
            left: auto !important;
            right: auto !important;
            /* Flex items respect z-index even at position:static, so without
               this these columns (later in DOM order) paint over the still-
               sticky Rank/Name cells instead of scrolling behind them. */
            z-index: 0 !important;
          }
        }
      `}</style>
      {regionOptions && regionOptions.length > 0 && (
        <datalist id="lb-region-options">
          {regionOptions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      )}
      <div style={{ width: "max-content", minWidth: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", background: "var(--ink-900)", borderBottom: "1px solid rgba(255,255,255,0.14)", position: "sticky", top: 0, zIndex: 3 }}>
          <div style={{ ...headCell(COLW.rank), position: "sticky", left: 0, background: stickyBg, zIndex: 2 }}>#</div>

          {/* Name header */}
          <div className="lb-col-name" style={{ ...headCell(COLW.name, { textAlign: "left" }), position: "sticky", left: COLW.rank, background: stickyBg, zIndex: 2, display: "flex", alignItems: "center", gap: 6 }}>
            {onNameFilterChange && nameFilterOpen ? (
              <>
                <input autoFocus value={nameFilter || ""} onChange={(e) => onNameFilterChange(e.target.value)} placeholder="Search name…"
                  style={{ flex: 1, minWidth: 0, background: "var(--ink-700)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 5, padding: "3px 6px", color: "#fff", font: "inherit", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }} />
                <span onClick={() => { onNameFilterChange(""); setNameFilterOpen(false); }} title="Clear filter"
                  style={{ cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 13, flex: "none" }}>×</span>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>Name</span>
                {onNameFilterChange && (
                  <span onClick={() => setNameFilterOpen(true)} title="Filter by name"
                    style={{ cursor: "pointer", color: nameFilter ? "var(--gold-500)" : "rgba(255,255,255,0.55)", display: "flex", flex: "none" }}>
                    <Search size={12} />
                  </span>
                )}
              </>
            )}
          </div>

          {/* Region header */}
          <div className="lb-col-region" style={{ ...headCell(COLW.region), position: "sticky", left: COLW.rank + COLW.name, background: stickyBg, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            {onRegionFilterChange && regionFilterOpen ? (
              <>
                <input autoFocus value={regionFilter || ""} onChange={(e) => onRegionFilterChange(e.target.value)} placeholder="Search region…"
                  style={{ flex: 1, minWidth: 0, background: "var(--ink-700)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 5, padding: "3px 6px", color: "#fff", font: "inherit", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }} />
                <span onClick={() => { onRegionFilterChange(""); setRegionFilterOpen(false); }} title="Clear filter"
                  style={{ cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 13, flex: "none" }}>×</span>
              </>
            ) : (
              <>
                <span>Region</span>
                {onRegionFilterChange && (
                  <span onClick={() => setRegionFilterOpen(true)} title="Filter by region"
                    style={{ cursor: "pointer", color: regionFilter ? "var(--gold-500)" : "rgba(255,255,255,0.55)", display: "flex", flex: "none" }}>
                    <Search size={12} />
                  </span>
                )}
              </>
            )}
          </div>

          <div className="lb-col-total" style={{ ...headCell(COLW.total), position: "sticky", left: COLW.rank + COLW.name + COLW.region, background: stickyBg, zIndex: 2, color: "var(--gold-500)" }}>Pts</div>

          {Array.from({ length: roundCount }).map((_, r) => (
            <div key={r} style={{ ...headCell(COLW.round), position: "relative" }}>
              R{r + 1}
              {!readOnly && onRoundCountChange && (
                <span onClick={() => onRoundCountChange(roundCount - 1)} title="Remove round"
                  style={{ position: "absolute", top: 2, right: 3, cursor: "pointer", color: "rgba(255,255,255,0.25)", fontSize: 10, lineHeight: 1 }}>×</span>
              )}
            </div>
          ))}

          {showPrize && (
            <div className="lb-col-prize" style={{ ...headCell(COLW.prize), position: "sticky", right: 0, background: stickyBg, zIndex: 2, borderRight: "none", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>Prize</div>
          )}
        </div>

        {/* Rows */}
        {rowOrder.map((pid, idx) => {
          const p = players.find((x) => x.id === pid);
          if (!p) return null;
          const rank = idx + 1;
          const [bg, fg] = regionColor(p.region);
          const qualified = cutoffRank != null && rank <= cutoffRank;
          const rowBg = qualified
            ? "color-mix(in oklch, var(--gold-500) 9%, var(--ink-900))"
            : idx % 2 ? "var(--ink-950)" : "var(--ink-900)";
          const showCutoffLine = cutoffRank != null && rank === cutoffRank;

          return (
            <React.Fragment key={pid}>
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", background: rowBg }}>
                {/* Rank */}
                <div style={{ width: COLW.rank, flex: `0 0 ${COLW.rank}px`, padding: "6px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, position: "sticky", left: 0, background: rowBg, zIndex: 1 }}>
                  {!readOnly && rankMode === "manual" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      <span onClick={() => move(pid, -1)} style={{ cursor: "pointer", fontSize: 8, color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>▲</span>
                      <span onClick={() => move(pid, 1)} style={{ cursor: "pointer", fontSize: 8, color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>▼</span>
                    </div>
                  )}
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: rank === 1 ? "var(--gold-500)" : "rgba(255,255,255,0.6)" }}>{rank}</span>
                </div>

                {/* Name */}
                <div className="lb-col-name" style={{ width: COLW.name, flex: `0 0 ${COLW.name}px`, padding: "2px 6px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 6, position: "sticky", left: COLW.rank, background: rowBg, zIndex: 1 }}>
                  <input value={p.name} readOnly={readOnly} onChange={(e) => setPlayer(pid, { name: e.target.value })}
                    onBlur={onFieldBlur}
                    onKeyDown={blurOnEnter}
                    style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "var(--family-sans, Inter, sans-serif)", fontWeight: 600, fontSize: 12.5 }} />
                  {!readOnly && (onPlayersChange || onRemovePlayer) && (
                    <span onClick={() => removePlayer(pid)} title="Remove player"
                      style={{ cursor: "pointer", color: "rgba(255,255,255,0.55)", display: "flex", flex: "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FCA5A5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}>
                      <X size={13} />
                    </span>
                  )}
                </div>

                {/* Region */}
                <div className="lb-col-region" style={{ width: COLW.region, flex: `0 0 ${COLW.region}px`, padding: "5px 8px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", position: "sticky", left: COLW.rank + COLW.name, background: rowBg, zIndex: 1 }}>
                  <input value={p.region || ""} placeholder="—" readOnly={readOnly} list={regionOptions?.length ? "lb-region-options" : undefined}
                    onChange={(e) => setPlayer(pid, { region: e.target.value.slice(0, 20) })}
                    onBlur={onFieldBlur}
                    onKeyDown={blurOnEnter}
                    style={{ width: "100%", textAlign: "center", background: bg, color: fg, border: "none", outline: "none", borderRadius: 5, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 2px" }} />
                </div>

                {/* Total */}
                <div className="lb-col-total" style={{ width: COLW.total, flex: `0 0 ${COLW.total}px`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 13.5, fontWeight: 700, color: "var(--gold-500)", position: "sticky", left: COLW.rank + COLW.name + COLW.region, background: rowBg, zIndex: 1 }}>
                  {total(pid)}
                </div>

                {/* Round cells */}
                {Array.from({ length: roundCount }).map((_, r) => {
                  const val = (scores[pid] || {})[r];
                  return (
                    <div key={r} style={{ width: COLW.round, flex: `0 0 ${COLW.round}px`, boxSizing: "border-box", height: 34, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                      <input type="number" value={val == null ? "" : val} placeholder="–" readOnly={readOnly}
                        onChange={(e) => setScore(pid, r, e.target.value)}
                        onBlur={onFieldBlur}
                    onKeyDown={blurOnEnter}
                        style={cellInputStyle({ fontWeight: val != null ? 700 : 400, cursor: readOnly ? "default" : "text" })} />
                    </div>
                  );
                })}

                {/* Prize */}
                {showPrize && (
                  <div className="lb-col-prize" style={{ width: COLW.prize, flex: `0 0 ${COLW.prize}px`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", position: "sticky", right: 0, background: rowBg, zIndex: 1, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                    {!readOnly && onPrizeTiersChange ? (
                      <input
                        value={prizeTiers[rank - 1] || ""}
                        placeholder="—"
                        onChange={(e) => {
                          const next = [...prizeTiers];
                          while (next.length < rank) next.push("");
                          next[rank - 1] = e.target.value;
                          onPrizeTiersChange(next);
                        }}
                        onBlur={onFieldBlur}
                    onKeyDown={blurOnEnter}
                        style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: prizeTiers[rank - 1] ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)", textAlign: "center" }}
                      />
                    ) : (
                      <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: prizeTiers[rank - 1] ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)" }}>
                        {prizeTiers[rank - 1] || "—"}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Cutoff divider */}
              {showCutoffLine && (
                <div style={{ display: "flex", alignItems: "center", background: "var(--ink-1000)", borderBottom: "1px dashed var(--gold-500)", borderTop: "1px dashed var(--gold-500)" }}>
                  <div style={{ flex: 1, padding: "3px 10px", fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--gold-500)", textTransform: "uppercase", textAlign: "center" }}>
                    {cutoffLabel}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
