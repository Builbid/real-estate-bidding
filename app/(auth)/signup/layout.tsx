import { SignupRoutePrefetch } from '@/components/auth/SignupRoutePrefetch';

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignupRoutePrefetch />
      {children}
    </>
  );
}
