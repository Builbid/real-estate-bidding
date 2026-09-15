import type { ReactNode } from 'react';
import type { ServiceType } from '@/lib/types';

const ICON_CLASS = 'h-10 w-10 sm:h-11 sm:w-11';

function Svg({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={ICON_CLASS}
      fill="none"
      aria-hidden
      role="img"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

function MistriHelmetIcon() {
  return (
    <Svg title="Mistri Worker">
      <ellipse cx="32" cy="46" rx="22" ry="5.5" fill="#C2410C" />
      <path d="M10 42c0-16.5 10-26 22-26s22 9.5 22 26H10Z" fill="#EA580C" />
      <path d="M28 12h8c1.7 0 3 1.3 3 3v8h-14v-8c0-1.7 1.3-3 3-3Z" fill="#C2410C" />
      <path d="M14 42h36" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function DrawingCompassIcon() {
  return (
    <Svg title="Drawing and Design">
      <circle cx="32" cy="14" r="5" fill="#6366F1" />
      <path d="M32 19 16 52" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 19 48 52" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="52" r="3.5" fill="#818CF8" />
      <circle cx="48" cy="52" r="3.5" fill="#A5B4FC" />
      <path d="M22 40h20" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function PainterPaletteIcon() {
  return (
    <Svg title="Painter">
      <path
        d="M32 10c12.7 0 22 9.4 22 22 0 7.4-4.6 12-10.5 12-3.2 0-5.5-2.2-5.5-5.2 0-1.6.7-3 1.8-4.1.9-.9 1.2-2.2.6-3.4C39.4 29 37.2 28 34.8 28H32C20.4 28 12 21.4 12 13.5 12 11.6 21.3 10 32 10Z"
        fill="#EC4899"
      />
      <circle cx="26" cy="20" r="3.2" fill="#FDE68A" />
      <circle cx="36" cy="18" r="3.2" fill="#38BDF8" />
      <circle cx="42" cy="26" r="3.2" fill="#86EFAC" />
      <circle cx="22" cy="28" r="2.8" fill="#FB923C" />
    </Svg>
  );
}

function PlumberTapIcon() {
  return (
    <Svg title="Plumber">
      <path d="M12 22h22c3 0 6 2.4 6 6.5V34H34v-4H16v10h-4V22Z" fill="#0284C7" />
      <rect x="8" y="18" width="16" height="8" rx="2" fill="#0369A1" />
      <path d="M38 30h10l4 8H38v-8Z" fill="#0EA5E9" />
      <path d="M44 38c0 6-3 12-8 16" stroke="#06B6D4" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="34" cy="56" r="3" fill="#67E8F9" />
    </Svg>
  );
}

function ElectricianFlashIcon() {
  return (
    <Svg title="Electrician">
      <path d="M36 6 16 34h14l-4 24 24-32H34l2-20Z" fill="#EAB308" />
      <path d="M36 6 22 30h10l-2 16 14-20H32l4-20Z" fill="#FACC15" />
    </Svg>
  );
}

function EarthworkDumperIcon() {
  return (
    <Svg title="Earthwork">
      <rect x="6" y="24" width="18" height="16" rx="2.5" fill="#CA8A04" />
      <path d="M10 26h10v8H12c-1.1 0-2-.9-2-2v-6Z" fill="#FEF3C7" />
      <path d="M26 18h28l-4 22H26V18Z" fill="#EAB308" />
      <path d="M26 18h24l2 8H26V18Z" fill="#FACC15" />
      <rect x="24" y="38" width="6" height="6" fill="#A16207" />
      <circle cx="16" cy="48" r="6" fill="#334155" />
      <circle cx="16" cy="48" r="2.4" fill="#94A3B8" />
      <circle cx="44" cy="48" r="6" fill="#334155" />
      <circle cx="44" cy="48" r="2.4" fill="#94A3B8" />
    </Svg>
  );
}

function ConstructionFirmIcon() {
  return (
    <Svg title="Construction Firm">
      <rect x="10" y="18" width="18" height="32" rx="2" fill="#2563EB" />
      <rect x="32" y="10" width="22" height="40" rx="2" fill="#3B82F6" />
      <rect x="14" y="24" width="4" height="4" fill="#BFDBFE" />
      <rect x="20" y="24" width="4" height="4" fill="#BFDBFE" />
      <rect x="14" y="32" width="4" height="4" fill="#BFDBFE" />
      <rect x="20" y="32" width="4" height="4" fill="#BFDBFE" />
      <rect x="36" y="16" width="4" height="4" fill="#DBEAFE" />
      <rect x="44" y="16" width="4" height="4" fill="#DBEAFE" />
      <rect x="36" y="24" width="4" height="4" fill="#DBEAFE" />
      <rect x="44" y="24" width="4" height="4" fill="#DBEAFE" />
      <rect x="36" y="32" width="4" height="4" fill="#DBEAFE" />
      <rect x="44" y="32" width="4" height="4" fill="#DBEAFE" />
    </Svg>
  );
}

const CATEGORY_ICONS: Record<ServiceType, () => ReactNode> = {
  labour_contractor: MistriHelmetIcon,
  construction_firm: ConstructionFirmIcon,
  drawing_design: DrawingCompassIcon,
  painter: PainterPaletteIcon,
  plumber: PlumberTapIcon,
  electrician: ElectricianFlashIcon,
  earthwork: EarthworkDumperIcon,
  carpenter: MistriHelmetIcon,
  false_ceiling_work: PainterPaletteIcon,
};

export function CategoryServiceIcon({ service }: { service: ServiceType }) {
  const Icon = CATEGORY_ICONS[service] ?? MistriHelmetIcon;
  return <Icon />;
}
