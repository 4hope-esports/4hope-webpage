import sharp from "sharp";

export const AVATAR_CONTENT_TYPE = "image/webp";
const AVATAR_DIMENSION = 128;

/**
 * Decodes a Firestore-stored avatar into a displayable src. `photo.currentBytes` always holds
 * a copy of whichever image is currently active (the custom upload in `photo.bytes`, or the
 * compressed Google photo in `photo.defaultBytes`) so this never has to choose between them;
 * falls back to a legacy top-level `photoBytes`/`photoURL` for docs written before the `photo`
 * object existed.
 */
export function resolvePhotoSrc(profile: FirebaseFirestore.DocumentData): string | null {
  const photo = profile.photo ?? {};
  if (Buffer.isBuffer(photo.currentBytes)) {
    return `data:${AVATAR_CONTENT_TYPE};base64,${photo.currentBytes.toString("base64")}`;
  }
  if (Buffer.isBuffer(profile.photoBytes)) {
    return `data:${AVATAR_CONTENT_TYPE};base64,${profile.photoBytes.toString("base64")}`;
  }
  return profile.photoURL ?? null;
}

/** Downloads a profile photo (e.g. Google's) and compresses it to a small square WebP buffer for Firestore storage. */
export async function fetchAndCompressAvatar(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { Referer: "" } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();

    return await sharp(Buffer.from(arrayBuffer))
      .resize(AVATAR_DIMENSION, AVATAR_DIMENSION, { fit: "cover" })
      .webp({ quality: 70 })
      .toBuffer();
  } catch (error) {
    console.error("Failed to fetch/compress avatar", error);
    return null;
  }
}

/** Compresses a user-uploaded (already square-cropped) image data URL into a small WebP buffer for Firestore storage. */
export async function compressAvatarDataUrl(dataUrl: string): Promise<Buffer | null> {
  try {
    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    const input = Buffer.from(match[1], "base64");

    return await sharp(input)
      .resize(AVATAR_DIMENSION, AVATAR_DIMENSION, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error("Failed to compress avatar", error);
    return null;
  }
}

export const TEAM_LOGO_CONTENT_TYPE = "image/webp";
const TEAM_LOGO_DIMENSION = 256;

/** Decodes a Firestore-stored team logo (compressed Buffer) into a displayable src. */
export function resolveTeamLogoSrc(team: FirebaseFirestore.DocumentData): string | null {
  if (Buffer.isBuffer(team.logoBytes)) {
    return `data:${TEAM_LOGO_CONTENT_TYPE};base64,${team.logoBytes.toString("base64")}`;
  }
  return null;
}

/** Compresses a user-uploaded (already square-cropped) image data URL into a small WebP buffer for Firestore storage. */
export async function compressTeamLogo(dataUrl: string): Promise<Buffer | null> {
  try {
    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    const input = Buffer.from(match[1], "base64");

    return await sharp(input)
      .resize(TEAM_LOGO_DIMENSION, TEAM_LOGO_DIMENSION, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error("Failed to compress team logo", error);
    return null;
  }
}
