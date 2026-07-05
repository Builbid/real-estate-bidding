export const FIRM_LOGO_BUCKET = 'firm-logos';
export const FIRM_PORTFOLIO_BUCKET = 'firm-portfolio-photos';

export const FIRM_LOGO_MAX_BYTES = 3 * 1024 * 1024;
export const FIRM_PORTFOLIO_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const FIRM_PORTFOLIO_MAX_ITEMS = 20;
export const FIRM_PORTFOLIO_MAX_PHOTOS = 10;

export const FIRM_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

export function validateFirmImageFile(file: File, maxBytes: number): string | null {
  const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowed.has(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.';
  }
  if (file.size > maxBytes) {
    return `Image must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`;
  }
  return null;
}
