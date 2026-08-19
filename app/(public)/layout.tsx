import { Footer } from '@/components/shared/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground has-[[data-page-background]]:bg-transparent">
      {children}
      <Footer />
    </div>
  );
}
