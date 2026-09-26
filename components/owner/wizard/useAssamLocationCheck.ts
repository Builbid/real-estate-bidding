'use client';

import { useEffect, useState } from 'react';
import { verifyAssamPincodeAction } from '@/app/actions/verifyAssamPincode';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';

/** Live Assam pincode check once a full 6-digit value and district are present. */
export function useAssamLocationCheck(input: {
  district: string;
  pincode: string;
  villageOrTown?: string;
}): string | null {
  const [liveError, setLiveError] = useState<string | null>(null);
  const village = input.villageOrTown ?? '';

  useEffect(() => {
    const pin = formatPincodeInput(input.pincode);
    if (pin.length < 6 || !input.district.trim()) {
      setLiveError(null);
      return;
    }
    const formatError = validatePincode(pin, { required: true, assamOnly: true });
    if (formatError) {
      setLiveError(formatError);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void verifyAssamPincodeAction({
        villageOrTown: village,
        district: input.district,
        pincode: pin,
      }).then((result) => {
        if (!cancelled) setLiveError(result.ok ? null : result.error);
      });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input.district, input.pincode, village]);

  return liveError;
}
