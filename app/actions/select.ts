'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { sendSelectionNotification } from '@/lib/email/sendNotification'
import { getConstructionLabel } from '@/lib/utils'
import type { PackageBidPrice, SubConfiguration, TrackType } from '@/lib/types'
import { missingProjectsColumn } from '@/lib/project/storedDetails'
import { validateMobile, stripMobileDigits } from '@/lib/validation/mobile'
import { revalidatePath } from 'next/cache'
import { revalidateHomePublic } from '@/lib/home/revalidateHomePublic'

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
  rawPhone?: string,
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
  const phoneError = validateMobile(rawPhone ?? '')
  if (phoneError) return { error: phoneError }
  const confirmedPhone = stripMobileDigits(rawPhone ?? '')

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

  // Record the choice for the company phone check. Do not mark the project completed
  // and do not hand it to the field supervisor yet.
  const awardPatch: Record<string, unknown> = {
    selected_builder_id: builderId,
    call_verification_status: 'pending',
    owner_callback_phone: confirmedPhone,
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

  let missingAwardColumn = updateError
    ? missingProjectsColumn(updateError.message)
    : null
  while (
    updateError &&
    (missingAwardColumn === 'selected_package' || missingAwardColumn === 'agreement_completed')
  ) {
    delete awardPatch[missingAwardColumn]
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
    missingAwardColumn = updateError ? missingProjectsColumn(updateError.message) : null
  }

  if (
    updateError &&
    /call_verification_status|owner_callback_phone/i.test(updateError.message)
  ) {
    return {
      error: 'Run supabase/migrations/069_pending_call_verification.sql, then confirm the selection again.',
    }
  }

  if (updateError) return { error: updateError.message }
  if (!updated) {
    return { error: 'Could not award this project. Refresh and try again.' }
  }

  const now = new Date().toISOString()
  try {
    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({ mobile: confirmedPhone, updated_at: now })
      .eq('id', ownerId || userId)

    const [{ data: ownerProfile }, { data: builderFull }] = await Promise.all([
      admin.from('profiles').select('full_name, email, mobile, physical_address').eq('id', ownerId || userId).maybeSingle(),
      admin.from('profiles').select('full_name, email, mobile, physical_address, company_name').eq('id', builderId).maybeSingle(),
    ])

    const projectTitle = String(existing.title ?? '')
    const projectDistrict = String(existing.district ?? '')
    const builderLabel = builderName ?? (isFirmProject ? 'the selected firm' : 'the selected builder')
    const rateValue = selectedPackage?.rate ?? winningBid?.single_rate ?? winningBid?.total_sum_metric
    const bidAmt = selectedPackage
      ? `₹${selectedPackage.rate.toLocaleString('en-IN')}/sqft (${selectedPackage.package.name})`
      : rateValue
        ? `₹${Number(rateValue).toLocaleString('en-IN')}`
        : 'Pending company call'

    await admin.from('notifications').insert({
      user_id: ownerId || userId,
      type: 'builder_selected',
      title: 'Selection received',
      body: 'Thank you. BuilBid management will call your confirmed number shortly to verify this project before a field supervisor visits.',
    })

    await sendSelectionNotification({
      projectTitle,
      projectDistrict,
      constructionType: constructionLabel,
      bidAmountLabel: bidAmt,
      isFirmProject,
      selectedPackage,
      ownerName: ownerProfile?.full_name ?? 'N/A',
      ownerEmail: ownerProfile?.email ?? 'N/A',
      ownerMobile: confirmedPhone,
      ownerAddress: ownerProfile?.physical_address ?? null,
      builderName: builderFull?.company_name ?? builderFull?.full_name ?? builderLabel,
      builderEmail: builderFull?.email ?? 'N/A',
      builderMobile: builderFull?.mobile ?? null,
      builderAddress: builderFull?.physical_address ?? null,
    })
  } catch (err) {
    console.error('Pending-call notification failed (non-fatal):', err)
  }

  revalidatePath(`/dashboard/owner/project/${projectId}`)
  revalidatePath('/dashboard/owner')
  revalidatePath('/dashboard/profile')
  revalidatePath('/admin/dashboard')
  revalidateHomePublic()
  return { error: null, success: true }
}
