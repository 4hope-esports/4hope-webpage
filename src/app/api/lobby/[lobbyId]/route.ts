import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const ROOM_ID_RE = /^[0-9]{6}$/;
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 200_000;
const MAX_PLAYERS = 64;
const MAX_ROUNDS = 40;
const MAX_EDITOR_SESSIONS = 200;

function isValidRoomId(value: string) {
  return ROOM_ID_RE.test(value);
}

function isValidGuid(value: unknown): value is string {
  return typeof value === "string" && GUID_RE.test(value);
}

function roomRef(roomId: string) {
  return getAdminDb().collection("rooms").doc(roomId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid room id" }, { status: 400 });
  }

  const snap = await roomRef(roomId).get();
  if (!snap.exists) {
    return NextResponse.json({ data: null });
  }

  const data = snap.data() as Record<string, unknown>;
  const token = req.nextUrl.searchParams.get("token");
  const isEditor = isValidGuid(token) && token === data.editToken;

  // Never expose the edit token (write credential) or session bookkeeping to
  // a caller joining by the plain 6-digit room id — that path is view-only.
  const { editToken: _editToken, ownerSessionId: _ownerSessionId, editorSessionIds: _editorSessionIds, closed, ...publicData } = data;
  void _editToken;
  void _ownerSessionId;
  void _editorSessionIds;

  return NextResponse.json({ data: isEditor ? data : { ...publicData, closed } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid room id" }, { status: 400 });
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

  const ref = roomRef(roomId);
  const snap = await ref.get();

  if (!snap.exists) {
    // First write claims this room id and mints its edit token. The creator
    // must supply the token it will use going forward (generated client-side
    // so it never has to be echoed back over an unauthenticated read).
    if (!isValidGuid(b.editToken)) {
      return NextResponse.json({ error: "missing or invalid editToken" }, { status: 400 });
    }
    const error = validateRoomState(b.state);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await ref.set({
      ...(b.state as object),
      editToken: b.editToken,
      ownerSessionId: sessionId,
      editorSessionIds: [sessionId],
      closed: false,
    });
    return NextResponse.json({ ok: true });
  }

  const existing = snap.data() as Record<string, unknown>;
  if (existing.editToken !== b.editToken) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  if (existing.closed) {
    return NextResponse.json({ error: "room is closed" }, { status: 409 });
  }

  const error = validateRoomState(b.state);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const editorSessionIds = Array.isArray(existing.editorSessionIds) ? (existing.editorSessionIds as string[]) : [];
  const nextEditorSessionIds = editorSessionIds.includes(sessionId as string)
    ? editorSessionIds
    : [...editorSessionIds, sessionId as string].slice(-MAX_EDITOR_SESSIONS);

  await ref.set(
    { ...(b.state as object), editorSessionIds: nextEditorSessionIds },
    { merge: true },
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid room id" }, { status: 400 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!isValidGuid(token)) {
    return NextResponse.json({ error: "missing or invalid token" }, { status: 400 });
  }

  const ref = roomRef(roomId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ ok: true });
  }

  const existing = snap.data() as Record<string, unknown>;
  if (existing.editToken !== token) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  if (existing.ownerSessionId !== req.nextUrl.searchParams.get("sessionId")) {
    return NextResponse.json({ error: "only the room owner can close the room" }, { status: 403 });
  }

  await ref.set({ closed: true }, { merge: true });
  return NextResponse.json({ ok: true });
}

function validateRoomState(body: unknown): string | null {
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
