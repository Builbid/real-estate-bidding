// ============================================================
// Platform-wide TypeScript Types & Database Interfaces
// ============================================================

import type { BuildingType, ConstructionTypesMap } from './buildingConfig';

export type UserRole = 'owner' | 'labour_contractor' | 'construction_firm' | 'admin';
export type ServiceType = 'labour_contractor' | 'construction_firm';
export type FinishingLevel = 'basic' | 'standard' | 'premium';
export type TrackType = 'RCC' | 'AssamType';
export type ProjectStatus = 'active_24h' | 'frozen_24h' | 'completed' | 'cancelled';

export type RCCConfig =
  | 'ground_only'
  | 'ground_full'
  | 'g_plus_1_structural'
  | 'g_plus_1_structural_full'
  | 'g_plus_1_full_structural'
  | 'g_plus_1_full'
  | 'g_plus_2_structural_structural'
  | 'g_plus_2_structural_structural_full'
  | 'g_plus_2_structural_full'
  | 'g_plus_2_structural_full_full'
  | 'g_plus_2_full_structural'
  | 'g_plus_2_full_structural_full'
  | 'g_plus_2_full_full_structural'
  | 'g_plus_2_full_full';

export type AssamConfig = 'frame_to_roof' | 'full_finishing';

// ─── Database row types ─────────────────────────────────────
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  mobile?: string | null;
  email: string;
  physical_address?: string | null;
  pincode?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  gst_number?: string | null;
  years_in_business?: number | null;
  logo_url?: string | null;
  service_type?: ServiceType | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  role: UserRole;
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface PublicFirmProfile {
  id: string;
  company_name: string;
  logo_url?: string | null;
  years_in_business?: number | null;
  is_verified?: boolean;
  gst_masked?: string | null;
  gst_verified?: boolean;
  physical_address?: string | null;
  pincode?: string | null;
  created_at: string;
}

export interface BuilderRating {
  id: string;
  project_id: string;
  builder_id: string;
  owner_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuilderPortfolioItem {
  id: string;
  builder_id: string;
  title: string;
  description: string | null;
  photo_urls: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FirmPortfolioItem {
  id: string;
  firm_id: string;
  project_name: string;
  location: string;
  year_completed: number;
  photos: string[] | null;
  description: string | null;
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
  /** New wizard Step 1 — selected building types */
  building_types?: BuildingType[];
  /** New wizard Step 2 — per-type construction scope */
  construction_types?: ConstructionTypesMap;
  district: string;
  state: string;
  plot_area_sqft?: number | null;
  pincode?: string | null;
  total_floors: 1 | 2 | 3;
  status: ProjectStatus;
  bidding_ends_at: string;
  selection_ends_at?: string | null;
  selected_builder_id?: string | null;
  service_type?: ServiceType;
  floor_area_sqft?: number | null;
  finishing_level?: FinishingLevel | null;
  budget_range_min?: number | null;
  budget_range_max?: number | null;
  drawing_url?: string | null;
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
  builder_id: string | null;
  rates: BidRates;
  total_sum_metric: number;
  single_rate?: number | null;
  service_type?: ServiceType | null;
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
  role: 'owner' | 'labour_contractor' | 'construction_firm';
  physical_address?: string;
  pincode?: string;
  company_name?: string;
  gst_number?: string;
  years_in_business?: number;
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

// ─── Floors per RCC config ──────────────────────────────────
export function getFloorCountForRCC(config: RCCConfig): number {
  if (config === 'ground_only' || config === 'ground_full') return 1;
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
