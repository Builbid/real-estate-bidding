import type { FirmConstructionPackage, FirmPackageCategoryKey } from '@/lib/types';

export const MIN_CATEGORY_LENGTH = 10;
export const MIN_PACKAGE_NAME_LENGTH = 2;
export const MAX_PACKAGES = 10;

export interface PackageCategoryDef {
  key: FirmPackageCategoryKey;
  label: string;
  hint: string;
}

// Categories derived from spec sheets published by Longitude Constructions,
// Brick&Bolt, BrikmyHome (Guwahati) and Constracorp (Assam) — the common
// structure clients expect when comparing turnkey construction packages.
export const PACKAGE_CATEGORIES: PackageCategoryDef[] = [
  {
    key: 'structure',
    label: 'Structure',
    hint: 'e.g. TATA/Jindal TMT steel, 53-grade cement, M20 concrete, 10ft ceiling height, 3ft plinth',
  },
  {
    key: 'flooring',
    label: 'Flooring',
    hint: 'e.g. Vitrified tiles up to ₹65/sqft (living/bedroom), granite staircase, anti-skid balcony & parking tiles',
  },
  {
    key: 'doors_windows',
    label: 'Doors & Windows',
    hint: 'e.g. Teak main door with Saal frame, flush laminate room doors, UPVC sliding windows',
  },
  {
    key: 'bathroom_fittings',
    label: 'Bathroom & CP Fittings',
    hint: 'e.g. Parryware/Jaquar fittings up to ₹17,000 per bathroom, wall-mounted EWC, health faucet',
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    hint: 'e.g. Granite counter up to ₹150/sqft, stainless steel sink, branded sink faucet',
  },
  {
    key: 'painting',
    label: 'Painting',
    hint: 'e.g. Asian/Nippon putty + 2 coat emulsion interior, weatherproof exterior paint',
  },
  {
    key: 'electrical',
    label: 'Electrical',
    hint: 'e.g. Havells/Legrand switches, Finolex FRLS wires, AC point per bedroom',
  },
  {
    key: 'design_and_pm',
    label: 'Design & Project Management',
    hint: 'e.g. 2D + 3D drawings, dedicated site engineer, structural warranty period',
  },
  {
    key: 'exclusions',
    label: "What's Not Included",
    hint: 'e.g. Boundary wall, sump & septic tank, lift, electricity connection, plan approval',
  },
];

export function createEmptyPackage(name = ''): FirmConstructionPackage {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    structure: '',
    flooring: '',
    doors_windows: '',
    bathroom_fittings: '',
    kitchen: '',
    painting: '',
    electrical: '',
    design_and_pm: '',
    exclusions: '',
  };
}

export function createDefaultPackages(): FirmConstructionPackage[] {
  return [
    createEmptyPackage('Class A'),
    createEmptyPackage('Class B'),
    createEmptyPackage('Class C'),
  ];
}

export function validateConstructionPackages(
  packages: FirmConstructionPackage[],
): string | null {
  if (packages.length === 0) {
    return 'Add at least one construction package.';
  }

  const seenNames = new Set<string>();

  for (const pkg of packages) {
    const name = pkg.name?.trim() ?? '';
    if (name.length < MIN_PACKAGE_NAME_LENGTH) {
      return 'Give every package a name (e.g. Class A, Elite, Budget Plus).';
    }
    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      return `Package name "${name}" is used more than once. Give each package a unique name.`;
    }
    seenNames.add(key);

    for (const category of PACKAGE_CATEGORIES) {
      const text = pkg[category.key]?.trim() ?? '';
      if (text.length < MIN_CATEGORY_LENGTH) {
        return `In "${name}", describe ${category.label} (at least ${MIN_CATEGORY_LENGTH} characters).`;
      }
    }
  }

  return null;
}

export function hasCompleteConstructionPackages(packages: FirmConstructionPackage[]): boolean {
  return validateConstructionPackages(packages) === null;
}

export function parseConstructionPackagesFromForm(formData: FormData): FirmConstructionPackage[] {
  const raw = (formData.get('construction_packages_json') as string | null) ?? '[]';
  try {
    const parsed = JSON.parse(raw);
    return normalizeConstructionPackages(parsed) ?? [];
  } catch {
    return [];
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizePackage(raw: Record<string, unknown>, fallbackName: string): FirmConstructionPackage {
  const base = createEmptyPackage(
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName,
  );
  if (typeof raw.id === 'string' && raw.id) base.id = raw.id;
  for (const category of PACKAGE_CATEGORIES) {
    const value = raw[category.key];
    base[category.key] = typeof value === 'string' ? value.trim() : '';
  }
  return base;
}

/**
 * Normalizes package data read back from the database. Handles the current
 * array shape and migrates the legacy { premium, standard, basic } object
 * shape used before firms could define their own packages.
 */
export function normalizeConstructionPackages(raw: unknown): FirmConstructionPackage[] | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    const packages = raw
      .filter(isPlainObject)
      .map((item, index) => sanitizePackage(item, `Package ${index + 1}`));
    return packages.length > 0 ? packages : null;
  }

  if (isPlainObject(raw)) {
    const legacy: { key: string; name: string }[] = [
      { key: 'premium', name: 'Class A' },
      { key: 'standard', name: 'Class B' },
      { key: 'basic', name: 'Class C' },
    ];
    const migrated = legacy
      .filter((l) => typeof raw[l.key] === 'string' && (raw[l.key] as string).trim())
      .map((l) => ({ ...createEmptyPackage(l.name), structure: (raw[l.key] as string).trim() }));
    return migrated.length > 0 ? migrated : null;
  }

  return null;
}
