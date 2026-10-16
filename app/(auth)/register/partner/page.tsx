import { redirect } from 'next/navigation';

export default function RegisterPartnerPage() {
  redirect('/register?role=labour_contractor');
}
