export default function PublicLoading() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="h-14 border-b border-border/60 bg-background/80" />
      <div className="mx-auto max-w-5xl animate-pulse px-4 pb-10 pt-6 sm:pt-8">
        <div className="mx-auto h-8 w-3/4 max-w-xl rounded-lg bg-muted" />
        <div className="mx-auto mt-4 h-4 w-48 rounded bg-muted/80" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/70" />
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl animate-pulse px-4 pb-16">
        <div className="mb-5 h-7 w-40 rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 rounded-2xl border border-border bg-muted/40" />
          <div className="h-64 rounded-2xl border border-border bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
