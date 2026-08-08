'use server'

import { createClient } from '@/lib/supabase/server'
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig'
import { deriveLegacyProjectFields } from '@/lib/buildingConfig'
import { buildFirmConstructionTypes } from '@/lib/firm/projectDefaults'
import { validatePincode } from '@/lib/validation/pincode'
import type {
  DrawingDesignType,
  FinishingLevel,
  ServiceType,
  SubConfiguration,
  TrackType,
  TradeServiceType,
} from '@/lib/types'
import { isDrawingDesignServiceType } from '@/lib/drawingDesign'
import { isTradeServiceType } from '@/lib/trades'
import { sendNewProjectAnnouncementEmails } from '@/lib/email/newProjectAnnouncement'

interface CreateProjectBase {
  title: string
  description?: string
  district: string
  state: string
  pincode?: string | null
  bidding_minutes: number
  service_type?: ServiceType
}

export interface CreateLabourProjectInput extends CreateProjectBase {
  service_type?: 'labour_contractor'
  building_types: BuildingType[]
  construction_types: ConstructionTypesMap
  plot_area_sqft?: number | null
}

export interface CreateFirmProjectInput extends CreateProjectBase {
  service_type: 'construction_firm'
  building_types: BuildingType[]
  construction_types?: ConstructionTypesMap
  floor_area_sqft?: number | null
  finishing_level?: FinishingLevel | null
  budget_range_min?: number | null
  budget_range_max?: number | null
  drawing_url?: string | null
}

/** Simplified single-rate/sqft trade project — building type only, no floor-by-floor scope. */
export interface CreateTradeProjectInput extends CreateProjectBase {
  service_type: TradeServiceType
  track_type: TrackType
}

/** Drawing & Design — client multi-selects deliverable drawing types. */
export interface CreateDrawingDesignProjectInput extends CreateProjectBase {
  service_type: 'drawing_design'
  drawing_types: DrawingDesignType[]
}

export type CreateProjectInput =
  | CreateLabourProjectInput
  | CreateFirmProjectInput
  | CreateTradeProjectInput
  | CreateDrawingDesignProjectInput

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
  const isTrade = isTradeServiceType(input.service_type)
  const isDrawing = isDrawingDesignServiceType(input.service_type)
  const serviceType: ServiceType = isFirm
    ? 'construction_firm'
    : isDrawing
      ? 'drawing_design'
      : isTrade
        ? (input.service_type as TradeServiceType)
        : 'labour_contractor'

  const biddingEndsAt = new Date(
    Date.now() + Math.max(1, Math.round(input.bidding_minutes)) * 60 * 1000
  ).toISOString()

  const insertPayload: Record<string, unknown> = {
    owner_id: user.id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    district: input.district,
    state: input.state,
    pincode: pincodeRaw || null,
    status: 'active_24h',
    bidding_ends_at: biddingEndsAt,
    service_type: serviceType,
  }

  if (isDrawing) {
    const drawing = input as CreateDrawingDesignProjectInput
    const types = Array.isArray(drawing.drawing_types)
      ? drawing.drawing_types.filter((t, i, arr) => arr.indexOf(t) === i)
      : []
    if (types.length === 0) {
      return { error: 'Select at least one drawing / design type.' }
    }
    insertPayload.track_type = 'RCC'
    insertPayload.sub_configuration = {}
    insertPayload.building_types = []
    insertPayload.construction_types = {}
    insertPayload.total_floors = 1
    insertPayload.drawing_types = types
  } else if (isTrade) {
    const trade = input as CreateTradeProjectInput
    insertPayload.track_type = trade.track_type
    insertPayload.sub_configuration = {}
    insertPayload.building_types = []
    insertPayload.construction_types = {}
    insertPayload.total_floors = 1
  } else {
    const nonTrade = input as CreateLabourProjectInput | CreateFirmProjectInput
    const constructionTypes: ConstructionTypesMap = isFirm
      ? (input as CreateFirmProjectInput).construction_types ??
        buildFirmConstructionTypes(nonTrade.building_types)
      : (input as CreateLabourProjectInput).construction_types

    const legacy = deriveLegacyProjectFields(nonTrade.building_types, constructionTypes)

    insertPayload.track_type = legacy.track_type
    insertPayload.sub_configuration = legacy.sub_configuration
    insertPayload.building_types = nonTrade.building_types
    insertPayload.construction_types = constructionTypes
    insertPayload.total_floors = legacy.total_floors

    if (isFirm) {
      const firm = input as CreateFirmProjectInput
      insertPayload.floor_area_sqft = firm.floor_area_sqft ?? null
      insertPayload.finishing_level = firm.finishing_level ?? null
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
