import { MapPin } from 'lucide-react';
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';

/** Google Maps search URL for a pincode or place name. */
export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const CHECK_LOCATION_LABEL = 'Check Location in google map';

const CHECK_LOCATION_CLASS =
  'relative z-10 appearance-none bg-transparent p-0 border-0 text-[#387ed1] hover:underline cursor-pointer font-medium text-sm inline-flex items-center gap-1';

const CHECK_LOCATION_CARD_CLASS =
  'relative z-10 appearance-none bg-transparent p-0 border-0 text-[#387ed1] hover:underline cursor-pointer text-xs font-medium ml-2 inline-flex items-center gap-1 shrink-0';

function mapsHref(pincode?: string | null, placeName?: string | null): string | null {
  const query = (pincode ?? '').trim() || (placeName ?? '').trim();
  if (!query) return null;
  return googleMapsSearchUrl(query);
}

function openMaps(event: MouseEvent<HTMLButtonElement>, href: string) {
  event.preventDefault();
  event.stopPropagation();
  window.open(href, '_blank', 'noopener,noreferrer');
}

/**
 * Compact Maps control for feed/project cards.
 * Button (not <a>) so hover never shows a native title/URL tooltip overlay.
 */
export function CheckLocationLink({
  placeName,
  pincode,
  className,
}: {
  placeName?: string | null;
  pincode?: string | null;
  className?: string;
}) {
  const href = mapsHref(pincode, placeName);
  if (!href) return null;

  return (
    <button
      type="button"
      className={cn(CHECK_LOCATION_CARD_CLASS, className)}
      aria-label={CHECK_LOCATION_LABEL}
      onClick={(event) => openMaps(event, href)}
    >
      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
      {CHECK_LOCATION_LABEL}
    </button>
  );
}

/**
 * Location display with a Google Maps control.
 * Pincode stays in the Maps query only — never shown as raw digits in the UI.
 */
export function ProjectLocationWithMapsLink({
  placeName,
  pincode,
  className,
}: {
  placeName: string;
  pincode?: string | null;
  className?: string;
}) {
  const place = placeName.trim();
  const pin = (pincode ?? '').trim();
  const href = mapsHref(pin, place);
  if (!place && !pin) return <span className={className}>—</span>;
  if (!href) return <span className={className}>{place || '—'}</span>;

  if (place) {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5', className)}>
        <span>{place}</span>
        <span className="text-muted-foreground" aria-hidden>
          •
        </span>
        <button
          type="button"
          className={CHECK_LOCATION_CLASS}
          aria-label={CHECK_LOCATION_LABEL}
          onClick={(event) => openMaps(event, href)}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {CHECK_LOCATION_LABEL}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn(CHECK_LOCATION_CLASS, className)}
      aria-label={CHECK_LOCATION_LABEL}
      onClick={(event) => openMaps(event, href)}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {CHECK_LOCATION_LABEL}
    </button>
  );
}

export function isLocationSpecLabel(label: string): boolean {
  return (
    label === 'Location' ||
    label === 'Project Address' ||
    label === 'Village / Town Name'
  );
}
