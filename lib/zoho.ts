/**
 * Server-only Zoho CRM delivery for new builbid.in events.
 * India data center (accounts.zoho.in), overridable with ZOHO_ACCOUNTS_URL.
 *
 * This module never reads or writes existing business tables. The only database
 * writes are inserts and status updates on the zoho_sync_outbox queue. When
 * ZOHO_REFRESH_TOKEN is empty, it reads the refresh token stored by the OAuth
 * callback in zoho_oauth.
 * Past profiles, projects, and prototype rows are left untouched.
 *
 * Do not import this from client components — it reads Zoho client secrets.
 */

import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { postZohoForm, zohoClientId, zohoClientSecret, zohoEnv, zohoTokenUrl } from '@/lib/zohoConfig';

let storedRefreshToken: string | null = null;
const DEFAULT_API_DOMAIN = 'https://www.zohoapis.in';
const REQUEST_TIMEOUT_MS = 8_000;
const IMMEDIATE_ATTEMPTS = 3;
const MAX_OUTBOX_ATTEMPTS = 48;

export type ZohoSyncEvent = 'registration' | 'project' | 'supervisor_onboarding' | 'contact';

export interface ZohoLeadInput {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  event: ZohoSyncEvent;
  details?: string | null;
}

interface SanitizedLead extends ZohoLeadInput {
  ref: string;
  fullName: string;
  email: string;
  phone: string;
}

interface PushResult {
  ok: boolean;
  retryable: boolean;
  id?: string;
  error?: string;
}

type TokenCache = {
  accessToken: string;
  apiDomain: string;
  expiresAt: number;
};

type ZohoTokenPayload = {
  access_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
};

type ZohoRow = {
  status?: string;
  code?: string;
  message?: string;
  details?: { id?: string; api_name?: string; duplicate_record?: { id?: string } };
  Description?: string;
  id?: string;
};

type ZohoWritePayload = {
  data?: ZohoRow[];
  code?: string;
  message?: string;
};

type OutboxRow = {
  id: string;
  payload: unknown;
  attempts: number;
};

let tokenCache: TokenCache | null = null;

function credential(name: 'ZOHO_CLIENT_ID' | 'ZOHO_CLIENT_SECRET' | 'ZOHO_REFRESH_TOKEN'): string {
  if (name === 'ZOHO_CLIENT_ID') return zohoClientId();
  if (name === 'ZOHO_CLIENT_SECRET') return zohoClientSecret();
  return zohoEnv(name);
}

/** Env token wins. The callback row is used when Vercel has not been given ZOHO_REFRESH_TOKEN yet. */
async function resolveRefreshToken(): Promise<string> {
  const fromEnv = credential('ZOHO_REFRESH_TOKEN');
  if (fromEnv) return fromEnv;
  if (storedRefreshToken) return storedRefreshToken;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return '';
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('zoho_oauth')
      .select('refresh_token')
      .eq('id', 'default')
      .maybeSingle();
    if (error || typeof data?.refresh_token !== 'string') return '';
    storedRefreshToken = data.refresh_token.trim();
    return storedRefreshToken;
  } catch {
    return '';
  }
}

function clean(value: string | null | undefined, max: number): string {
  return (value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function formatPhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return '';
}

function validEmail(value: string): boolean {
  return value.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: 'BuilBid User' };
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function roleLabel(role: string | null | undefined): string {
  switch ((role ?? '').trim()) {
    case 'owner':
      return 'Project owner';
    case 'labour_contractor':
      return 'Contractor / worker';
    case 'construction_firm':
      return 'Construction firm';
    case 'service_provider':
      return 'Trade service provider';
    case 'field_supervisor':
      return 'Field supervisor';
    default:
      return role?.trim() || 'BuilBid user';
  }
}

function eventLabel(event: ZohoSyncEvent): string {
  switch (event) {
    case 'registration':
      return 'New user signup';
    case 'project':
      return 'Homeowner project post';
    case 'supervisor_onboarding':
      return 'Contractor / supervisor onboarding';
    case 'contact':
      return 'Contact form submission';
  }
}

function sanitizeLead(input: ZohoLeadInput, ref: string): SanitizedLead | null {
  const email = clean(input.email, 200).toLowerCase();
  const phone = formatPhone(input.phone);
  const safeEmail = validEmail(email) ? email : '';
  if (!safeEmail && !phone) return null;

  const details = (input.details ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 2000);

  return {
    ref,
    fullName: clean(input.fullName, 120) || 'BuilBid User',
    email: safeEmail,
    phone,
    company: clean(input.company, 200),
    role: clean(input.role, 80),
    street: clean(input.street, 250),
    city: clean(input.city, 80),
    state: clean(input.state, 80),
    zipCode: clean(input.zipCode, 12),
    event: input.event,
    details,
  };
}

function leadDescription(lead: SanitizedLead): string {
  return [
    `Ref:${lead.ref}`,
    'Source: builbid.in',
    `Event: ${eventLabel(lead.event)}`,
    `Account role: ${roleLabel(lead.role)}`,
    `Recorded: ${new Date().toISOString()}`,
    lead.details || '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 3000);
}

function buildLeadRecord(lead: SanitizedLead): Record<string, string> {
  const { firstName, lastName } = splitName(lead.fullName);
  const record: Record<string, string> = {
    Last_Name: lastName,
    Company: lead.company || 'BuilBid',
    Description: leadDescription(lead),
    Country: 'India',
  };
  if (firstName) record.First_Name = firstName;
  if (lead.email) record.Email = lead.email;
  if (lead.phone) {
    record.Phone = lead.phone;
    record.Mobile = lead.phone;
  }
  if (lead.street) record.Street = lead.street;
  if (lead.city) record.City = lead.city;
  if (lead.state) record.State = lead.state;
  if (lead.zipCode) record.Zip_Code = lead.zipCode;
  return record;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logFailure(lead: Pick<SanitizedLead, 'ref' | 'event'>, message: string): void {
  console.error('[zoho-crm] sync failed', { ref: lead.ref, event: lead.event, message });
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<{ accessToken: string; apiDomain: string }> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return { accessToken: tokenCache.accessToken, apiDomain: tokenCache.apiDomain };
  }

  const clientId = credential('ZOHO_CLIENT_ID');
  const clientSecret = credential('ZOHO_CLIENT_SECRET');
  const refreshToken = await resolveRefreshToken();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('ZOHO_REFRESH_TOKEN is not set.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await postZohoForm(zohoTokenUrl(), body);
  let payload: ZohoTokenPayload | null = null;
  if (response.text) {
    try {
      payload = JSON.parse(response.text) as ZohoTokenPayload;
    } catch {
      payload = null;
    }
  }
  if (!payload || !payload.access_token || payload.error || response.status < 200 || response.status >= 300) {
    tokenCache = null;
    throw new Error(payload?.error || `Zoho token refresh failed (${response.status}).`);
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
  const apiDomain = (payload.api_domain || DEFAULT_API_DOMAIN).replace(/\/$/, '');
  tokenCache = {
    accessToken: payload.access_token,
    apiDomain,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };
  return { accessToken: payload.access_token, apiDomain };
}

async function zohoFetch(
  url: string,
  accessToken: string,
  init?: { method?: string; body?: string },
): Promise<{ status: number; payload: ZohoWritePayload | null }> {
  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson<ZohoWritePayload>(response);
  return { status: response.status, payload };
}

function criteriaValue(value: string): string {
  return value.replace(/([,()\\])/g, '\\$1');
}

async function findLeadByRef(
  apiDomain: string,
  accessToken: string,
  lead: SanitizedLead,
): Promise<string | null> {
  const field = lead.email ? 'Email' : 'Phone';
  const value = lead.email || lead.phone;
  const criteria = `(${field}:equals:${criteriaValue(value)})`;
  const { status, payload } = await zohoFetch(
    `${apiDomain}/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}&fields=id,Description`,
    accessToken,
  );
  if (status === 204 || !payload?.data) return null;
  const ref = `Ref:${lead.ref}`;
  const match = payload.data.find((row) => row.Description?.includes(ref) && row.id);
  return match?.id ?? null;
}

async function appendEvent(
  apiDomain: string,
  accessToken: string,
  leadId: string,
  lead: SanitizedLead,
): Promise<boolean> {
  const note = await zohoFetch(`${apiDomain}/crm/v2/Leads/${leadId}/Notes`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      data: [
        {
          Note_Title: `BuilBid ${eventLabel(lead.event)}`.slice(0, 120),
          Note_Content: leadDescription(lead).slice(0, 6000),
        },
      ],
    }),
  });
  if (note.payload?.data?.[0]?.status === 'success') return true;

  const current = await zohoFetch(`${apiDomain}/crm/v2/Leads/${leadId}?fields=Description`, accessToken);
  const existing = current.payload?.data?.[0]?.Description ?? '';
  const ref = `Ref:${lead.ref}`;
  if (existing.includes(ref)) return true;
  const description = `${existing}\n\n${leadDescription(lead)}`.slice(-3000);
  const updated = await zohoFetch(`${apiDomain}/crm/v2/Leads/${leadId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ data: [{ id: leadId, Description: description }] }),
  });
  return updated.payload?.data?.[0]?.status === 'success';
}

function retryableStatus(status: number, row: ZohoRow | undefined): boolean {
  if (status === 429 || status >= 500) return true;
  const code = row?.code ?? '';
  return code === 'INTERNAL_ERROR' || code === 'UNABLE_TO_PROCESS' || code === 'REQUEST_TIMEOUT';
}

async function pushOnce(lead: SanitizedLead, attempt: number): Promise<PushResult> {
  if (!(await resolveRefreshToken())) {
    return { ok: false, retryable: true, error: 'ZOHO_REFRESH_TOKEN is not set.' };
  }

  const { accessToken, apiDomain } = await getAccessToken();
  if (attempt > 0) {
    const existingId = await findLeadByRef(apiDomain, accessToken, lead);
    if (existingId) return { ok: true, retryable: false, id: existingId };
  }

  const record = buildLeadRecord(lead);
  let written = await zohoFetch(`${apiDomain}/crm/v2/Leads`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ data: [record], trigger: ['workflow'] }),
  });
  let row = written.payload?.data?.[0];

  if (row?.status === 'error' && row.code === 'INVALID_DATA' && row.details?.api_name) {
    const field = row.details.api_name;
    if (field in record && field !== 'Last_Name' && field !== 'Email' && field !== 'Phone') {
      delete record[field];
      written = await zohoFetch(`${apiDomain}/crm/v2/Leads`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ data: [record], trigger: ['workflow'] }),
      });
      row = written.payload?.data?.[0];
    }
  }

  if (row?.status === 'success' && row.details?.id) {
    return { ok: true, retryable: false, id: row.details.id };
  }

  if (row?.code === 'DUPLICATE_DATA') {
    const duplicateId = row.details?.duplicate_record?.id || row.details?.id;
    if (duplicateId) {
      const appended = await appendEvent(apiDomain, accessToken, duplicateId, lead);
      if (appended) return { ok: true, retryable: false, id: duplicateId };
    }
    return { ok: false, retryable: true, error: 'Zoho already has this contact and the new event was not saved yet.' };
  }

  const message = row?.message || written.payload?.message || `Zoho lead insert failed (${written.status}).`;
  return { ok: false, retryable: retryableStatus(written.status, row), error: message };
}

async function deliverWithRetries(lead: SanitizedLead): Promise<PushResult> {
  let last: PushResult = { ok: false, retryable: true, error: 'Zoho sync did not run.' };
  for (let attempt = 0; attempt < IMMEDIATE_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(attempt === 1 ? 1000 : 3000);
    try {
      last = await pushOnce(lead, attempt);
    } catch (err) {
      tokenCache = null;
      const message = err instanceof Error ? err.message : 'Zoho CRM request failed.';
      last = { ok: false, retryable: true, error: message };
    }
    if (last.ok || !last.retryable) return last;
    if (last.error === 'ZOHO_REFRESH_TOKEN is not set.') return last;
  }
  return last;
}

function nextAttemptIso(attempts: number): string {
  const minutes = Math.min(60, Math.max(2, 2 ** Math.min(attempts, 6)));
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function missingOutbox(message: string): boolean {
  return /zoho_sync_outbox|schema cache|does not exist|could not find the table/i.test(message);
}

async function insertOutbox(lead: SanitizedLead): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('zoho_sync_outbox').insert({
      id: lead.ref,
      event: lead.event,
      payload: lead,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    });
    if (error) {
      if (!missingOutbox(error.message)) {
        console.error('[zoho-crm] could not store sync queue row', { ref: lead.ref, message: error.message });
      }
      return false;
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'outbox unavailable';
    if (!/SUPABASE_SERVICE_ROLE_KEY/i.test(message)) {
      console.error('[zoho-crm] could not store sync queue row', { ref: lead.ref, message });
    }
    return false;
  }
}

async function markOutbox(lead: SanitizedLead, result: PushResult, attemptsBase: number): Promise<void> {
  try {
    const admin = createAdminClient();
    const attempts = attemptsBase + 1;
    if (result.ok) {
      await admin
        .from('zoho_sync_outbox')
        .update({
          status: 'synced',
          attempts,
          zoho_lead_id: result.id ?? null,
          last_error: null,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.ref);
      return;
    }

    const giveUp = !result.retryable || attempts >= MAX_OUTBOX_ATTEMPTS;
    await admin
      .from('zoho_sync_outbox')
      .update({
        status: giveUp ? 'failed' : 'pending',
        attempts,
        last_error: (result.error ?? 'Zoho sync failed.').slice(0, 500),
        next_attempt_at: giveUp ? null : nextAttemptIso(attempts),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.ref);
  } catch {
    // The live request already finished. A missed status write is retried by the cron claim.
  }
}

async function persistAndDeliver(lead: SanitizedLead): Promise<void> {
  const stored = await insertOutbox(lead);
  const result = await deliverWithRetries(lead);
  if (stored) await markOutbox(lead, result, 0);
  if (result.ok) {
    console.info('[zoho-crm] lead recorded', { ref: lead.ref, event: lead.event, id: result.id });
    return;
  }
  logFailure(lead, result.error ?? 'Zoho sync failed.');
}

function parseStoredLead(payload: unknown, ref: string): SanitizedLead | null {
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as Partial<SanitizedLead>;
  if (
    row.event !== 'registration' &&
    row.event !== 'project' &&
    row.event !== 'supervisor_onboarding' &&
    row.event !== 'contact'
  ) {
    return null;
  }
  return sanitizeLead(
    {
      fullName: row.fullName ?? '',
      email: row.email,
      phone: row.phone,
      company: row.company,
      role: row.role,
      street: row.street,
      city: row.city,
      state: row.state,
      zipCode: row.zipCode,
      event: row.event,
      details: row.details,
    },
    ref,
  );
}

/**
 * Record a new live event in Zoho after the response is sent.
 * Signup, onboarding, project posting, and the contact form stay fast even if Zoho is slow.
 */
export function queueZohoLead(input: ZohoLeadInput): void {
  const lead = sanitizeLead(input, crypto.randomUUID());
  if (!lead) {
    console.error('[zoho-crm] skipped event with no email or phone', { event: input.event });
    return;
  }

  const run = () => {
    void persistAndDeliver(lead);
  };

  try {
    after(async () => {
      await persistAndDeliver(lead);
    });
  } catch {
    run();
  }
}

/** Retry queued events whose first delivery did not reach Zoho. Does not read business tables. */
export async function retryPendingZohoLeads(limit = 15): Promise<{ attempted: number; synced: number }> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { attempted: 0, synced: 0 };
  }

  const now = new Date().toISOString();
  const staleSending = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('zoho_sync_outbox')
    .select('id, payload, attempts, status, updated_at, next_attempt_at')
    .in('status', ['pending', 'sending'])
    .order('created_at', { ascending: true })
    .limit(limit * 3);

  if (error || !data) {
    if (error && !missingOutbox(error.message)) {
      console.error('[zoho-crm] retry query failed', error.message);
    }
    return { attempted: 0, synced: 0 };
  }

  const due = (data as Array<OutboxRow & { status?: string; updated_at?: string; next_attempt_at?: string }>)
    .filter((row) => {
      if (row.status === 'sending') return (row.updated_at ?? '') <= staleSending;
      return (row.next_attempt_at ?? now) <= now;
    })
    .slice(0, limit);

  let synced = 0;
  for (const row of due) {
    const lead = parseStoredLead(row.payload, row.id);
    if (!lead) {
      await admin
        .from('zoho_sync_outbox')
        .update({ status: 'failed', last_error: 'Stored lead payload was invalid.', updated_at: now })
        .eq('id', row.id);
      continue;
    }

    const { data: claimed } = await admin
      .from('zoho_sync_outbox')
      .update({ status: 'sending', updated_at: now })
      .eq('id', row.id)
      .in('status', ['pending', 'sending'])
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    let result: PushResult;
    try {
      result = await pushOnce(lead, Math.max(1, row.attempts));
    } catch (err) {
      tokenCache = null;
      const message = err instanceof Error ? err.message : 'Zoho CRM request failed.';
      result = { ok: false, retryable: true, error: message };
    }
    await markOutbox(lead, result, row.attempts);
    if (result.ok) synced += 1;
    else logFailure(lead, result.error ?? 'Zoho retry failed.');
  }

  return { attempted: due.length, synced };
}
