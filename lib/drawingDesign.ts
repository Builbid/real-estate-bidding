// ============================================================
// Drawing & Design service — client multi-select deliverables
// ============================================================

import type { DrawingDesignType, ServiceType } from './types';

export interface DrawingTypeOption {
  value: DrawingDesignType;
  label: string;
  emoji: string;
  description: string;
}

export const DRAWING_TYPE_OPTIONS: DrawingTypeOption[] = [
  {
    value: '2d_house_plan',
    label: '2D House Plan',
    emoji: '📐',
    description: 'Floor plans, dimensions & room layout',
  },
  {
    value: '3d_house_plan',
    label: '3D House Plan',
    emoji: '🏠',
    description: '3D massing / walkthrough-style plan views',
  },
  {
    value: 'structural_drawing',
    label: 'Structural Drawing',
    emoji: '🏗️',
    description: 'Column, beam, footing & slab structural drawings',
  },
  {
    value: 'electrical_layout',
    label: 'Electrical Drawing Layout',
    emoji: '⚡',
    description: 'Wiring, points, DB & switchboard layout',
  },
  {
    value: 'plumbing_layout',
    label: 'Plumbing Layout',
    emoji: '🔧',
    description: 'Water supply, drainage & sanitary layout',
  },
  {
    value: '3d_front_elevation',
    label: '3D Realistic Front Elevation',
    emoji: '🖼️',
    description: 'Photorealistic front elevation visualization',
  },
];

export const DRAWING_TYPE_VALUES: DrawingDesignType[] = DRAWING_TYPE_OPTIONS.map((o) => o.value);

export const DRAWING_DESIGN_SERVICE: ServiceType = 'drawing_design';

export function isDrawingDesignServiceType(
  value: string | null | undefined,
): value is 'drawing_design' {
  return value === 'drawing_design';
}

export function isDrawingDesignType(value: string | null | undefined): value is DrawingDesignType {
  if (!value) return false;
  return (DRAWING_TYPE_VALUES as string[]).includes(value);
}

export function getDrawingTypeOption(value: string | null | undefined): DrawingTypeOption | undefined {
  return DRAWING_TYPE_OPTIONS.find((o) => o.value === value);
}

export function getDrawingTypeLabel(value: string | null | undefined): string {
  return getDrawingTypeOption(value)?.label ?? value ?? 'Drawing';
}

export function formatDrawingTypesSummary(types: string[] | null | undefined): string {
  if (!types?.length) return 'No drawings selected';
  return types.map((t) => getDrawingTypeLabel(t)).join(' · ');
}
