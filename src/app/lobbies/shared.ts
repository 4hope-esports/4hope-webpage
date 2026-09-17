import type { LeaderboardPlayer } from "@/components/data/Leaderboard";
import type { LeaderboardLobbyState } from "@/lib/useLeaderboardLobby";

export const MONO = "var(--font-mono, 'Roboto Mono', monospace)";
export const POINTS_SCALE = [8, 7, 6, 5, 4, 3, 2, 1];
export const ENTRY_MODE = "points" as const;

const START_NAMES = ["4H Clover", "4H Spade", "4H Ace", "4H Lucky", "4H Jinx", "4H Faker", "4H Blaze", "4H Ghost"];
const START_REGIONS = ["AMER", "EMEA", "APAC", "CN", "AMER", "EMEA", "APAC", "CN"];

let uid = 0;
const nextId = () => "p" + ++uid + "-" + Date.now().toString(36);

function seedPlayers(): LeaderboardPlayer[] {
  return START_NAMES.map((name, i) => ({ id: nextId(), name, region: START_REGIONS[i] }));
}

/** Demo/seed data — used only as a transient placeholder before a lobby's real data loads, never persisted. */
export function defaultLobbyState(): LeaderboardLobbyState {
  const players = seedPlayers();
  return {
    roundCount: 8,
    scores: {},
    order: players.map((p) => p.id),
    prizeTiers: ["$500", "$300", "$200", "$100", "", "", "", ""],
    rankMode: "auto",
    showPrize: true,
    cutoffOn: true,
    cutoffRank: 4,
    cutoffLabel: "QUALIFY TO NEXT STAGE",
  };
}

/** Illustrative-only roster shown while previewing an empty, not-yet-started lobby — never persisted. */
export function previewPlayers(): LeaderboardPlayer[] {
  return seedPlayers();
}

/** The real starting state for a newly created lobby — no demo rounds, prizes, or cutoff. */
export function emptyLobbyState(): LeaderboardLobbyState {
  return {
    roundCount: 8,
    scores: {},
    order: [],
    prizeTiers: [],
    rankMode: "auto",
    showPrize: false,
    cutoffOn: false,
    cutoffRank: 4,
    cutoffLabel: "",
  };
}
