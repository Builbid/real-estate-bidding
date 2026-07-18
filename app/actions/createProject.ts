'use server'

import { createClient } from '@/lib/supabase/server'
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig'
import { deriveLegacyProjectFields } from '@/lib/buildingConfig'
import { buildFirmConstructionTypes } from '@/lib/firm/projectDefaults'
import { validatePincode } from '@/lib/validation/pincode'
import type { FinishingLevel, ServiceType, SubConfiguration } from '@/lib/types'
import { sendNewProjectAnnouncementEmails } from '@/lib/email/newProjectAnnouncement'

interface CreateProjectBase {
  title: string
  description?: string
  building_types: BuildingType[]
  district: string
  state: string
  pincode?: string | null
  bidding_minutes: number
  service_type?: ServiceType
}

export interface CreateLabourProjectInput extends CreateProjectBase {
  service_type?: 'labour_contractor'
  construction_types: ConstructionTypesMap
  plot_area_sqft?: number | null
}

export interface CreateFirmProjectInput extends CreateProjectBase {
  service_type: 'construction_firm'
  construction_types?: ConstructionTypesMap
  floor_area_sqft?: number | null
  finishing_level: FinishingLevel
  budget_range_min?: number | null
  budget_range_max?: number | null
  drawing_url?: string | null
}

export type CreateProjectInput = CreateLabourProjectInput | CreateFirmProjectInput

export interface CreateProjectResult {
  error: string | null
  projectId?: string
  biddingEndsAt?: string
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const pincodeRaw = input.pincode?.trim() ?? ''
  if (pincodeRaw) {
    const pincodeError = validatePincode(pincodeRaw)
    if (pincodeError) return { error: pincodeError }
  }

  const isFirm = input.service_type === 'construction_firm'
  const serviceType: ServiceType = isFirm ? 'construction_firm' : 'labour_contractor'

  const constructionTypes: ConstructionTypesMap = isFirm
    ? (input as CreateFirmProjectInput).construction_types ??
      buildFirmConstructionTypes(input.building_types)
    : (input as CreateLabourProjectInput).construction_types

  const biddingEndsAt = new Date(
    Date.now() + Math.max(1, Math.round(input.bidding_minutes)) * 60 * 1000
  ).toISOString()

  const legacy = deriveLegacyProjectFields(input.building_types, constructionTypes)

  const insertPayload: Record<string, unknown> = {
    owner_id: user.id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    track_type: legacy.track_type,
    sub_configuration: legacy.sub_configuration,
    building_types: input.building_types,
    construction_types: constructionTypes,
    district: input.district,
    state: input.state,
    pincode: pincodeRaw || null,
    total_floors: legacy.total_floors,
    status: 'active_24h',
    bidding_ends_at: biddingEndsAt,
    service_type: isFirm ? 'construction_firm' : 'labour_contractor',
  }

  if (isFirm) {
    const firm = input as CreateFirmProjectInput
    insertPayload.floor_area_sqft = firm.floor_area_sqft ?? null
    insertPayload.finishing_level = firm.finishing_level
    insertPayload.budget_range_min = firm.budget_range_min ?? null
    insertPayload.budget_range_max = firm.budget_range_max ?? null
    insertPayload.drawing_url = firm.drawing_url ?? null
  } else {
    const labour = input as CreateLabourProjectInput
    if (labour.plot_area_sqft != null) {
      if (!Number.isFinite(labour.plot_area_sqft) || labour.plot_area_sqft <= 0) {
        return { error: 'Plot area must be a positive number when provided.' }
      }
      insertPayload.plot_area_sqft = labour.plot_area_sqft
    }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert(insertPayload)
    .select('id, title, district, state, track_type, sub_configuration, building_types, construction_types, bidding_ends_at')
    .single()

  if (error) return { error: error.message }

  try {
    await sendNewProjectAnnouncementEmails({
      projectId: project.id,
      title: project.title,
      district: project.district,
      state: input.state,
      track_type: project.track_type,
      sub_configuration: (project.sub_configuration ?? {}) as SubConfiguration,
      bidding_ends_at: project.bidding_ends_at,
      serviceType,
    })
  } catch (emailErr) {
    console.error('New project announcement email failed (non-fatal):', emailErr)
  }

  return { error: null, projectId: project.id, biddingEndsAt: project.bidding_ends_at }
}
