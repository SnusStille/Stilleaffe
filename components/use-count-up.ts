'use client';

import { useEffect, useRef, useState } from 'react';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a number towards `target`. Respects prefers-reduced-motion and the
 * user's "Tyst" motion setting by jumping straight to the value.
 */
export function useCountUp(target: number, duration = 850): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frame = useRef(0);

  useEffect(() => {
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('ll_motion') === 'quiet';
    if (reduced || !Number.isFinite(target)) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * easeOut(t);
      setValue(v);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
