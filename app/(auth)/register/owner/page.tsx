import { redirect } from 'next/navigation';

export default function RegisterOwnerPage() {
  redirect('/register?role=owner');
}
