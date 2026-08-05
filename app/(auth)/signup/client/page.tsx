import { redirect } from 'next/navigation';

export default function SignupClientPage() {
  redirect('/register?role=owner');
}
