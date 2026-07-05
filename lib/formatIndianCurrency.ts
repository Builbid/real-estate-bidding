/** Parse Indian currency input (digits only) to number */
export function parseIndianAmount(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

/** Format number as Indian compact currency e.g. ₹25 Lakh */
export function formatIndianCompact(amount: number): string {
  if (amount >= 1_00_00_000) {
    const cr = amount / 1_00_00_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Cr`;
  }
  if (amount >= 1_00_000) {
    const lakh = amount / 1_00_000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatBudgetRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatIndianCompact(min)} — ${formatIndianCompact(max)}`;
  if (min != null) return `From ${formatIndianCompact(min)}`;
  return `Up to ${formatIndianCompact(max!)}`;
}

/** Format typed input with Indian grouping for display in input */
export function formatIndianInputDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('en-IN');
}
