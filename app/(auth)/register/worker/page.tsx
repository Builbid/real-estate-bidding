import { redirect } from 'next/navigation';

export default function RegisterWorkerPage() {
  redirect('/register?role=labour_contractor');
}
