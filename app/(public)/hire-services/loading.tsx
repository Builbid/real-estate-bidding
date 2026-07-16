import { Navbar } from '@/components/shared/Navbar';

export default function HireServicesLoading() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-20 animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-6" />
        <div className="h-9 w-48 bg-muted rounded mb-2" />
        <div className="h-4 w-full max-w-xl bg-muted rounded mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/40 p-6 h-36" />
          ))}
        </div>
      </main>
    </>
  );
}
