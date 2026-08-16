'use server'

import { createClient } from '@/lib/supabase/server'
import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig'
import { deriveLegacyProjectFields, ASSAM_BUILDING_TYPE, RCC_BUILDING_TYPES } from '@/lib/buildingConfig'
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
import {
  isDrawingDesignServiceType,
  isDrawingDetails,
  type DrawingDetails,
} from '@/lib/drawingDesign'
import { isConstructionFirmEnabled } from '@/lib/features'
import { isTradeServiceType } from '@/lib/trades'
import {
  isPainterDetails,
  type PainterDetails,
} from '@/lib/painterDetails'
import {
  isCustomTradeWorkService,
  isTradeDetails,
  tradeDetailsMatchesService,
  type TradeDetails,
} from '@/lib/tradeWorkDetails'
import {
  buildingTypesFromMistriDetails,
  constructionTypesFromMistriDetails,
  isMistriDetails,
  mistriNestedDetailsCreateError,
  type MistriDetails,
} from '@/lib/mistriDetails'
import { sendNewProjectAnnouncementEmails } from '@/lib/email/newProjectAnnouncement'
import {
  embedDetailsInSubConfiguration,
  missingProjectsColumn,
} from '@/lib/project/storedDetails'

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
  /** Legacy floor/scope — derived from mistri_details when omitted. */
  building_types?: BuildingType[]
  construction_types?: ConstructionTypesMap
  /** Preferred: comprehensive civil work requirements for Mistri projects. */
  mistri_details?: MistriDetails
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
  /** Required when service_type === 'painter'. Ignored for other trades. */
  painter_details?: PainterDetails
  /** Required for plumber, electrician, carpenter, interior, and earthwork. */
  trade_details?: TradeDetails
}

/** Drawing & Design — package selection, plot details, and deliverables. */
export interface CreateDrawingDesignProjectInput extends CreateProjectBase {
  service_type: 'drawing_design'
  building_types: BuildingType[]
  drawing_types: DrawingDesignType[]
  drawing_details: DrawingDetails
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
  if (isFirm && !isConstructionFirmEnabled()) {
    return { error: 'Construction Firm projects are not available yet. Please choose another service.' }
  }
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
    const buildingTypes = Array.isArray(drawing.building_types) ? drawing.building_types : []
    if (buildingTypes.length === 0) {
      return { error: 'Select Assam Type or one or more RCC floors.' }
    }
    const hasAssam = buildingTypes.includes(ASSAM_BUILDING_TYPE)
    const hasRcc = buildingTypes.some((t) => RCC_BUILDING_TYPES.includes(t))
    if (hasAssam && hasRcc) {
      return { error: 'Assam Type and RCC floors cannot be combined.' }
    }
    if (hasAssam && buildingTypes.length > 1) {
      return { error: 'Assam Type cannot be combined with other house types.' }
    }

    const types = Array.isArray(drawing.drawing_types)
      ? drawing.drawing_types.filter((t, i, arr) => arr.indexOf(t) === i)
      : []
    if (types.length === 0) {
      return { error: 'Select at least one drawing / design type.' }
    }

    const legacy = deriveLegacyProjectFields(buildingTypes, {})
    insertPayload.track_type = legacy.track_type
    insertPayload.sub_configuration = legacy.sub_configuration
    insertPayload.building_types = buildingTypes
    insertPayload.construction_types = {}
    insertPayload.total_floors = legacy.total_floors
    insertPayload.drawing_types = types
    insertPayload.description = drawing.description?.trim() || null

    if (!isDrawingDetails(drawing.drawing_details)) {
      return { error: 'Drawing work requirements are incomplete.' }
    }
    if (
      drawing.drawing_details.projectStartTimeType === 'specific' &&
      !drawing.drawing_details.projectStartTimeSpecificDate &&
      !drawing.drawing_details.projectSubmissionTimeType
    ) {
      return { error: 'Select a project submission time.' }
    }
    insertPayload.drawing_details = drawing.drawing_details
  } else if (isTrade) {
    const trade = input as CreateTradeProjectInput
    insertPayload.track_type = trade.track_type
    insertPayload.sub_configuration = {}
    insertPayload.building_types = []
    insertPayload.construction_types = {}
    insertPayload.total_floors = 1

    if (trade.service_type === 'painter') {
      if (!isPainterDetails(trade.painter_details)) {
        return { error: 'Painter work requirements are incomplete.' }
      }
      if (
        trade.painter_details.projectStartTimeType === 'specific' &&
        !trade.painter_details.projectStartTimeSpecificDate
      ) {
        return { error: 'Select a specific project start date.' }
      }
      insertPayload.painter_details = {
        projectArea: trade.painter_details.projectArea,
        primerRequirement: trade.painter_details.primerRequirement,
        materialsIncludeClient: trade.painter_details.materialsIncludeClient ?? null,
        projectStartTimeType: trade.painter_details.projectStartTimeType,
        projectStartTimeSpecificDate:
          trade.painter_details.projectStartTimeType === 'specific'
            ? trade.painter_details.projectStartTimeSpecificDate
            : null,
        paintingScope: trade.painter_details.paintingScope ?? null,
        paintFinish: trade.painter_details.paintFinish ?? null,
        surfaceCondition: trade.painter_details.surfaceCondition ?? null,
        paintTopcoats: trade.painter_details.paintTopcoats ?? null,
        additionalRequirements: trade.painter_details.additionalRequirements?.trim() || null,
      }
    } else if (isCustomTradeWorkService(trade.service_type)) {
      if (
        !isTradeDetails(trade.trade_details) ||
        !tradeDetailsMatchesService(trade.trade_details, trade.service_type)
      ) {
        return { error: 'Work requirements are incomplete.' }
      }
      if (
        trade.trade_details.projectStartTimeType === 'specific' &&
        !trade.trade_details.projectStartTimeSpecificDate
      ) {
        return { error: 'Select a specific project start date.' }
      }
      insertPayload.trade_details = trade.trade_details
    }
  } else {
    if (isFirm) {
      const firm = input as CreateFirmProjectInput
      const buildingTypes = Array.isArray(firm.building_types) ? firm.building_types : []
      if (buildingTypes.length === 0) {
        return { error: 'Select at least one building type.' }
      }
      const constructionTypes: ConstructionTypesMap =
        firm.construction_types ?? buildFirmConstructionTypes(buildingTypes)
      const legacy = deriveLegacyProjectFields(buildingTypes, constructionTypes)

      insertPayload.track_type = legacy.track_type
      insertPayload.sub_configuration = legacy.sub_configuration
      insertPayload.building_types = buildingTypes
      insertPayload.construction_types = constructionTypes
      insertPayload.total_floors = legacy.total_floors
      insertPayload.floor_area_sqft = firm.floor_area_sqft ?? null
      insertPayload.finishing_level = firm.finishing_level ?? null
      insertPayload.budget_range_min = firm.budget_range_min ?? null
      insertPayload.budget_range_max = firm.budget_range_max ?? null
      insertPayload.drawing_url = firm.drawing_url ?? null
    } else {
      const labour = input as CreateLabourProjectInput
      let buildingTypes = Array.isArray(labour.building_types) ? labour.building_types : []
      let constructionTypes: ConstructionTypesMap = labour.construction_types ?? {}

      if (labour.mistri_details) {
        if (!isMistriDetails(labour.mistri_details)) {
          return { error: 'Mistri work requirements are incomplete.' }
        }
        const nestedError = mistriNestedDetailsCreateError(labour.mistri_details)
        if (nestedError) {
          return { error: nestedError }
        }
        if (
          labour.mistri_details.projectStartTimeType === 'specific' &&
          !labour.mistri_details.projectStartTimeSpecificDate
        ) {
          return { error: 'Select a specific project start date.' }
        }

        buildingTypes = buildingTypesFromMistriDetails(labour.mistri_details)
        constructionTypes = constructionTypesFromMistriDetails(labour.mistri_details)
        insertPayload.mistri_details = {
          floorWork: labour.mistri_details.floorWork ?? null,
          civilWorkTypes: labour.mistri_details.civilWorkTypes,
          plasterSide: labour.mistri_details.plasterSide ?? null,
          brickworkDetails: labour.mistri_details.brickworkDetails ?? null,
          boundaryWallDetails: labour.mistri_details.boundaryWallDetails ?? null,
          approximateAreaSqft: labour.mistri_details.approximateAreaSqft,
          currentFloorPlan: labour.mistri_details.currentFloorPlan,
          futureFloorPlan: labour.mistri_details.futureFloorPlan,
          workAreaFloors: labour.mistri_details.workAreaFloors ?? null,
          workAreaCustomFloors: labour.mistri_details.workAreaCustomFloors ?? null,
          floorLevel: labour.mistri_details.floorLevel ?? null,
          customFloorCount: labour.mistri_details.customFloorCount ?? null,
          contractType: labour.mistri_details.contractType ?? null,
          projectStartTimeType: labour.mistri_details.projectStartTimeType,
          projectStartTimeSpecificDate:
            labour.mistri_details.projectStartTimeType === 'specific'
              ? labour.mistri_details.projectStartTimeSpecificDate
              : null,
          additionalRequirements:
            labour.mistri_details.additionalRequirements?.trim() || null,
        }
        insertPayload.plot_area_sqft = labour.mistri_details.approximateAreaSqft
      }

      if (buildingTypes.length === 0) {
        return { error: 'Select at least one type of civil work and floor level.' }
      }
      if (Object.keys(constructionTypes).length === 0) {
        return { error: 'Mistri work requirements are incomplete.' }
      }

      const legacy = deriveLegacyProjectFields(buildingTypes, constructionTypes)
      insertPayload.track_type = legacy.track_type
      insertPayload.sub_configuration = legacy.sub_configuration
      insertPayload.building_types = buildingTypes
      insertPayload.construction_types = constructionTypes
      insertPayload.total_floors = legacy.total_floors

      if (labour.plot_area_sqft != null && insertPayload.plot_area_sqft == null) {
        if (!Number.isFinite(labour.plot_area_sqft) || labour.plot_area_sqft <= 0) {
          return { error: 'Plot area must be a positive number when provided.' }
        }
        insertPayload.plot_area_sqft = labour.plot_area_sqft
      }
    }
  }

  let payload = embedDetailsInSubConfiguration(insertPayload)
  let { data: project, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('id, title, district, state, track_type, sub_configuration, building_types, construction_types, bidding_ends_at')
    .single()

  // Older production DBs may not have drawing_details / trade_details yet.
  // Retry without the missing column; details stay in sub_configuration.
  while (error) {
    const missing = missingProjectsColumn(error.message)
    if (!missing || !(missing in payload)) break
    const next = { ...payload }
    delete next[missing]
    payload = next
    const retry = await supabase
      .from('projects')
      .insert(payload)
      .select('id, title, district, state, track_type, sub_configuration, building_types, construction_types, bidding_ends_at')
      .single()
    project = retry.data
    error = retry.error
  }

  if (error || !project) return { error: error?.message ?? 'Failed to create project.' }

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
