import { redirect } from 'next/navigation';

export default function ProjectOwnerSignupPage() {
  redirect('/register?role=owner');
}
