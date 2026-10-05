import {
  parseElectricianWiringType,
  parsePlumbingFittingType,
  parseTradeDetails,
} from '@/lib/tradeWorkDetails';

/** Locality written on the project, kept separate from district and pincode. */
export function agreementSiteAddress(tradeDetails: unknown): string {
  const details = parseTradeDetails(tradeDetails);
  const address = details?.projectAddress?.trim() || '';
  if (address) return address;
  return details?.villageTownName?.trim() || '';
}

/** Electrical and plumbing agreements show one fitting line taken from the project specification. */
export function agreementFittingLabel(
  serviceType: string | null | undefined,
  tradeDetails: unknown,
): string | null {
  const service = (serviceType ?? '').toLowerCase();
  if (service !== 'electrician' && service !== 'plumber') return null;
  const details = parseTradeDetails(tradeDetails);
  if (!details) return null;

  if (service === 'electrician' && details.service === 'electrician') {
    const wiring =
      details.electricianWiringType ?? parseElectricianWiringType(details.concealedWiring);
    if (wiring === 'concealed') return 'Concealed Fitting';
    if (wiring === 'surface_casing') return 'Non-Concealed Fitting';
    return null;
  }

  if (service === 'plumber' && details.service === 'plumber') {
    const fitting =
      details.plumbingFittingType ??
      parsePlumbingFittingType(
        details.concealedPiping === true
          ? 'concealed'
          : details.concealedPiping === false
            ? 'open_surface'
            : null,
      );
    if (fitting === 'concealed') return 'Concealed Fitting';
    if (fitting === 'open_surface') return 'Non-Concealed Fitting';
  }

  return null;
}
