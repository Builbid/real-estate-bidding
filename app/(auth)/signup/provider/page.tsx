import { redirect } from 'next/navigation';

/**
 * Trade-specific provider signup was retired: every Worker registers one unified
 * Worker Account that can bid on all project categories.
 */
export default function ProviderSignupPage() {
  redirect('/register?role=labour_contractor');
}
