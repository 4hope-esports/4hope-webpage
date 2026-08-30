import sharp from "sharp";

export const AVATAR_CONTENT_TYPE = "image/webp";
const AVATAR_DIMENSION = 128;

/** Resizes+re-encodes image bytes into a small square WebP buffer for Firestore storage. */
async function compressImageBuffer(input: Buffer, dimension: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .resize(dimension, dimension, { fit: "cover" })
    .webp({ quality })
    .toBuffer();
}

/** Compresses a user-uploaded (already square-cropped) image data URL into a small WebP buffer. */
async function compressDataUrlImage(dataUrl: string, dimension: number, quality: number): Promise<Buffer | null> {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return compressImageBuffer(Buffer.from(match[1], "base64"), dimension, quality);
}

/**
 * Decodes a Firestore-stored avatar into a displayable src. `photo.currentBytes` holds the
 * user's custom upload, if any; with no custom upload this returns null and callers fall back
 * to the default clover mark instead of a Google photo. Falls back to a legacy top-level
 * `photoBytes`/`photoURL` for docs written before the `photo` object existed.
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

/** Compresses a user-uploaded (already square-cropped) image data URL into a small WebP buffer for Firestore storage. */
export async function compressAvatarDataUrl(dataUrl: string): Promise<Buffer | null> {
  try {
    return await compressDataUrlImage(dataUrl, AVATAR_DIMENSION, 80);
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
    return await compressDataUrlImage(dataUrl, TEAM_LOGO_DIMENSION, 80);
  } catch (error) {
    console.error("Failed to compress team logo", error);
    return null;
  }
}
