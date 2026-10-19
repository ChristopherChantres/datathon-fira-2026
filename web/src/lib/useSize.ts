import { useLayoutEffect, useState, type RefObject } from 'react';

export interface Size {
  width: number;
  height: number;
}

/** Content-box size of an element, updated on resize (rounded to whole pixels). */
export function useSize(ref: RefObject<Element | null>): Size | null {
  const [size, setSize] = useState<Size | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (width: number, height: number) =>
      setSize((prev) =>
        prev && prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) },
      );
    const rect = el.getBoundingClientRect();
    update(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => entry && update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** True once the element comes within `margin` of the viewport (stays true). */
export function useNearViewport(ref: RefObject<Element | null>, margin = '100% 0px'): boolean {
  const [near, setNear] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), { rootMargin: margin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, near]);
  return near;
}
