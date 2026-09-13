import { cn } from '@/lib/utils';

/** Google Maps search URL for a pincode or place name. */
export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const PIN_LINK_CLASS =
  'text-[#387ed1] hover:underline cursor-pointer font-medium';

/**
 * Location display with a clickable Google Maps pincode link.
 * Example: Barpeta (781301) — pincode opens Maps in a new tab.
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
  const mapsQuery = pin || place;
  if (!place && !pin) return <span className={className}>—</span>;

  const href = googleMapsSearchUrl(mapsQuery);

  if (place && pin) {
    return (
      <span className={cn('inline', className)}>
        {place}{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={PIN_LINK_CLASS}
          title={`Open ${pin} on Google Maps`}
        >
          ({pin})
        </a>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(PIN_LINK_CLASS, className)}
      title="Open on Google Maps"
    >
      {place || pin}
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
