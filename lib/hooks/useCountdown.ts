'use client';

import { useState, useEffect, useRef } from 'react';
import { getCountdown } from '../utils';
import type { CountdownTime } from '../types';

export function useCountdown(targetDateISO: string | null | undefined): CountdownTime {
  const [countdown, setCountdown] = useState<CountdownTime>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!targetDateISO) return;

    function tick() {
      const next = getCountdown(targetDateISO!);
      setCountdown(next);
      if (!next.isExpired) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetDateISO]);

  return countdown;
}
