import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";
import { compressAvatarDataUrl, fetchAndCompressAvatar, resolvePhotoSrc } from "@/lib/avatar";

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

  // Self-heal: a doc created before avatar compression existed (or whose compression failed at
  // the time) has no photo.defaultBytes yet — retry now.
  if (!Buffer.isBuffer(profile.photo?.defaultBytes) && !Buffer.isBuffer(profile.photoBytes) && session.user.image) {
    const defaultBytes = await fetchAndCompressAvatar(session.user.image);
    if (defaultBytes) {
      const existingPhoto = profile.photo ?? {};
      const photo = {
        ...existingPhoto,
        defaultBytes,
        gmailUrl: session.user.image,
        currentBytes: Buffer.isBuffer(existingPhoto.bytes) ? existingPhoto.bytes : defaultBytes,
      };
      await docRef.set({ photo }, { merge: true });
      profile = { ...profile, photo };
    }
  }

  return NextResponse.json({ exists: true, profile: { ...profile, photoURL: resolvePhotoSrc(profile) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { username, displayName } = await request.json();
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

  const defaultBytes = session.user.image ? await fetchAndCompressAvatar(session.user.image) : null;

  await docRef.set(
    {
      username,
      usernameKey,
      displayName: typeof displayName === "string" && displayName.trim() ? displayName.trim() : username,
      email: session.user.email ?? null,
      ...(defaultBytes
        ? { photo: { defaultBytes, gmailUrl: session.user.image ?? null, currentBytes: defaultBytes } }
        : {}),
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
    // Drop the custom upload and point currentBytes back at the Google photo; refresh that
    // default first in case it was never captured or Google's has changed.
    const existingPhoto = doc.data()?.photo ?? {};
    const gmailUrl = existingPhoto.gmailUrl ?? session.user.image ?? null;
    const defaultBytes = gmailUrl ? await fetchAndCompressAvatar(gmailUrl) : null;
    photoUpdate = {
      "photo.bytes": FieldValue.delete(),
      ...(defaultBytes
        ? { "photo.defaultBytes": defaultBytes, "photo.gmailUrl": gmailUrl, "photo.currentBytes": defaultBytes }
        : { "photo.currentBytes": FieldValue.delete() }),
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
