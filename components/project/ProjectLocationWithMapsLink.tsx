import { MapPin } from 'lucide-react';
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';

/** Google Maps search URL for a pincode or place name. */
export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const CHECK_LOCATION_CLASS =
  'text-[#387ed1] hover:underline cursor-pointer font-medium text-sm inline-flex items-center gap-1';

const CHECK_LOCATION_CARD_CLASS =
  'text-[#387ed1] hover:underline text-xs font-medium ml-2 inline-flex items-center gap-1 shrink-0';

function mapsHref(pincode?: string | null, placeName?: string | null): string | null {
  const query = (pincode ?? '').trim() || (placeName ?? '').trim();
  if (!query) return null;
  return googleMapsSearchUrl(query);
}

function stopCardNavigation(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Compact "Check Location" control for feed/project cards.
 * Uses pincode (preferred) or place name for Maps; never shows raw pincode digits.
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(CHECK_LOCATION_CARD_CLASS, className)}
      title="Open location on Google Maps"
      onClick={stopCardNavigation}
    >
      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
      Check Location
    </a>
  );
}

/**
 * Location display with a "Check Location" Google Maps link.
 * Pincode stays in the href only — never shown as raw digits in the UI.
 * Example: Barpeta • Check Location
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
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={CHECK_LOCATION_CLASS}
          title="Open location on Google Maps"
          onClick={stopCardNavigation}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Check Location
        </a>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(CHECK_LOCATION_CLASS, className)}
      title="Open location on Google Maps"
      onClick={stopCardNavigation}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Check Location
    </a>
  );
}

export function isLocationSpecLabel(label: string): boolean {
  return (
    label === 'Location' ||
    label === 'Project Address' ||
    label === 'Village / Town Name'
  );
}
