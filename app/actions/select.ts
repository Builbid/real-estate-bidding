'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { sendSelectionNotification, sendUserNotificationEmail } from '@/lib/email/sendNotification'
import { sendOfficialMistriAgreementEmail } from '@/lib/email/sendMistriAgreement'
import {
  buildMistriAgreementPayload,
  isMistriCivilService,
} from '@/lib/contract/mistriAgreement'
import { getConstructionLabel } from '@/lib/utils'
import { formatPackageRateRange } from '@/lib/firm/bidDisplay'
import type { BidRates, PackageBidPrice, SubConfiguration, TrackType } from '@/lib/types'
import type { ConstructionTypesMap } from '@/lib/buildingConfig'
import { revalidatePath } from 'next/cache'

export async function selectBuilderAction(
  projectId: string,
  builderId: string,
  builderName?: string,
  packageId?: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // 1. Confirm the project is still selectable (prevents double-select)
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('id, owner_id, title, district, state, pincode, description, track_type, sub_configuration, building_types, construction_types, total_floors, plot_area_sqft, floor_area_sqft, mistri_details, status, selected_builder_id, service_type')
    .eq('id', projectId)
    .single()

  if (fetchError || !existing) return { error: 'Project not found.' }
  if (existing.selected_builder_id) {
    return { error: 'A builder has already been selected for this project.' }
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
    .single()

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

  // 2. Mark the builder as selected and close the project.
  //    A database trigger creates in-site notifications; we enrich them below.
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      selected_builder_id: builderId,
      selected_package: selectedPackage,
      status: 'completed',
    })
    .eq('id', projectId)
    .is('selected_builder_id', null)

  if (updateError) return { error: updateError.message }

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
    .eq('id', existing.owner_id)
    .single()

  const builderLabel = builderName ?? (isFirmProject ? 'the selected firm' : 'the selected builder')
  const ownerName    = ownerProfile?.full_name ?? 'The client'

  const ownerBody = isFirmProject
    ? `🎉 ${builderLabel} has been selected for your project! Our team will arrange a meeting to finalize the construction agreement.${bidAmt ? ` Winning bid: ${bidAmt}.` : ''}`
    : `You selected ${builderLabel} for "${existing.title}" in ${existing.district}. Construction: ${constructionLabel}${bidAmt ? ` at ${bidAmt}` : ''}. Our team will reach out shortly.`

  const builderBody = isFirmProject
    ? `🎉 You've been selected for "${existing.title}" in ${existing.district}! Check your dashboard for details.${bidAmt ? ` Your bid: ${bidAmt}.` : ''}`
    : `${ownerName} selected you for "${existing.title}" in ${existing.district}. Construction: ${constructionLabel}${bidAmt ? ` at ${bidAmt}` : ''}. Expect a call soon!`

  const ownerTitle = isFirmProject ? 'Construction Firm Selected' : 'Builder Selected Successfully'
  const builderTitle = isFirmProject ? 'You Were Selected!' : 'Congratulations! You Were Selected'

  try {
    const admin = createAdminClient()

    const [{ data: ownerNotif }, { data: builderNotif }] = await Promise.all([
      admin.from('notifications').select('id').eq('user_id', existing.owner_id).eq('type', 'builder_selected').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('notifications').select('id').eq('user_id', builderId).eq('type', 'you_were_selected').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (ownerNotif?.id) {
      await admin.from('notifications').update({ body: ownerBody, title: ownerTitle }).eq('id', ownerNotif.id)
    } else {
      await admin.from('notifications').insert({ user_id: existing.owner_id, type: 'builder_selected', title: ownerTitle, body: ownerBody })
    }

    if (builderNotif?.id) {
      await admin.from('notifications').update({ body: builderBody, title: builderTitle }).eq('id', builderNotif.id)
    } else {
      await admin.from('notifications').insert({ user_id: builderId, type: 'you_were_selected', title: builderTitle, body: builderBody })
    }
  } catch {
    // Fallback: owner can at least update their own notification
    const { data: ownerNotif } = await supabase
      .from('notifications').select('id').eq('user_id', existing.owner_id).eq('type', 'builder_selected')
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

    await sendSelectionNotification({
      projectTitle:     existing.title,
      projectDistrict:  existing.district,
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
    })

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

    if (isMistriCivilService(existing.service_type)) {
      try {
        const agreementPayload = buildMistriAgreementPayload({
        project: {
          id: existing.id,
          title: existing.title,
          district: existing.district,
          state: existing.state,
          pincode: existing.pincode,
          description: existing.description,
          track_type: existing.track_type as TrackType,
          sub_configuration: (existing.sub_configuration ?? {}) as SubConfiguration,
          building_types: existing.building_types,
          construction_types: (existing.construction_types ?? null) as ConstructionTypesMap | null,
          total_floors: existing.total_floors,
          plot_area_sqft: existing.plot_area_sqft,
          floor_area_sqft: existing.floor_area_sqft,
          mistri_details: existing.mistri_details,
          service_type: existing.service_type,
        },
        bid: winningBid
          ? {
              id: winningBid.id,
              single_rate: winningBid.single_rate,
              total_sum_metric: winningBid.total_sum_metric,
              rates: winningBid.rates as BidRates | null,
            }
          : null,
        owner: {
          name: ownerProfile?.full_name ?? 'Client',
          email: ownerProfile?.email,
          mobile: ownerProfile?.mobile,
          address: ownerProfile?.physical_address,
        },
        mistri: {
          name: builderFull?.full_name ?? builderLabel,
          email: builderFull?.email,
          mobile: builderFull?.mobile,
          address: builderFull?.physical_address,
          companyName: builderFull?.company_name,
          gstNumber: builderFull?.gst_number ?? null,
          yearsInBusiness: builderFull?.years_in_business ?? null,
          isVerified: builderFull?.is_verified ?? null,
        },
      })
        await sendOfficialMistriAgreementEmail(agreementPayload)
      } catch (agreementErr) {
        console.error('Official mistri agreement email failed (non-fatal):', agreementErr)
      }
    }
  } catch (err) {
    console.error('Selection email failed (non-fatal):', err)
  }

  revalidatePath(`/dashboard/owner/project/${projectId}`)
  return { error: null }
}
