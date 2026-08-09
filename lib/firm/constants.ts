export const FIRM_LOGO_BUCKET = 'firm-logos';
export const FIRM_PORTFOLIO_BUCKET = 'firm-portfolio-photos';
export const FIRM_BROCHURE_BUCKET = 'firm-brochures';

export const FIRM_LOGO_MAX_BYTES = 3 * 1024 * 1024;
export const FIRM_PORTFOLIO_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const FIRM_BROCHURE_MAX_BYTES = 10 * 1024 * 1024;
export const FIRM_PORTFOLIO_MAX_ITEMS = 20;
export const FIRM_PORTFOLIO_MAX_PHOTOS = 10;

export const FIRM_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
export const FIRM_BROCHURE_ACCEPT =
  'application/pdf,image/jpeg,image/jpg,image/png,image/webp';

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

export function validateFirmBrochureFile(file: File): string | null {
  const allowed = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);
  if (!allowed.has(file.type)) {
    return 'Only PDF, JPG, PNG, or WebP files are allowed.';
  }
  if (file.size > FIRM_BROCHURE_MAX_BYTES) {
    return 'Brochure must be 10 MB or smaller.';
  }
  return null;
}

export function firmBrochureExtension(mimeType: string): 'pdf' | 'jpg' | 'png' | 'webp' {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

export function isFirmBrochurePdfUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.split('?')[0].toLowerCase().endsWith('.pdf');
}
