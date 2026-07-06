import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RoleGuardBlockedProps {
  message: string;
  backHref: string;
  backLabel?: string;
}

export function RoleGuardBlocked({
  message,
  backHref,
  backLabel = 'Back to Dashboard',
}: RoleGuardBlockedProps) {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground mb-2">Access Restricted</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
