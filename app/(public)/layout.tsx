import { Footer } from '@/components/shared/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex max-h-fit min-h-0 flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
}
