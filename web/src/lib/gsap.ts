// The single place GSAP and its plugins are registered. Import gsap from here.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin, SplitText);

// docs/palette.md: Manim-like `smooth` motion.
gsap.defaults({ ease: 'power2.inOut', duration: 1 });

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the visitor asked for reduced motion; animations must then show final states. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
}

export { DrawSVGPlugin, gsap, MorphSVGPlugin, ScrollTrigger, SplitText, REDUCED_MOTION_QUERY };
