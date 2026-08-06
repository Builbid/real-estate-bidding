import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { NavLink } from '@/components/shared/NavLink';
import { EstimateCalculator } from '@/components/estimate-calculator/EstimateCalculator';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Construction Material Estimate Calculator',
  description:
    'Approximate cement, steel, sand, aggregate and brick quantities for residential construction — Indian civil engineering thumb rules for budgeting.',
};

export default function EstimateCalculatorPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 pb-20">
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-6')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>
        <EstimateCalculator />
      </main>
    </>
  );
}
