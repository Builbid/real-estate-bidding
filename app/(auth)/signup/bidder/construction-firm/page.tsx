import { redirect } from 'next/navigation';
import { isConstructionFirmEnabled } from '@/lib/features';

export default function ConstructionFirmSignupPage() {
  if (!isConstructionFirmEnabled()) {
    redirect('/register?role=bidder');
  }
  redirect('/register?role=construction_firm');
}
