import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from './gsap';

/**
 * Writes `format(value)` into the returned element, counting from the previous value when
 * it changes (instant under reduced motion). React renders the final text, so the right
 * number shows even if the tween never runs.
 */
export function useCountUp<T extends HTMLElement>(value: number, format: (v: number) => string, duration = 0.8) {
  const ref = useRef<T>(null);
  const shown = useRef(value);
  // Callers usually pass a new function each render; only a new value should restart the count.
  const formatRef = useRef(format);
  formatRef.current = format;
  useLayoutEffect(() => {
    const format = formatRef.current;
    const el = ref.current;
    const from = shown.current;
    shown.current = value;
    if (!el || from === value || prefersReducedMotion()) return;
    const counter = { v: from };
    el.textContent = format(from);
    const tween = gsap.to(counter, {
      v: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = format(counter.v);
      },
      onComplete: () => {
        el.textContent = format(value);
      },
    });
    return () => {
      tween.kill();
      el.textContent = format(value);
    };
  }, [value, duration]);
  return ref;
}
