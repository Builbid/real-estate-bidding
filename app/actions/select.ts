'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { sendSelectionNotification, sendUserNotificationEmail } from '@/lib/email/sendNotification'
import { sendOfficialMistriAgreementEmail } from '@/lib/email/sendMistriAgreement'
import { sendOfficialPlumberAgreementEmail } from '@/lib/email/sendPlumberAgreement'
import {
  buildMistriAgreementPayload,
  generateMistriAgreementPdfBytes,
  isMistriCivilService,
  mistriAgreementFileName,
} from '@/lib/contract/mistriAgreement'
import {
  buildPlumberAgreementPayload,
  generatePlumberAgreementPdfBytes,
  isPlumberService,
  plumberAgreementFileName,
} from '@/lib/contract/plumberAgreement'
import { getConstructionLabel } from '@/lib/utils'
import { formatPackageRateRange } from '@/lib/firm/bidDisplay'
import type { BidRates, PackageBidPrice, SubConfiguration, TrackType } from '@/lib/types'
import type { ConstructionTypesMap } from '@/lib/buildingConfig'
import { archiveAwardedProjectDocuments } from '@/lib/documents/archiveProjectDocuments'
import { missingProjectsColumn, readNestedProjectDetail } from '@/lib/project/storedDetails'
import { revalidatePath } from 'next/cache'

const CORE_PROJECT_COLUMNS =
  'id, owner_id, title, district, state, pincode, description, track_type, sub_configuration, total_floors, plot_area_sqft, status, selected_builder_id, service_type, bidding_ends_at, selection_ends_at'

function asId(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
  return trimmed
}

function isAwardableStatus(status: string | null | undefined): boolean {
  const value = (status ?? '').toLowerCase()
  return value === 'active_24h' || value === 'frozen_24h' || value === 'completed'
}

export async function selectBuilderAction(
  rawProjectId: string,
  rawBuilderId: string,
  builderName?: string,
  packageId?: string,
): Promise<{ error: string | null; success?: boolean }> {
  const projectId = asId(rawProjectId)
  const builderId = asId(rawBuilderId)
  if (!projectId || !builderId) {
    return { error: 'Project or builder is missing. Refresh the page and try again.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return { error: 'Please sign in again to select a builder.' }
  }
  const userId = user.id

  // Load by id only — never require status = open/active. Bidding-closed
  // (frozen_24h) and timer-ended active rows must still be awardable.
  let existing: Record<string, unknown> | null = null
  const userLookup = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle()
  if (userLookup.data) {
    existing = userLookup.data as Record<string, unknown>
  } else {
    console.error('selectBuilderAction user lookup failed:', userLookup.error)
    const coreLookup = await supabase
      .from('projects')
      .select(CORE_PROJECT_COLUMNS)
      .eq('id', projectId)
      .maybeSingle()
    if (coreLookup.data) {
      existing = coreLookup.data as Record<string, unknown>
    }
  }

  if (!existing) {
    try {
      const admin = createAdminClient()
      const adminLookup = await admin.from('projects').select('*').eq('id', projectId).maybeSingle()
      existing = (adminLookup.data as Record<string, unknown> | null) ?? null
      if (adminLookup.error) {
        console.error('selectBuilderAction admin lookup failed:', adminLookup.error)
      }
    } catch (err) {
      console.warn('Admin project lookup unavailable:', err)
    }
  }

  if (!existing) {
    return { error: 'Project not found.' }
  }

  const ownerId = asId(existing.owner_id)
  if (ownerId && ownerId !== userId) {
    return { error: 'You can only award your own projects.' }
  }

  if (asId(existing.selected_builder_id)) {
    return { error: 'A builder has already been selected for this project.' }
  }

  const status = String(existing.status ?? '')
  if (status === 'cancelled') {
    return { error: 'This project was cancelled and cannot be awarded.' }
  }
  if (status && !isAwardableStatus(status)) {
    return { error: 'This project is no longer available to award.' }
  }

  const constructionLabel = getConstructionLabel(
    existing.track_type as TrackType,
    (existing.sub_configuration ?? {}) as SubConfiguration,
  )

  const isFirmProject = existing.service_type === 'construction_firm'

  const { data: winningBid } = await supabase
    .from('bids')
    .select('id, total_sum_metric, single_rate, package_rates, rates')
    .eq('project_id', projectId)
    .eq('builder_id', builderId)
    .limit(1)
    .maybeSingle()

  const bidPackages = (winningBid?.package_rates as PackageBidPrice[] | null) ?? []

  // Construction firm projects require the owner to pick exactly which
  // package they're awarding — never just "the firm" with an ambiguous price.
  let selectedPackage: PackageBidPrice | null = null
  if (isFirmProject && bidPackages.length > 0) {
    selectedPackage = bidPackages.find((p) => p.package.id === packageId) ?? null
    if (!selectedPackage) {
      return { error: 'Choose a package from this firm before confirming your selection.' }
    }
  }

  // Award by project id + owner. Do not filter on open/active status.
  const awardPatch: Record<string, unknown> = {
    selected_builder_id: builderId,
    status: 'completed',
  }
  if (selectedPackage) awardPatch.selected_package = selectedPackage

  async function applyAward(client: { from: (table: string) => any }) {
    return client
      .from('projects')
      .update(awardPatch)
      .eq('id', projectId)
      .eq('owner_id', userId)
      .is('selected_builder_id', null)
      .select('id')
      .maybeSingle()
  }

  let updated: { id: string } | null = null
  let updateError: { message: string } | null = null

  try {
    const admin = createAdminClient()
    const awarded = await applyAward(admin)
    updated = awarded.data
    updateError = awarded.error
  } catch (err) {
    console.warn('Admin award update unavailable, falling back to owner session:', err)
  }

  if (!updated) {
    const awarded = await applyAward(supabase)
    updated = awarded.data
    updateError = awarded.error ?? updateError
  }

  if (updateError && missingProjectsColumn(updateError.message) === 'selected_package') {
    delete awardPatch.selected_package
    try {
      const admin = createAdminClient()
      const awarded = await applyAward(admin)
      updated = awarded.data
      updateError = awarded.error
    } catch {
      const awarded = await applyAward(supabase)
      updated = awarded.data
      updateError = awarded.error
    }
  }

  if (updateError) return { error: updateError.message }
  if (!updated) {
    return { error: 'Could not award this project. Refresh and try again.' }
  }

  // Prefer the exact chosen package price; fall back to the price range
  // across all packages, then to the legacy single-rate bids (never the
  // hidden ranking average).
  const packageRange = isFirmProject ? formatPackageRateRange(bidPackages) : null
  const legacyRateValue = winningBid?.single_rate ?? winningBid?.total_sum_metric
  const plumberRates = winningBid?.rates as {
    bid_unit?: string
    ground_rate?: number
    first_rate?: number
    second_rate?: number
    third_rate?: number
  } | null
  const plumberOptionCount = plumberRates
    ? [plumberRates.ground_rate, plumberRates.first_rate, plumberRates.second_rate, plumberRates.third_rate]
        .filter((value): value is number => typeof value === 'number' && value > 0).length
    : 1
  const plumberAvg =
    plumberOptionCount > 1 && typeof legacyRateValue === 'number'
      ? legacyRateValue / plumberOptionCount
      : legacyRateValue
  const bidAmt = isFirmProject
    ? selectedPackage
      ? `₹${selectedPackage.rate.toLocaleString('en-IN')}/sqft (${selectedPackage.package.name})`
      : packageRange ?? ''
    : legacyRateValue
      ? existing.service_type === 'plumber'
        ? plumberRates?.bid_unit === 'per_running_foot'
          ? `₹${Number(plumberAvg).toLocaleString('en-IN')}/Rft avg`
          : `Rs. ${legacyRateValue.toLocaleString('en-IN')}`
        : existing.service_type === 'electrician'
          ? `₹${legacyRateValue.toLocaleString('en-IN')}/point`
          : `₹${legacyRateValue.toLocaleString('en-IN')}/sqft`
      : ''

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('full_name, email, mobile, physical_address')
    .eq('id', ownerId || userId)
    .single()

  const projectTitle = String(existing.title ?? '')
  const projectDistrict = String(existing.district ?? '')
  const builderLabel = builderName ?? (isFirmProject ? 'the selected firm' : 'the selected builder')
  const ownerName    = ownerProfile?.full_name ?? 'The client'

  const ownerBody = isFirmProject
    ? `🎉 ${builderLabel} has been selected for your project! Our team will arrange a meeting to finalize the construction agreement.${bidAmt ? ` Winning bid: ${bidAmt}.` : ''}`
    : `You selected ${builderLabel} for "${projectTitle}" in ${projectDistrict}. Construction: ${constructionLabel}${bidAmt ? ` at ${bidAmt}` : ''}. Our team will reach out shortly.`

  const builderBody = isFirmProject
    ? `🎉 You've been selected for "${projectTitle}" in ${projectDistrict}! Check your dashboard for details.${bidAmt ? ` Your bid: ${bidAmt}.` : ''}`
    : `${ownerName} selected you for "${projectTitle}" in ${projectDistrict}. Construction: ${constructionLabel}${bidAmt ? ` at ${bidAmt}` : ''}. Expect a call soon!`

  const ownerTitle = isFirmProject ? 'Construction Firm Selected' : 'Builder Selected Successfully'
  const builderTitle = isFirmProject ? 'You Were Selected!' : 'Congratulations! You Were Selected'

  try {
    const admin = createAdminClient()

    const [{ data: ownerNotif }, { data: builderNotif }] = await Promise.all([
      admin.from('notifications').select('id').eq('user_id', ownerId || userId).eq('type', 'builder_selected').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('notifications').select('id').eq('user_id', builderId).eq('type', 'you_were_selected').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (ownerNotif?.id) {
      await admin.from('notifications').update({ body: ownerBody, title: ownerTitle }).eq('id', ownerNotif.id)
    } else {
      await admin.from('notifications').insert({ user_id: ownerId || userId, type: 'builder_selected', title: ownerTitle, body: ownerBody })
    }

    if (builderNotif?.id) {
      await admin.from('notifications').update({ body: builderBody, title: builderTitle }).eq('id', builderNotif.id)
    } else {
      await admin.from('notifications').insert({ user_id: builderId, type: 'you_were_selected', title: builderTitle, body: builderBody })
    }
  } catch {
    // Fallback: owner can at least update their own notification
    const { data: ownerNotif } = await supabase
      .from('notifications').select('id').eq('user_id', ownerId || userId).eq('type', 'builder_selected')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (ownerNotif?.id) {
      await supabase.from('notifications').update({ body: ownerBody }).eq('id', ownerNotif.id)
    }
    await supabase.from('notifications').insert({
      user_id: builderId, type: 'you_were_selected',
      title: builderTitle, body: builderBody,
    })
  }

  // 4. Email to builbidcorp@gmail.com — best-effort, never blocks selection
  try {
    let builderFull: {
      full_name?: string
      email?: string
      mobile?: string | null
      physical_address?: string | null
      company_name?: string | null
      gst_number?: string | null
      years_in_business?: number | null
      is_verified?: boolean | null
      role?: string
    } | null = null
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('profiles')
        .select('full_name, email, mobile, physical_address, company_name, gst_number, years_in_business, is_verified, role')
        .eq('id', builderId)
        .single()
      builderFull = data
    } catch {
      console.warn('Admin client unavailable — builder contact details may be partial in email.')
    }

    const isMistriProject = isMistriCivilService(existing.service_type as string)
    const isPlumberProject = isPlumberService(existing.service_type as string)
    let mistriAgreementPayload = null as ReturnType<typeof buildMistriAgreementPayload> | null
    let plumberAgreementPayload = null as ReturnType<typeof buildPlumberAgreementPayload> | null
    let agreementAttachment: Array<{ filename: string; content: Buffer; contentType: string }> | undefined
    const winningBidInput = winningBid
      ? {
          id: winningBid.id,
          single_rate: winningBid.single_rate,
          total_sum_metric: winningBid.total_sum_metric,
          rates: winningBid.rates as BidRates | null,
        }
      : null
    const ownerParty = {
      name: ownerProfile?.full_name ?? 'Client',
      email: ownerProfile?.email,
      mobile: ownerProfile?.mobile,
      address: ownerProfile?.physical_address,
    }
    const contractorParty = {
      name: builderFull?.full_name ?? builderLabel,
      email: builderFull?.email,
      mobile: builderFull?.mobile,
      address: builderFull?.physical_address,
      companyName: builderFull?.company_name,
      gstNumber: builderFull?.gst_number ?? null,
      yearsInBusiness: builderFull?.years_in_business ?? null,
      isVerified: builderFull?.is_verified ?? null,
      platformId: builderId,
    }

    if (isMistriProject) {
      try {
        mistriAgreementPayload = buildMistriAgreementPayload({
          project: {
            id: projectId,
            numeric_id: typeof existing.numeric_id === 'string' ? existing.numeric_id : null,
            title: projectTitle,
            district: projectDistrict,
            state: typeof existing.state === 'string' ? existing.state : null,
            pincode: typeof existing.pincode === 'string' ? existing.pincode : null,
            description: typeof existing.description === 'string' ? existing.description : null,
            track_type: existing.track_type as TrackType,
            sub_configuration: (existing.sub_configuration ?? {}) as SubConfiguration,
            building_types: existing.building_types as string[] | null,
            construction_types: (existing.construction_types ?? null) as ConstructionTypesMap | null,
            total_floors: typeof existing.total_floors === 'number' ? existing.total_floors : null,
            plot_area_sqft: typeof existing.plot_area_sqft === 'number' ? existing.plot_area_sqft : null,
            floor_area_sqft: typeof existing.floor_area_sqft === 'number' ? existing.floor_area_sqft : null,
            mistri_details: existing.mistri_details,
            service_type: existing.service_type as string | null,
          },
          bid: winningBidInput,
          owner: ownerParty,
          mistri: contractorParty,
        })
        const pdfBytes = generateMistriAgreementPdfBytes(mistriAgreementPayload)
        agreementAttachment = [{
          filename: mistriAgreementFileName(projectId, mistriAgreementPayload.numericProjectId),
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        }]
      } catch (pdfErr) {
        console.error('Mistri agreement PDF generation failed (non-fatal):', pdfErr)
      }
    } else if (isPlumberProject) {
      try {
        plumberAgreementPayload = buildPlumberAgreementPayload({
          project: {
            id: projectId,
            numeric_id: typeof existing.numeric_id === 'string' ? existing.numeric_id : null,
            title: projectTitle,
            district: projectDistrict,
            state: typeof existing.state === 'string' ? existing.state : null,
            pincode: typeof existing.pincode === 'string' ? existing.pincode : null,
            description: typeof existing.description === 'string' ? existing.description : null,
            trade_details: readNestedProjectDetail(existing, 'trade_details'),
            sub_configuration: existing.sub_configuration,
            service_type: existing.service_type as string | null,
          },
          bid: winningBidInput,
          owner: ownerParty,
          plumber: contractorParty,
        })
        const pdfBytes = generatePlumberAgreementPdfBytes(plumberAgreementPayload)
        agreementAttachment = [{
          filename: plumberAgreementFileName(projectId, plumberAgreementPayload.numericProjectId),
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        }]
      } catch (pdfErr) {
        console.error('Plumber agreement PDF generation failed (non-fatal):', pdfErr)
      }
    }

    await sendSelectionNotification({
      projectTitle,
      projectDistrict,
      constructionType: constructionLabel,
      bidAmountLabel:   bidAmt || 'N/A',
      isFirmProject,
      selectedPackage,
      ownerName:        ownerProfile?.full_name        ?? 'N/A',
      ownerEmail:       ownerProfile?.email            ?? 'N/A',
      ownerMobile:      ownerProfile?.mobile           ?? null,
      ownerAddress:     ownerProfile?.physical_address ?? null,
      builderName:      builderFull?.company_name ?? builderFull?.full_name ?? builderLabel,
      builderEmail:     builderFull?.email              ?? 'N/A',
      builderMobile:    builderFull?.mobile             ?? null,
      builderAddress:   builderFull?.physical_address   ?? null,
    }, agreementAttachment)

    await Promise.all([
      sendUserNotificationEmail({
        to:    ownerProfile?.email ?? '',
        title: ownerTitle,
        body:  ownerBody,
        selectedPackage,
      }),
      sendUserNotificationEmail({
        to:    builderFull?.email ?? '',
        title: builderTitle,
        body:  builderBody,
        selectedPackage,
      }),
    ])

    if (mistriAgreementPayload) {
      try {
        await sendOfficialMistriAgreementEmail(mistriAgreementPayload)
      } catch (agreementErr) {
        console.error('Official mistri agreement email failed (non-fatal):', agreementErr)
      }
    } else if (plumberAgreementPayload) {
      try {
        await sendOfficialPlumberAgreementEmail(plumberAgreementPayload)
      } catch (agreementErr) {
        console.error('Official plumber agreement email failed (non-fatal):', agreementErr)
      }
    }
  } catch (err) {
    console.error('Selection email failed (non-fatal):', err)
  }

  try {
    await archiveAwardedProjectDocuments({ projectId })
  } catch (archiveErr) {
    console.error('Project document archive failed (non-fatal):', archiveErr)
  }

  revalidatePath(`/dashboard/owner/project/${projectId}`)
  revalidatePath('/dashboard/owner')
  revalidatePath('/dashboard/profile')
  return { error: null, success: true }
}
