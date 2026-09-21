import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { RIOT_SERVERS } from "@/api/riot/account";

export const dynamic = "force-dynamic";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 200_000;
const MAX_ROUNDS = 40;
const MAX_EDITOR_SESSIONS = 200;
const MAX_PARTICIPANTS = 200;
const MAX_ACTIVE_LOBBIES_PER_OWNER = 3;
const MAX_DESCRIPTION_LENGTH = 2000;
const STATUSES = ["open", "live", "ended"] as const;
const GAMES = ["League of Legends", "TFT"] as const;
const RIOT_SERVER_VALUES = RIOT_SERVERS.map((s) => s.value) as string[];

/**
 * A lobby's roster and its scoreboard used to be two separate arrays
 * (`participants[]` + `players[]`) linked only by a derived id — every join,
 * approve, add, rename, and leave path had to remember to keep both in sync,
 * and more than one of them didn't. `people[]` is the single source of
 * truth now, on the wire and in Firestore: one record per person, `isPlayer`
 * marks whether they're currently shown on the board.
 */
interface Person {
  id: string;
  sessionId: string;
  userId?: string;
  name: string;
  email?: string;
  photoURL?: string | null;
  gameName?: string;
  tagLine?: string;
  server?: string;
  region?: string;
  approvalStatus?: "pending" | "approved";
  isPlayer: boolean;
}

function isValidLobbyId(value: string) {
  return GUID_RE.test(value);
}

function isValidGuid(value: unknown): value is string {
  return typeof value === "string" && GUID_RE.test(value);
}

function boardIdFor(p: { userId?: string; sessionId: string }) {
  return "p" + (p.userId || p.sessionId);
}

function getPeople(existing: Record<string, unknown>): Person[] {
  return Array.isArray(existing.people) ? (existing.people as Person[]) : [];
}

/**
 * Strips each person's `sessionId` before a lobby doc goes out over the wire.
 * It's the anonymous write-credential a browser uses to prove "this board row
 * is mine" (see the leave action below) — leaking it in a public GET response
 * would let anyone holding the lobby link read another participant's
 * credential and act as them. The client already has its own sessionId
 * locally; `id` is the unique key everything UI-facing needs.
 */
function sanitizePeopleForResponse(people: Person[]): Omit<Person, "sessionId">[] {
  return people.map(({ sessionId: _sessionId, ...rest }) => {
    void _sessionId;
    return rest;
  });
}

/**
 * Reconciles a client-submitted `people[]` write against what's already
 * stored so a bulk board edit (rename/add/remove a row) can never plant a
 * `userId`/`email` identity claim. Those two fields may only ever be set by
 * the dedicated join action below, which derives them from the caller's own
 * verified session — never trust them coming back from a client write, even
 * from the host's own edit-token session.
 */
function reconcilePeopleIdentity(existingPeople: Person[], incoming: Person[]): Person[] {
  const byId = new Map(existingPeople.map((p) => [p.id, p]));
  return incoming.map((p) => {
    const prior = byId.get(p.id);
    const next: Person = { ...p };
    if (prior?.userId) next.userId = prior.userId;
    else delete next.userId;
    if (prior?.email) next.email = prior.email;
    else delete next.email;
    return next;
  });
}

/** Fully removes a person (leave / reject) — drops their board row, order entry, and scores. */
function removePerson(existing: Record<string, unknown>, people: Person[], personId: string): Record<string, unknown> {
  const update: Record<string, unknown> = { people: people.filter((p) => p.id !== personId) };
  if (Array.isArray(existing.order) && (existing.order as string[]).includes(personId)) {
    update.order = (existing.order as string[]).filter((id) => id !== personId);
  }
  if (existing.scores && typeof existing.scores === "object" && personId in (existing.scores as object)) {
    // A merge write doesn't drop keys just by omitting them — this sentinel
    // is what actually deletes the one nested field, leaving the rest of
    // the `scores` map (and every other field in this write) untouched.
    update.scores = { [personId]: FieldValue.delete() };
  }
  return update;
}

/** Adds a person's id to `order` if they're not in it yet — used when a server-side action (approve, self-join) promotes someone onto the board without the client having sent its own `order` write. */
function appendToOrder(existing: Record<string, unknown>, personId: string): string[] | undefined {
  const existingOrder = Array.isArray(existing.order) ? (existing.order as string[]) : [];
  return existingOrder.includes(personId) ? undefined : [...existingOrder, personId];
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
  const { editToken: _editToken, editorSessionIds: _editorSessionIds, ...rest } = data;
  void _editToken;
  void _editorSessionIds;
  const publicData: Record<string, unknown> = { ...rest, people: sanitizePeopleForResponse(getPeople(data)) };

  // Open-state visibility: non-authors see the roster (`people`) only, not
  // the score table, until the author starts the lobby (status -> "live").
  if (!isEditor && data.status === "open") {
    const { scores: _scores, order: _order, ...openData } = publicData;
    void _scores;
    void _order;
    return NextResponse.json({ data: openData, isEditor });
  }

  return NextResponse.json({ data: publicData, isEditor });
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
    // Ownership is never taken from the client — hosting a lobby requires a
    // real session, and the owner is always *this* session's user id, never
    // whatever `meta.ownerUserId` the request body claims.
    const session = await auth();
    const ownerUserId = session?.user?.id;
    if (!ownerUserId) {
      return NextResponse.json({ error: "login required to create a lobby" }, { status: 401 });
    }
    const meta = validateLobbyMeta(b.meta);
    if (typeof meta === "string") return NextResponse.json({ error: meta }, { status: 400 });
    const stateError = validateLobbyState(b.state);
    if (stateError) return NextResponse.json({ error: stateError }, { status: 400 });

    const ownedSnap = await getAdminDb()
      .collection(envCollection("lobbies"))
      .where("ownerUserId", "==", ownerUserId)
      .get();
    const activeCount = ownedSnap.docs.filter((d) => d.data().status !== "ended").length;
    if (activeCount >= MAX_ACTIVE_LOBBIES_PER_OWNER) {
      return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 409 });
    }

    const authorParticipates = meta.authorParticipates === true;
    let people: Person[] = authorParticipates
      ? [
          {
            id: boardIdFor({ sessionId: sessionId as string }),
            sessionId: sessionId as string,
            name: meta.authorName as string,
            photoURL: (meta.authorPhotoURL as string | null) ?? null,
            approvalStatus: "approved",
            isPlayer: false,
          },
        ]
      : [];
    if (b.people !== undefined) {
      const peopleError = validatePeople(b.people);
      if (peopleError) return NextResponse.json({ error: peopleError }, { status: 400 });
      // Nothing has "really" joined yet at creation time — no incoming row
      // may claim an existing identity (see reconcilePeopleIdentity).
      people = reconcilePeopleIdentity(people, b.people as Person[]);
    }

    await ref.set({
      ...meta,
      ownerUserId,
      visibility: "public",
      status: "open",
      authorSessionId: sessionId,
      people,
      createdAt: new Date().toISOString(),
      ...((b.state as object) ?? {}),
      editToken: b.editToken,
      editorSessionIds: [sessionId],
      closed: false,
    });
    return NextResponse.json({ ok: true });
  }

  const existing = snap.data() as Record<string, unknown>;
  const isTokenAuthor = isValidGuid(b.editToken) && existing.editToken === b.editToken;
  let isOwner = false;
  if (!isTokenAuthor && typeof existing.ownerUserId === "string") {
    const session = await auth();
    isOwner = session?.user?.id === existing.ownerUserId;
  }
  if (!isTokenAuthor && !isOwner) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  if (existing.closed || existing.status === "ended") {
    return NextResponse.json({ error: "lobby is closed" }, { status: 409 });
  }

  const update: Record<string, unknown> = {};

  if (b.meta !== undefined) {
    // Lobby details (name, region, server, capacity, schedule, description)
    // can only change while the lobby is still open — once it's live the
    // roster/board are built around what was announced.
    if (existing.status !== "open") {
      return NextResponse.json({ error: "lobby details can only be edited before it starts" }, { status: 409 });
    }
    const metaUpdate = validatePartialLobbyMeta(b.meta);
    if (typeof metaUpdate === "string") return NextResponse.json({ error: metaUpdate }, { status: 400 });
    Object.assign(update, metaUpdate);
  }

  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    update.status = b.status;
    if (b.status === "ended") update.closed = true;
  }

  if (b.state !== undefined || b.people !== undefined) {
    if (b.state !== undefined) {
      const stateError = validateLobbyState(b.state);
      if (stateError) return NextResponse.json({ error: stateError }, { status: 400 });
      Object.assign(update, b.state as object);
    }
    if (b.people !== undefined) {
      const peopleError = validatePeople(b.people);
      if (peopleError) return NextResponse.json({ error: peopleError }, { status: 400 });
      update.people = reconcilePeopleIdentity(getPeople(existing), b.people as Person[]);
    }

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
  if (!isValidGuid(sessionId)) {
    return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
  }

  const ref = lobbyRef(lobbyId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "lobby not found" }, { status: 404 });
  }
  const existing = snap.data() as Record<string, unknown>;
  const people = getPeople(existing);

  if (b.leave === true) {
    // Participants can only leave while the lobby is still open — once it's
    // live the roster is locked into the scoring board, same as joining.
    if (existing.status !== "open") {
      return NextResponse.json({ error: "lobby is not open" }, { status: 409 });
    }
    const session = await auth();
    const userId = session?.user?.id;
    const isMe = (p: { userId?: string; sessionId: string }) => (userId && p.userId === userId) || p.sessionId === sessionId;
    const target = people.find(isMe);
    const update = target ? removePerson(existing, people, target.id) : { people };
    await ref.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "approve" || b.action === "reject") {
    // Only the host can approve/reject — same dual auth (edit token or
    // signed-in owner) used everywhere else a host-only action is gated.
    const isTokenAuthor = isValidGuid(b.editToken) && existing.editToken === b.editToken;
    let isOwner = false;
    if (!isTokenAuthor && typeof existing.ownerUserId === "string") {
      const session = await auth();
      isOwner = session?.user?.id === existing.ownerUserId;
    }
    if (!isTokenAuthor && !isOwner) {
      return NextResponse.json({ error: "only the host can approve or reject participants" }, { status: 403 });
    }
    const targetUserId = b.targetUserId;
    if (typeof targetUserId !== "string" || !targetUserId.trim()) {
      return NextResponse.json({ error: "invalid targetUserId" }, { status: 400 });
    }
    const target = people.find((p) => p.userId === targetUserId);
    if (!target) {
      return NextResponse.json({ error: "participant not found" }, { status: 404 });
    }
    if (b.action === "approve") {
      // Approving puts them on the scoreboard too — a host shouldn't have to
      // separately review a request AND remember to add the same person to
      // the board.
      const nextPeople = people.map((p) => (p.id === target.id ? { ...p, approvalStatus: "approved" as const, isPlayer: true } : p));
      const update: Record<string, unknown> = { people: nextPeople };
      const nextOrder = appendToOrder(existing, target.id);
      if (nextOrder) update.order = nextOrder;
      await ref.set(update, { merge: true });
      return NextResponse.json({ ok: true });
    }
    // Reject: drop them entirely (frees their capacity slot, clears any board
    // row), and remember them as blocked so they can't just request to join
    // again. Never surfaced publicly — a rejected participant simply
    // disappears from the visible list.
    const blockedUserIds = Array.isArray(existing.blockedUserIds) ? (existing.blockedUserIds as string[]) : [];
    const update: Record<string, unknown> = {
      ...removePerson(existing, people, target.id),
      blockedUserIds: blockedUserIds.includes(targetUserId) ? blockedUserIds : [...blockedUserIds, targetUserId],
    };
    await ref.set(update, { merge: true });
    return NextResponse.json({ ok: true });
  }

  // Joining requires a signed-in account — participation is tracked by the
  // real user id (not the anonymous per-browser sessionId) so "already
  // joined" / "blocked after rejection" hold up across devices and tabs.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "login required to join" }, { status: 401 });
  }

  const name = b.name;
  if (typeof name !== "string" || !name.trim() || name.length > 60) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }
  if (b.server !== undefined && b.server !== null && !RIOT_SERVER_VALUES.includes(b.server as string)) {
    return NextResponse.json({ error: "invalid server" }, { status: 400 });
  }
  if (existing.status !== "open") {
    return NextResponse.json({ error: "lobby is not open for joining" }, { status: 409 });
  }
  if (people.some((p) => p.userId === userId)) {
    return NextResponse.json({ ok: true });
  }
  const blockedUserIds = Array.isArray(existing.blockedUserIds) ? (existing.blockedUserIds as string[]) : [];
  if (blockedUserIds.includes(userId)) {
    return NextResponse.json({ error: "you've been removed from this lobby and can't request to join again" }, { status: 403 });
  }
  // A name already on the roster — host-added or a real participant — can't
  // be reused. Names aren't identity: anyone can see and retype one from the
  // Participants list, so a match here is just a naming collision, not proof
  // this is the same person. Reject and ask for a different name instead of
  // merging into (and inheriting the approval of) someone else's record.
  const nameLower = name.trim().toLowerCase();
  if (people.some((p) => p.name.trim().toLowerCase() === nameLower)) {
    return NextResponse.json({ error: "That name is already taken in this lobby — try a different one." }, { status: 409 });
  }
  const limit = typeof existing.limit === "number" ? existing.limit : MAX_PARTICIPANTS;
  if (people.length >= limit) {
    return NextResponse.json({ error: "lobby is full" }, { status: 409 });
  }

  // The host joining their own lobby needs no approval — everyone else starts
  // pending until the host explicitly approves them.
  const isHost = userId === existing.ownerUserId;
  const email = typeof session.user?.email === "string" ? session.user.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "your account has no usable email" }, { status: 400 });
  }
  const approvalStatus: "approved" | "pending" = isHost ? "approved" : "pending";
  const newId = boardIdFor({ userId, sessionId: sessionId as string });
  const participant: Person = {
    id: newId,
    sessionId: sessionId as string,
    userId,
    name: name.trim(),
    email,
    approvalStatus,
    isPlayer: approvalStatus === "approved",
  };
  if (typeof b.gameName === "string" && b.gameName.trim()) participant.gameName = b.gameName.trim().slice(0, 40);
  if (typeof b.tagLine === "string" && b.tagLine.trim()) participant.tagLine = b.tagLine.trim().slice(0, 10);
  if (typeof b.server === "string" && b.server) participant.server = b.server;
  if (typeof b.region === "string" && b.region.trim()) participant.region = b.region.trim().slice(0, 40);

  const update: Record<string, unknown> = { people: [...people, participant] };
  // The host joining their own lobby (or anyone auto-approved) goes straight
  // onto the board too — same rule as the explicit approve action above.
  if (participant.isPlayer) {
    const nextOrder = appendToOrder(existing, newId);
    if (nextOrder) update.order = nextOrder;
  }
  await ref.set(update, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  if (!isValidLobbyId(lobbyId)) {
    return NextResponse.json({ error: "invalid lobby id" }, { status: 400 });
  }

  const ref = lobbyRef(lobbyId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ ok: true });
  }
  const existing = snap.data() as Record<string, unknown>;

  const token = req.nextUrl.searchParams.get("token");
  const isTokenAuthor =
    isValidGuid(token) &&
    existing.editToken === token &&
    existing.authorSessionId === req.nextUrl.searchParams.get("sessionId");

  let isOwner = false;
  if (!isTokenAuthor && typeof existing.ownerUserId === "string") {
    const session = await auth();
    isOwner = session?.user?.id === existing.ownerUserId;
  }

  if (!isTokenAuthor && !isOwner) {
    return NextResponse.json({ error: "only the lobby author can delete the lobby" }, { status: 403 });
  }

  // Permanent delete — no soft-close. Anyone still viewing the lobby (or holding
  // its share link) will get "lobby not found" immediately, not a frozen final view.
  await ref.delete();
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
  if (b.game !== undefined && !GAMES.includes(b.game as (typeof GAMES)[number])) return "invalid game";
  if (b.riotServer !== undefined && b.riotServer !== null && !RIOT_SERVER_VALUES.includes(b.riotServer as string)) {
    return "invalid riotServer";
  }
  if (b.limit !== undefined) {
    if (typeof b.limit !== "number" || !Number.isFinite(b.limit) || b.limit < 2 || b.limit > MAX_PARTICIPANTS) {
      return "invalid limit";
    }
  }
  if (b.description !== undefined && b.description !== null) {
    if (typeof b.description !== "string" || b.description.length > MAX_DESCRIPTION_LENGTH) return "invalid description";
  }
  if (b.authorParticipates !== undefined && typeof b.authorParticipates !== "boolean") {
    return "invalid authorParticipates";
  }
  return {
    name: b.name.trim(),
    region: b.region.trim(),
    authorName: b.authorName.trim(),
    authorPhotoURL: b.authorPhotoURL ?? null,
    scheduledStartTime: b.scheduledStartTime ?? null,
    game: b.game ?? "TFT",
    riotServer: b.riotServer ?? null,
    limit: b.limit ?? MAX_PARTICIPANTS,
    description: typeof b.description === "string" ? b.description.trim() : "",
    authorParticipates: b.authorParticipates ?? false,
  };
}

/** Same field rules as validateLobbyMeta, but for a post-creation edit where every field is optional. */
function validatePartialLobbyMeta(body: unknown): Record<string, unknown> | string {
  if (typeof body !== "object" || body === null) return "meta must be an object";
  const b = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (b.name !== undefined) {
    if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 80) return "invalid lobby name";
    update.name = b.name.trim();
  }
  if (b.region !== undefined) {
    if (typeof b.region !== "string" || !b.region.trim() || b.region.length > 40) return "invalid region";
    update.region = b.region.trim();
  }
  if (b.scheduledStartTime !== undefined) {
    if (b.scheduledStartTime !== null) {
      if (typeof b.scheduledStartTime !== "string" || Number.isNaN(new Date(b.scheduledStartTime).getTime())) {
        return "invalid scheduled start time";
      }
    }
    update.scheduledStartTime = b.scheduledStartTime;
  }
  if (b.riotServer !== undefined) {
    if (b.riotServer !== null && !RIOT_SERVER_VALUES.includes(b.riotServer as string)) return "invalid riotServer";
    update.riotServer = b.riotServer;
  }
  if (b.limit !== undefined) {
    if (typeof b.limit !== "number" || !Number.isFinite(b.limit) || b.limit < 2 || b.limit > MAX_PARTICIPANTS) {
      return "invalid limit";
    }
    update.limit = b.limit;
  }
  if (b.description !== undefined) {
    if (b.description !== null && (typeof b.description !== "string" || b.description.length > MAX_DESCRIPTION_LENGTH)) {
      return "invalid description";
    }
    update.description = typeof b.description === "string" ? b.description.trim() : "";
  }
  return update;
}

/** Validates a bulk `people[]` write — sent whenever the host edits the board (rename/add/toggle a row) or the roster changes client-side. */
function validatePeople(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > MAX_PARTICIPANTS) return "invalid people";
  const seenIds = new Set<string>();
  for (const p of value) {
    if (typeof p !== "object" || p === null) return "invalid person entry";
    const person = p as Record<string, unknown>;
    if (typeof person.id !== "string" || !person.id || person.id.length > 80) return "invalid person id";
    if (seenIds.has(person.id)) return "duplicate person id";
    seenIds.add(person.id);
    if (typeof person.sessionId !== "string" || !person.sessionId) return "invalid person sessionId";
    if (typeof person.name !== "string" || !person.name.trim() || person.name.length > 60) return "invalid person name";
    if (typeof person.isPlayer !== "boolean") return "invalid person isPlayer";
    if (person.userId !== undefined && typeof person.userId !== "string") return "invalid person userId";
    if (person.email !== undefined && typeof person.email !== "string") return "invalid person email";
    if (person.photoURL !== undefined && person.photoURL !== null && typeof person.photoURL !== "string") return "invalid person photoURL";
    if (person.gameName !== undefined && (typeof person.gameName !== "string" || person.gameName.length > 40)) return "invalid person gameName";
    if (person.tagLine !== undefined && (typeof person.tagLine !== "string" || person.tagLine.length > 10)) return "invalid person tagLine";
    if (person.server !== undefined && typeof person.server !== "string") return "invalid person server";
    if (person.region !== undefined && (typeof person.region !== "string" || person.region.length > 40)) return "invalid person region";
    if (person.approvalStatus !== undefined && person.approvalStatus !== "pending" && person.approvalStatus !== "approved") {
      return "invalid person approvalStatus";
    }
  }
  return null;
}

function validateLobbyState(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "state must be an object";
  const b = body as Record<string, unknown>;

  if (b.order !== undefined) {
    if (!Array.isArray(b.order) || b.order.some((id) => typeof id !== "string")) return "invalid order";
  }
  if (b.roundCount !== undefined) {
    if (typeof b.roundCount !== "number" || b.roundCount < 1 || b.roundCount > MAX_ROUNDS) return "invalid roundCount";
  }
  if (b.rankMode !== undefined && b.rankMode !== "auto" && b.rankMode !== "manual") return "invalid rankMode";
  if (b.cutoffRank !== undefined && typeof b.cutoffRank !== "number") return "invalid cutoffRank";
  if (b.cutoffLabel !== undefined && (typeof b.cutoffLabel !== "string" || b.cutoffLabel.length > 120)) return "invalid cutoffLabel";
  if (b.prizeTiers !== undefined) {
    if (!Array.isArray(b.prizeTiers) || b.prizeTiers.length > MAX_PARTICIPANTS) return "invalid prizeTiers";
    for (const t of b.prizeTiers) if (typeof t !== "string" || t.length > 40) return "invalid prize tier";
  }

  return null;
}
