import { ASSAM_PINCODE_ERROR, formatPincodeInput, validatePincode } from '@/lib/validation/pincode';

type PostalOffice = {
  Name?: string;
  Block?: string;
  District?: string;
  State?: string;
};

type PostalResponse = {
  Status?: string;
  PostOffice?: PostalOffice[] | null;
};

function compactPlace(value: string): string {
  return value
    .toLowerCase()
    .replace(/metropolitan/g, 'metro')
    .replace(/\bvillage\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Pincode-first map target. Village spelling is not required. */
export function assamPincodeMapQuery(pincode: string, district: string): string {
  return [formatPincodeInput(pincode) || pincode.trim(), district.trim(), 'Assam'].filter(Boolean).join(', ');
}

/** A 6-digit pincode starting with 78 passes when India Post lists it inside Assam. */
export async function verifyAssamProjectLocation(input: {
  villageOrTown?: string;
  district?: string;
  pincode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const pincodeError = validatePincode(input.pincode, { required: true, assamOnly: true });
  if (pincodeError) return { ok: false, error: pincodeError };

  const pincode = formatPincodeInput(input.pincode);

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { ok: false, error: ASSAM_PINCODE_ERROR };
    const payload = (await response.json()) as PostalResponse[];
    const record = payload?.[0];
    if (record?.Status !== 'Success' || !record.PostOffice?.length) {
      return { ok: false, error: ASSAM_PINCODE_ERROR };
    }
    const inAssam = record.PostOffice.some((office) => compactPlace(office.State ?? '') === 'assam');
    if (!inAssam) return { ok: false, error: ASSAM_PINCODE_ERROR };
  } catch {
    return { ok: false, error: ASSAM_PINCODE_ERROR };
  }

  return { ok: true };
}
