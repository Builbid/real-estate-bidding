export const BUILDER_PORTFOLIO_BUCKET = 'builder-portfolio-photos';

export const BUILDER_PORTFOLIO_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const BUILDER_PORTFOLIO_MAX_ITEMS = 20;
export const BUILDER_PORTFOLIO_MAX_PHOTOS = 10;

export const BUILDER_PORTFOLIO_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

export function validateBuilderPortfolioImage(file: File): string | null {
  const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowed.has(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.';
  }
  if (file.size > BUILDER_PORTFOLIO_PHOTO_MAX_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}
