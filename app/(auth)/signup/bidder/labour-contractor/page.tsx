import { redirect } from 'next/navigation';

export default function LabourContractorSignupPage() {
  redirect('/register?role=labour_contractor');
}
