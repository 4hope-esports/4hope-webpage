import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { RIOT_SERVERS } from "@/api/riot/account";

export const dynamic = "force-dynamic";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 200_000;
const MAX_PLAYERS = 64;
const MAX_ROUNDS = 40;
const MAX_EDITOR_SESSIONS = 200;
const MAX_PARTICIPANTS = 200;
const MAX_ACTIVE_LOBBIES_PER_OWNER = 3;
const MAX_DESCRIPTION_LENGTH = 2000;
const STATUSES = ["open", "live", "ended"] as const;
const GAMES = ["League of Legends", "TFT"] as const;
const RIOT_SERVER_VALUES = RIOT_SERVERS.map((s) => s.value) as string[];

function isValidLobbyId(value: string) {
  return GUID_RE.test(value);
}

function isValidGuid(value: unknown): value is string {
  return typeof value === "string" && GUID_RE.test(value);
}

function lobbyRef(lobbyId: string) {
  return getAdminDb().collection(envCollection("lobbies")).doc(lobbyId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  if (!isValidLobbyId(lobbyId)) {
    return NextResponse.json({ error: "invalid lobby id" }, { status: 400 });
  }

  const snap = await lobbyRef(lobbyId).get();
  if (!snap.exists) {
    return NextResponse.json({ data: null });
  }

  let data = snap.data() as Record<string, unknown>;

  // Scheduled lobbies self-heal to "live" once their start time has passed —
  // no cron needed, the first read after the scheduled time flips it.
  if (data.status === "open" && typeof data.scheduledStartTime === "string" && new Date(data.scheduledStartTime).getTime() <= Date.now()) {
    await lobbyRef(lobbyId).set({ status: "live" }, { merge: true });
    data = { ...data, status: "live" };
  }

  const token = req.nextUrl.searchParams.get("token");
  let isEditor = isValidGuid(token) && token === data.editToken;
  if (!isEditor && typeof data.ownerUserId === "string") {
    const session = await auth();
    isEditor = session?.user?.id === data.ownerUserId;
  }

  // Never expose the edit token (write credential) to a caller joining by
  // just the lobby id / link — that path is view-only unless it also has ?token=.
  const { editToken: _editToken, editorSessionIds: _editorSessionIds, ...publicData } = data;
  void _editToken;
  void _editorSessionIds;

  // Open-state visibility: non-authors see participants only, not the score
  // table, until the author starts the lobby (status -> "live").
  if (!isEditor && data.status === "open") {
    const { players: _players, scores: _scores, order: _order, ...openData } = publicData;
    void _players;
    void _scores;
    void _order;
    return NextResponse.json({ data: openData });
  }

  return NextResponse.json({ data: publicData });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  if (!isValidLobbyId(lobbyId)) {
    return NextResponse.json({ error: "invalid lobby id" }, { status: 400 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const sessionId = b.sessionId;
  if (!isValidGuid(sessionId)) {
    return NextResponse.json({ error: "missing or invalid sessionId" }, { status: 400 });
  }

  const ref = lobbyRef(lobbyId);
  const snap = await ref.get();

  if (!snap.exists) {
    // First write claims this lobby id and mints its edit token. The creator
    // must supply the token it will use going forward (generated client-side
    // so it never has to be echoed back over an unauthenticated read).
    if (!isValidGuid(b.editToken)) {
      return NextResponse.json({ error: "missing or invalid editToken" }, { status: 400 });
    }
    const meta = validateLobbyMeta(b.meta);
    if (typeof meta === "string") return NextResponse.json({ error: meta }, { status: 400 });
    const error = validateLobbyState(b.state);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const activeCount = (
      await getAdminDb()
        .collection(envCollection("lobbies"))
        .where("ownerUserId", "==", meta.ownerUserId)
        .where("status", "!=", "ended")
        .get()
    ).size;
    if (activeCount >= MAX_ACTIVE_LOBBIES_PER_OWNER) {
      return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 409 });
    }

    await ref.set({
      ...meta,
      visibility: "public",
      status: "open",
      authorSessionId: sessionId,
      participants: [{ sessionId, name: meta.authorName, photoURL: meta.authorPhotoURL }],
      createdAt: new Date().toISOString(),
      ...(b.state as object),
      editToken: b.editToken,
      editorSessionIds: [sessionId],
      closed: false,
    });
    return NextResponse.json({ ok: true });
  }

  const existing = snap.data() as Record<string, unknown>;
  if (existing.editToken !== b.editToken) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  if (existing.closed || existing.status === "ended") {
    return NextResponse.json({ error: "lobby is closed" }, { status: 409 });
  }

  const update: Record<string, unknown> = {};

  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    update.status = b.status;
    if (b.status === "ended") update.closed = true;
  }

  if (b.state !== undefined) {
    const error = validateLobbyState(b.state);
    if (error) return NextResponse.json({ error }, { status: 400 });
    Object.assign(update, b.state as object);

    const editorSessionIds = Array.isArray(existing.editorSessionIds) ? (existing.editorSessionIds as string[]) : [];
    update.editorSessionIds = editorSessionIds.includes(sessionId as string)
      ? editorSessionIds
      : [...editorSessionIds, sessionId as string].slice(-MAX_EDITOR_SESSIONS);
  }

  await ref.set(update, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  if (!isValidLobbyId(lobbyId)) {
    return NextResponse.json({ error: "invalid lobby id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const sessionId = b.sessionId;
  const name = b.name;
  if (!isValidGuid(sessionId) || typeof name !== "string" || !name.trim() || name.length > 60) {
    return NextResponse.json({ error: "invalid sessionId or name" }, { status: 400 });
  }

  const ref = lobbyRef(lobbyId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "lobby not found" }, { status: 404 });
  }
  const existing = snap.data() as Record<string, unknown>;
  if (existing.status !== "open") {
    return NextResponse.json({ error: "lobby is not open for joining" }, { status: 409 });
  }

  const participants = Array.isArray(existing.participants) ? (existing.participants as { sessionId: string; name: string }[]) : [];
  if (participants.some((p) => p.sessionId === sessionId)) {
    return NextResponse.json({ ok: true });
  }
  const limit = typeof existing.limit === "number" ? existing.limit : MAX_PARTICIPANTS;
  if (participants.length >= limit) {
    return NextResponse.json({ error: "lobby is full" }, { status: 409 });
  }

  await ref.set({ participants: [...participants, { sessionId, name: name.trim() }] }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  if (!isValidLobbyId(lobbyId)) {
    return NextResponse.json({ error: "invalid lobby id" }, { status: 400 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!isValidGuid(token)) {
    return NextResponse.json({ error: "missing or invalid token" }, { status: 400 });
  }

  const ref = lobbyRef(lobbyId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ ok: true });
  }

  const existing = snap.data() as Record<string, unknown>;
  if (existing.editToken !== token) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  if (existing.authorSessionId !== req.nextUrl.searchParams.get("sessionId")) {
    return NextResponse.json({ error: "only the lobby author can close the lobby" }, { status: 403 });
  }

  await ref.set({ closed: true, status: "ended" }, { merge: true });
  return NextResponse.json({ ok: true });
}

function validateLobbyMeta(body: unknown): Record<string, unknown> | string {
  if (typeof body !== "object" || body === null) return "meta must be an object";
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 80) return "invalid lobby name";
  if (typeof b.region !== "string" || !b.region.trim() || b.region.length > 40) return "invalid region";
  if (typeof b.authorName !== "string" || !b.authorName.trim() || b.authorName.length > 60) return "invalid author name";
  if (b.authorPhotoURL !== undefined && b.authorPhotoURL !== null && typeof b.authorPhotoURL !== "string") return "invalid author photo";
  if (b.scheduledStartTime !== undefined && b.scheduledStartTime !== null) {
    if (typeof b.scheduledStartTime !== "string" || Number.isNaN(new Date(b.scheduledStartTime).getTime())) {
      return "invalid scheduled start time";
    }
  }
  if (typeof b.ownerUserId !== "string" || !b.ownerUserId.trim()) return "missing or invalid ownerUserId";
  if (b.game !== undefined && !GAMES.includes(b.game as (typeof GAMES)[number])) return "invalid game";
  if (b.riotServer !== undefined && b.riotServer !== null && !RIOT_SERVER_VALUES.includes(b.riotServer as string)) {
    return "invalid riotServer";
  }
  if (b.limit !== undefined) {
    if (typeof b.limit !== "number" || !Number.isFinite(b.limit) || b.limit < 2 || b.limit > MAX_PARTICIPANTS) {
      return "invalid limit";
    }
  }
  if (b.prizes !== undefined) {
    if (!Array.isArray(b.prizes) || b.prizes.length > MAX_PLAYERS) return "invalid prizes";
    for (const p of b.prizes) if (typeof p !== "string" || p.length > 40) return "invalid prize entry";
  }
  if (b.description !== undefined && b.description !== null) {
    if (typeof b.description !== "string" || b.description.length > MAX_DESCRIPTION_LENGTH) return "invalid description";
  }
  return {
    name: b.name.trim(),
    region: b.region.trim(),
    authorName: b.authorName.trim(),
    authorPhotoURL: b.authorPhotoURL ?? null,
    scheduledStartTime: b.scheduledStartTime ?? null,
    ownerUserId: b.ownerUserId.trim(),
    game: b.game ?? "TFT",
    riotServer: b.riotServer ?? null,
    limit: b.limit ?? MAX_PARTICIPANTS,
    prizes: b.prizes ?? [],
    description: typeof b.description === "string" ? b.description.trim() : "",
  };
}

function validateLobbyState(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "state must be an object";
  const b = body as Record<string, unknown>;

  if (b.players !== undefined) {
    if (!Array.isArray(b.players) || b.players.length > MAX_PLAYERS) return "invalid players";
    for (const p of b.players) {
      if (typeof p !== "object" || p === null) return "invalid player entry";
      const player = p as Record<string, unknown>;
      if (typeof player.id !== "string" || typeof player.name !== "string") return "invalid player fields";
      if (player.name.length > 60) return "player name too long";
      if (player.region !== undefined && typeof player.region !== "string") return "invalid player region";
    }
  }
  if (b.roundCount !== undefined) {
    if (typeof b.roundCount !== "number" || b.roundCount < 1 || b.roundCount > MAX_ROUNDS) return "invalid roundCount";
  }
  if (b.rankMode !== undefined && b.rankMode !== "auto" && b.rankMode !== "manual") return "invalid rankMode";
  if (b.cutoffRank !== undefined && typeof b.cutoffRank !== "number") return "invalid cutoffRank";
  if (b.cutoffLabel !== undefined && (typeof b.cutoffLabel !== "string" || b.cutoffLabel.length > 120)) return "invalid cutoffLabel";
  if (b.prizeTiers !== undefined) {
    if (!Array.isArray(b.prizeTiers) || b.prizeTiers.length > MAX_PLAYERS) return "invalid prizeTiers";
    for (const t of b.prizeTiers) if (typeof t !== "string" || t.length > 40) return "invalid prize tier";
  }

  return null;
}
