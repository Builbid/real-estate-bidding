/** Grace period and penalty wording shared by the agreement page and the PDF. */

export function graceDaysForService(
  serviceType: string | null | undefined,
  isMistriCivil = false,
): number {
  if (isMistriCivil) return 10;
  const service = (serviceType ?? '').toLowerCase();
  if (
    !service ||
    service === 'labour_contractor' ||
    service === 'construction_firm' ||
    service === 'civil_construction' ||
    service === 'mistri'
  ) {
    return 10;
  }
  return 5;
}

export function graceExtensionLabel(days: number): string {
  return `${days} calendar days, penalty free`;
}

export const PAYMENT_GATEWAY_CLAUSE =
  'All payments go through the BuilBid Payment System (BuilBid Payment Gateway). Direct cash payments to the worker are prohibited and void platform guarantees.';

export const DELAY_PENALTY_CLAUSE =
  'If the work runs past the grace period, a 5% penalty per week or milestone is applied through the BuilBid Payment Gateway, as specified in these terms.';
