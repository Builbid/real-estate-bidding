'use server';

import { verifyAssamProjectLocation } from '@/lib/validation/assamLocation';

export async function verifyAssamPincodeAction(input: {
  villageOrTown?: string;
  district: string;
  pincode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return verifyAssamProjectLocation(input);
}
