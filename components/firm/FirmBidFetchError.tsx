import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FirmBidFetchErrorProps {
  message?: string;
}

export function FirmBidFetchError({
  message = 'Could not load project details. Please go back and try again.',
}: FirmBidFetchErrorProps) {
  return (
    <div className="max-w-lg mx-auto">
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground mb-2">Unable to Load Project</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/firm">
              <ArrowLeft className="w-4 h-4" /> Back to Firm Console
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
