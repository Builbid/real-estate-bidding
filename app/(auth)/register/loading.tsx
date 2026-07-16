export default function RegisterLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 animate-pulse">
      <div className="w-full max-w-md space-y-6">
        <div className="h-10 w-40 bg-muted rounded mx-auto" />
        <div className="rounded-2xl border border-border p-8 space-y-4">
          <div className="h-11 bg-muted rounded-lg" />
          <div className="h-11 bg-muted rounded-lg" />
          <div className="h-11 bg-muted rounded-lg" />
          <div className="h-12 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}
