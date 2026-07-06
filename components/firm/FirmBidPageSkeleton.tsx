import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function FirmBidPageSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded-full bg-secondary" />
          <div className="h-6 w-64 max-w-full rounded bg-secondary" />
        </div>
      </div>

      <div className="h-24 rounded-xl bg-secondary/60" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-secondary" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 rounded bg-secondary" />
                <div className="h-3 w-28 rounded bg-secondary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="h-32 rounded-lg bg-secondary/50" />
            <div className="h-10 rounded-lg bg-secondary/50" />
            <div className="h-10 rounded-lg bg-secondary/50" />
            <div className="h-11 rounded-lg bg-secondary/70" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="h-5 w-36 rounded bg-secondary" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-secondary/50" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
