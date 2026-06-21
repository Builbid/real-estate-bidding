// ============================================================
// Platform-wide TypeScript Types & Database Interfaces
// ============================================================

export type UserRole = 'owner' | 'builder' | 'admin';
export type TrackType = 'RCC' | 'AssamType';
export type ProjectStatus = 'active_24h' | 'frozen_24h' | 'completed' | 'cancelled';

export type RCCConfig =
  | 'ground_only'
  | 'g_plus_1_structural'
  | 'g_plus_1_full'
  | 'g_plus_2_structural_structural'
  | 'g_plus_2_structural_full'
  | 'g_plus_2_full_structural'
  | 'g_plus_2_full_full';

export type AssamConfig = 'frame_to_roof' | 'full_finishing';

// ─── Permutation matrix label maps ─────────────────────────
export const RCC_CONFIG_LABELS: Record<RCCConfig, string> = {
  ground_only:                    'Ground Floor Only',
  g_plus_1_structural:            'G+1 — Structural Frame Only',
  g_plus_1_full:                  'G+1 — Full Civil Work',
  g_plus_2_structural_structural: 'G+2 — Ground: Frame | 1st: Frame',
  g_plus_2_structural_full:       'G+2 — Ground: Frame | 1st: Full',
  g_plus_2_full_structural:       'G+2 — Ground: Full | 1st: Frame',
  g_plus_2_full_full:             'G+2 — Ground: Full | 1st: Full',
};

export const ASSAM_CONFIG_LABELS: Record<AssamConfig, string> = {
  frame_to_roof:  'Frame Only (Up to Roof Level)',
  full_finishing: 'Full Finishing Completed',
};

// ─── Database row types ─────────────────────────────────────
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  mobile?: string | null;
  email: string;
  physical_address?: string | null;
  pincode?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface SubConfiguration {
  rcc_config?: RCCConfig;
  assam_config?: AssamConfig;
  floors?: Array<{
    floor: 'ground' | 'first' | 'second';
    type: 'structural' | 'full';
  }>;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  track_type: TrackType;
  sub_configuration: SubConfiguration;
  district: string;
  state: string;
  plot_area_sqft?: number | null;
  total_floors: 1 | 2 | 3;
  status: ProjectStatus;
  bidding_ends_at: string;
  selection_ends_at?: string | null;
  selected_builder_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidRates {
  ground_rate: number;
  first_rate?: number;
  second_rate?: number;
}

export interface Bid {
  id: string;
  project_id: string;
  builder_id: string | null; // null when anonymised in public view
  rates: BidRates;
  total_sum_metric: number;
  is_withdrawn: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  payload?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

// ─── Enriched types with joins ──────────────────────────────
export interface ProjectWithOwner extends Project {
  owner?: PublicProfile;
}

export interface BidWithBuilder extends Bid {
  builder?: PublicProfile;
}

// ─── Form input types ───────────────────────────────────────
export interface ProjectFormData {
  title: string;
  description: string;
  track_type: TrackType;
  rcc_config?: RCCConfig;
  assam_config?: AssamConfig;
  district: string;
  state: string;
  plot_area_sqft?: number;
  bidding_duration_hours: number; // 24 by default
}

export interface BidFormData {
  ground_rate: number;
  first_rate?: number;
  second_rate?: number;
}

export interface RegisterFormData {
  full_name: string;
  email: string;
  password: string;
  mobile: string;
  role: 'owner' | 'builder';
  physical_address?: string;
  pincode?: string;
}

// ─── UI state types ─────────────────────────────────────────
export interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  bid: Bid;
  builder?: PublicProfile;
  isCurrentUser?: boolean;
}

// ─── Assam districts ────────────────────────────────────────
export const ASSAM_DISTRICTS = [
  'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar',
  'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri',
  'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi',
  'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong',
  'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon',
  'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar',
  'Tinsukia', 'Udalguri', 'West Karbi Anglong',
] as const;

export type AssamDistrict = (typeof ASSAM_DISTRICTS)[number];

// ─── Floors per RCC config ──────────────────────────────────
export function getFloorCountForRCC(config: RCCConfig): number {
  if (config === 'ground_only') return 1;
  if (config.startsWith('g_plus_1')) return 2;
  return 3;
}

export function getFloorCountForTrack(
  trackType: TrackType,
  subConfig: SubConfiguration
): number {
  if (trackType === 'AssamType') return 1;
  if (subConfig.rcc_config) return getFloorCountForRCC(subConfig.rcc_config);
  return 1;
}
