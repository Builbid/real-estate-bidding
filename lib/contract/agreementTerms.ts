/** Grace period and penalty wording shared by the agreement page and the PDF. */

export function graceDaysForService(
  serviceType: string | null | undefined,
  isMistriCivil = false,
): number {
  if (isMistriCivil) return 7;
  const service = (serviceType ?? '').toLowerCase();
  if (
    !service ||
    service === 'labour_contractor' ||
    service === 'construction_firm' ||
    service === 'civil_construction' ||
    service === 'mistri'
  ) {
    return 7;
  }
  return 5;
}

export function graceExtensionLabel(days: number): string {
  return `${days} calendar days, penalty free`;
}

export const PAYMENT_GATEWAY_CLAUSE =
  'Mandatory BuilBid Payment Gateway: all funds flow through BuilBid (Homeowner → BuilBid Payment Gateway → Worker). Direct cash payments to the worker are prohibited and void platform guarantees.';

export const DELAY_PENALTY_CLAUSE =
  'If the work runs past the grace period, a 5% penalty per week or milestone is applied through the BuilBid Payment Gateway, as specified in these terms.';
