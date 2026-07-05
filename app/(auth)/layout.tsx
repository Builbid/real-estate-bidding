import { Footer } from '@/components/shared/Footer';
import { Navbar } from '@/components/shared/Navbar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer compact />
    </div>
  );
}
