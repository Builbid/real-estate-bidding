export const AVATAR_BUCKET = 'builder-avatars';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Please upload a JPG, PNG, or WebP image.';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Image must be 2 MB or smaller.';
  }
  return null;
}
