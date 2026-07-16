export default function SignupLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 animate-pulse">
      <div className="w-full max-w-lg space-y-6">
        <div className="h-8 w-48 bg-muted rounded mx-auto" />
        <div className="h-4 w-64 bg-muted rounded mx-auto" />
        <div className="rounded-2xl border border-border p-8 space-y-4">
          <div className="h-20 bg-muted/80 rounded-xl" />
          <div className="h-20 bg-muted/80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
