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

function placesAlign(expected: string, actual: string): boolean {
  const left = compactPlace(expected);
  const right = compactPlace(actual);
  if (!left || !right || left.length < 3 || right.length < 3) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function assamLocationQuery(villageOrTown: string, district: string, pincode: string): string {
  const village = villageOrTown.trim();
  const pin = formatPincodeInput(pincode);
  return `${village ? `${village}, ` : ''}${district.trim()},${pin}, Assam`;
}

/** Confirms the pincode is a real Assam location for the selected district and village. */
export async function verifyAssamProjectLocation(input: {
  villageOrTown?: string;
  district: string;
  pincode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const pincodeError = validatePincode(input.pincode, { required: true, assamOnly: true });
  if (pincodeError) return { ok: false, error: pincodeError };

  const pincode = formatPincodeInput(input.pincode);
  const district = input.district.trim();
  const village = input.villageOrTown?.trim() ?? '';

  let offices: PostalOffice[] = [];
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
    offices = record.PostOffice.filter((office) => compactPlace(office.State ?? '') === 'assam');
  } catch {
    return { ok: false, error: ASSAM_PINCODE_ERROR };
  }

  if (offices.length === 0) return { ok: false, error: ASSAM_PINCODE_ERROR };

  const inDistrict = district
    ? offices.filter((office) => placesAlign(district, office.District ?? ''))
    : offices;
  if (inDistrict.length === 0) return { ok: false, error: ASSAM_PINCODE_ERROR };

  if (village && !assamLocationQuery(village, district, pincode).includes(pincode)) {
    return { ok: false, error: ASSAM_PINCODE_ERROR };
  }

  return { ok: true };
}
