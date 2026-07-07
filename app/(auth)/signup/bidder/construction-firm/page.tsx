import { redirect } from 'next/navigation';

export default function ConstructionFirmSignupPage() {
  redirect('/register?role=construction_firm');
}
