'use server';

import { headers } from 'next/headers';
import { queueZohoLead } from '@/lib/zoho';
import { stripMobileDigits, validateMobile } from '@/lib/validation/mobile';

export interface ContactFormState {
  error: string | null;
  success: boolean;
}

const SUBJECTS = {
  account: 'Account and login',
  workmanship: 'Site workmanship and quality',
  payment: 'Payment and billing',
  general: 'General question',
} as const;

type SubjectKey = keyof typeof SUBJECTS;

const recentSubmissions = new Map<string, number[]>();

function clean(value: FormDataEntryValue | null, max: number): string {
  return (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (recentSubmissions.get(ip) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= 5) {
    recentSubmissions.set(ip, recent);
    return true;
  }
  recent.push(now);
  if (recentSubmissions.size > 1000) recentSubmissions.clear();
  recentSubmissions.set(ip, recent);
  return false;
}

export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const honeypot = clean(formData.get('company_website'), 200);
  if (honeypot) return { error: null, success: true };

  const fullName = clean(formData.get('full_name'), 120);
  const email = clean(formData.get('email'), 200).toLowerCase();
  const phoneRaw = clean(formData.get('phone'), 20);
  const phone = phoneRaw ? stripMobileDigits(phoneRaw) : '';
  const subjectKey = clean(formData.get('subject'), 40);
  const message = clean(formData.get('message'), 2000);

  if (fullName.length < 2) {
    return { error: 'Enter your name.', success: false };
  }
  if (!email && !phone) {
    return { error: 'Enter an email address or a mobile number.', success: false };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.', success: false };
  }
  if (phone) {
    const phoneError = validateMobile(phone);
    if (phoneError) return { error: phoneError, success: false };
  }
  if (!(subjectKey in SUBJECTS)) {
    return { error: 'Choose what this message is about.', success: false };
  }
  if (message.length < 10) {
    return { error: 'Describe your question in at least a few words.', success: false };
  }

  const headerList = await headers();
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'unknown';
  if (tooManyRequests(ip)) {
    return { error: 'Please wait a few minutes before sending another message.', success: false };
  }

  const subject = SUBJECTS[subjectKey as SubjectKey];
  queueZohoLead({
    fullName,
    email,
    phone,
    role: subject,
    event: 'contact',
    details: `Subject: ${subject}\n${message}`,
  });

  return { error: null, success: true };
}
