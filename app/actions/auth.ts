'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardPath, parseRole } from '@/lib/auth/roles'
import { portalForRole, type Portal } from '@/lib/auth/portal'
import { assertEmailFreeForRole } from '@/lib/auth/emailRoleGuard'
import { setActivePortalCookie, signInCustomerIsolated } from '@/lib/auth/serverSession'
import { validateGstNumber } from '@/lib/validation/gst'
import { stripMobileDigits, validateMobile } from '@/lib/validation/mobile'
import {
  parseConstructionPackagesFromForm,
  validateConstructionPackages,
} from '@/lib/firm/constructionClass'
import { isConstructionFirmEnabled } from '@/lib/features'
import type { UserRole } from '@/lib/types'

export type SignUpRole = 'owner' | 'labour_contractor' | 'construction_firm' | 'service_provider'

export interface SignUpResult {
  error: string | null
  success: boolean
  role?: SignUpRole
  redirectPath?: string
  autoSignedIn?: boolean
}

// ─── Sign In ────────────────────────────────────────────────────────────────
export async function signInAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email    = (formData.get('email')    as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null)         ?? ''
  const nextPath = (formData.get('next')     as string | null)         ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  // Session is stored only in the account's own portal namespace; staff are refused here.
  const result = await signInCustomerIsolated(email, password)
  if (result.error !== null) {
    return { error: result.error }
  }

  if (nextPath && nextPath.startsWith('/')) {
    redirect(nextPath)
  }

  redirect(result.redirectPath)
}

// ─── Sign Up ────────────────────────────────────────────────────────────────
export async function signUpAction(
  _prevState: SignUpResult,
  formData: FormData,
): Promise<SignUpResult> {
  const fullName = (formData.get('full_name') as string | null)?.trim() ?? ''
  const email    = (formData.get('email')     as string | null)?.trim() ?? ''
  const password = (formData.get('password')  as string | null)         ?? ''
  const roleRaw  = (formData.get('role')      as string | null)?.trim() ?? ''
  const mobile   = stripMobileDigits((formData.get('mobile') as string | null) ?? '')
  const address  = (formData.get('physical_address') as string | null)?.trim() ?? ''
  const pincode  = (formData.get('pincode')   as string | null)?.trim() ?? ''
  const companyName = (formData.get('company_name') as string | null)?.trim() ?? ''
  const gstNumber   = (formData.get('gst_number') as string | null)?.trim().toUpperCase() ?? ''
  const yearsRaw    = (formData.get('years_in_business') as string | null)?.trim() ?? ''
  const classPackages = parseConstructionPackagesFromForm(formData)

  // Never default a signup to the worker role: a missing/unknown role is rejected.
  // Unified account model: only an Owner Account or a Worker Account (stored as
  // `labour_contractor`) can be created. Legacy trade-specific `service_provider`
  // signups are folded into the Worker Account, which can bid on every category.
  const parsedRole = parseRole(roleRaw)
  const role: SignUpRole | null =
    parsedRole === 'owner' || parsedRole === 'construction_firm'
      ? parsedRole
      : parsedRole === 'labour_contractor' || parsedRole === 'service_provider'
        ? 'labour_contractor'
        : null

  if (!role) {
    return { error: 'Please choose an account type to continue.', success: false }
  }

  if (!fullName || !email || !password) {
    return { error: 'Please fill in all required fields.', success: false }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.', success: false }
  }

  const mobileError = validateMobile(mobile)
  if (mobileError) {
    return { error: mobileError, success: false }
  }

  if (role === 'construction_firm' && !isConstructionFirmEnabled()) {
    return {
      error: 'Construction Firm registration is not open yet. Please choose another account type.',
      success: false,
    }
  }

  if (role === 'construction_firm') {
    if (!companyName || companyName.length < 3) {
      return { error: 'Company name is required (minimum 3 characters).', success: false }
    }
    const gstError = validateGstNumber(gstNumber)
    if (gstError) {
      return { error: gstError, success: false }
    }
    const packageError = validateConstructionPackages(classPackages)
    if (packageError) {
      return { error: packageError, success: false }
    }
  }

  let yearsInBusiness: number | null = null
  if (role === 'construction_firm' && yearsRaw) {
    const parsed = parseInt(yearsRaw, 10)
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return { error: 'Years in business must be between 0 and 100.', success: false }
    }
    yearsInBusiness = parsed
  }

  const serviceType =
    role === 'construction_firm'
      ? 'construction_firm'
      : role === 'labour_contractor'
        ? 'labour_contractor'
        : null

  // One email = one role: Home Owner, Mistri/Worker and Supervisor/Admin each need their own email.
  const signupPortal: Portal = portalForRole(role) ?? 'owner'
  const emailConflict = await assertEmailFreeForRole(email, signupPortal)
  if (emailConflict) {
    return { error: emailConflict, success: false }
  }

  // The whole signup flow lives in this account type's own cookie namespace.
  const supabase = await createClient(signupPortal)

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://builbid.in'
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?portal=${signupPortal}`,
      data: { full_name: fullName, role, service_type: serviceType },
    },
  })

  if (signUpError) {
    return { error: signUpError.message || 'Sign-up failed. Please try again.', success: false }
  }

  if (!data.user) {
    return { error: 'Could not create account. Please try again.', success: false }
  }

  const profilePayload: Record<string, unknown> = {
    id:               data.user.id,
    email,
    full_name:        fullName,
    role,
    mobile:           mobile || null,
    physical_address: address  || null,
    pincode:          pincode  || null,
    service_type:     serviceType,
  }

  if (role === 'construction_firm') {
    profilePayload.company_name = companyName
    profilePayload.gst_number = gstNumber
    profilePayload.years_in_business = yearsInBusiness
    profilePayload.construction_class_packages = classPackages
  }

  const { error: profileError } = await supabase.from('profiles').upsert(profilePayload)

  if (profileError) {
    console.warn('Profile upsert warning (non-fatal):', profileError.message)
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  const redirectPath = getDashboardPath(role as UserRole)

  if (!signInError) {
    await setActivePortalCookie(signupPortal)
    return { error: null, success: true, role, redirectPath, autoSignedIn: true }
  }

  return { error: null, success: true, role, redirectPath, autoSignedIn: false }
}

// ─── Sign Out ───────────────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  // Signs out only the portal this request belongs to; other portals stay signed in.
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}
