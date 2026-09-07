import { redirect } from 'next/navigation';
import { SignupProviderTradeSelection } from '@/components/auth/SignupProviderTradeSelection';
import { PRIMARY_PROVIDER_SIGNUP_SERVICE, isRetiredTradeService } from '@/lib/trades';

export default async function ProviderSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; role?: string }>;
}) {
  const params = await searchParams;
  if (isRetiredTradeService(params.service) || isRetiredTradeService(params.role)) {
    redirect('/signup/provider');
  }
  if (params.service === 'construction_firm' || params.role === 'construction_firm') {
    redirect(`/register?role=${PRIMARY_PROVIDER_SIGNUP_SERVICE}`);
  }
  return <SignupProviderTradeSelection />;
}
