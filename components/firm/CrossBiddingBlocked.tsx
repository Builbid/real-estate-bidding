import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface CrossBiddingBlockedProps {
  variant: 'firm_only' | 'contractor_only';
  backHref: string;
}

const COPY = {
  firm_only: {
    title: 'Construction Firm Project',
    body: 'This project is for Construction Firms only. You are registered as a Labour Contractor.',
    emoji: '🏗️',
  },
  contractor_only: {
    title: 'Labour Contractor Project',
    body: 'This project is for Labour Contractors only. You are registered as a Construction Firm.',
    emoji: '👷',
  },
};

export function CrossBiddingBlocked({ variant, backHref }: CrossBiddingBlockedProps) {
  const { title, body, emoji } = COPY[variant];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl">
            {emoji}
          </div>
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
