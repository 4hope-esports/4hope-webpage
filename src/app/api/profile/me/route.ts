import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { compressAvatarDataUrl, resolvePhotoSrc } from "@/lib/avatar";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const docRef = getAdminDb().collection(envCollection("users")).doc(session.user.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return NextResponse.json({
      exists: false,
      account: {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        picture: session.user.image ?? null,
      },
    });
  }

  let profile = doc.data()!;

  // Self-heal: keep the recorded Gmail photo URL current even though it's not used for display.
  if (session.user.image && profile.photo?.gmailUrl !== session.user.image) {
    const photo = { ...(profile.photo ?? {}), gmailUrl: session.user.image };
    await docRef.set({ photo }, { merge: true });
    profile = { ...profile, photo };
  }

  return NextResponse.json({ exists: true, profile: { ...profile, photoURL: resolvePhotoSrc(profile) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { username, displayName, photoDataUrl } = await request.json();
  if (!username || typeof username !== "string" || !/^[A-Za-z0-9_-]{1,24}$/.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const usersCol = getAdminDb().collection(envCollection("users"));
  const usernameKey = username.toLowerCase();
  const dupe = await usersCol.where("usernameKey", "==", usernameKey).limit(1).get();
  if (!dupe.empty && dupe.docs[0].id !== session.user.id) {
    return NextResponse.json({ error: "That player name is already taken." }, { status: 409 });
  }

  const docRef = usersCol.doc(session.user.id);

  const customBytes = typeof photoDataUrl === "string" && photoDataUrl ? await compressAvatarDataUrl(photoDataUrl) : null;

  await docRef.set(
    {
      username,
      usernameKey,
      displayName: typeof displayName === "string" && displayName.trim() ? displayName.trim() : username,
      email: session.user.email ?? null,
      photo: {
        gmailUrl: session.user.image ?? null,
        ...(customBytes ? { bytes: customBytes, currentBytes: customBytes } : {}),
      },
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { displayName, photoDataUrl, removePhoto } = await request.json();
  if (typeof displayName !== "string" || !displayName.trim()) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  const docRef = getAdminDb().collection(envCollection("users")).doc(session.user.id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let photoUpdate: Record<string, unknown> = {};
  if (typeof photoDataUrl === "string" && photoDataUrl) {
    const bytes = await compressAvatarDataUrl(photoDataUrl);
    if (bytes) photoUpdate = { "photo.bytes": bytes, "photo.currentBytes": bytes };
  } else if (removePhoto) {
    // Drop the custom upload; with no currentBytes left, the client falls back to the clover mark.
    photoUpdate = {
      "photo.bytes": FieldValue.delete(),
      "photo.currentBytes": FieldValue.delete(),
    };
  }

  await docRef.set(
    {
      displayName: displayName.trim(),
    },
    { merge: true },
  );
  if (Object.keys(photoUpdate).length > 0) {
    await docRef.update(photoUpdate);
  }

  return NextResponse.json({ ok: true });
}
