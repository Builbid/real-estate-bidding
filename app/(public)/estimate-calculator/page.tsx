import type { Metadata } from 'next';
import { Navbar } from '@/components/shared/Navbar';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { EstimateCalculator } from '@/components/estimate-calculator/EstimateCalculator';

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
        <HistoryBackButton className="mb-6" />
        <EstimateCalculator />
      </main>
    </>
  );
}
