export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div className="h-7 w-56 bg-muted rounded" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <div className="h-40 rounded-2xl bg-muted/80 border border-border" />
        <div className="h-40 rounded-2xl bg-muted/80 border border-border" />
      </div>
    </div>
  );
}
