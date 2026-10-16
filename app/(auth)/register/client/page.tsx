import { redirect } from 'next/navigation';

export default function RegisterClientPage() {
  redirect('/register?role=owner');
}
