// Step transitions for the scroll graphics. Each graphic describes the target state of a
// step as a list of moves; `transition` animates there with GSAP, snaps there under
// prefers-reduced-motion, and still lands there (without GSAP) if an animation throws.
import { gsap, prefersReducedMotion } from './gsap';

export interface MotionVars {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  opacity?: number;
  attr?: Record<string, number | string>;
  /** DrawSVGPlugin value, e.g. '0%', '100%', '0% 40%'. */
  drawSVG?: string;
  /** CSS clip-path, e.g. 'inset(0% 0% 0% 0%)'. */
  clipPath?: string;
  transformOrigin?: string;
}

type Targets = Element | null | undefined | (Element | null | undefined)[];

export interface Move {
  targets: Targets;
  vars: MotionVars;
  /** Seconds from the start of the transition. */
  at?: number;
  duration?: number;
  stagger?: number;
  ease?: string;
}

export const DURATION = 1;
export const EASE = 'power2.inOut';

const list = (t: Targets): Element[] => (Array.isArray(t) ? t : [t]).filter((e): e is Element => e != null);

/** Applies the final state directly, without GSAP. */
export function applyVars(el: Element, vars: MotionVars) {
  const style = (el as HTMLElement | SVGElement).style;
  if (vars.opacity !== undefined) style.opacity = String(vars.opacity);
  if (vars.x !== undefined || vars.y !== undefined || vars.scale !== undefined || vars.scaleX !== undefined) {
    const scale = vars.scale ?? 1;
    style.transformBox = 'fill-box';
    style.transformOrigin = vars.transformOrigin ?? '50% 50%';
    style.transform = `translate(${vars.x ?? 0}px, ${vars.y ?? 0}px) scale(${(vars.scaleX ?? 1) * scale}, ${scale})`;
  }
  for (const [name, value] of Object.entries(vars.attr ?? {})) el.setAttribute(name, String(value));
  if (vars.drawSVG !== undefined) {
    const hidden = /^0%?$/.test(vars.drawSVG.trim()) || vars.drawSVG.trim() === '0% 0%';
    style.strokeDasharray = hidden ? '0 1000000' : 'none';
    style.strokeDashoffset = '0';
  }
  if (vars.clipPath !== undefined) style.clipPath = vars.clipPath;
}

export interface TransitionOptions {
  /** Snap to the final state (first render, reduced motion). */
  instant?: boolean;
  /**
   * The graphic this transition belongs to. Its previous transition is killed first, so a
   * delayed tween from an earlier step can never land after a later step (fast scrolling).
   */
  owner?: object;
}

const running = new WeakMap<object, gsap.core.Timeline>();

export function transition(moves: Move[], { instant = false, owner }: TransitionOptions = {}): gsap.core.Timeline | null {
  const snap = instant || prefersReducedMotion();
  if (owner) {
    running.get(owner)?.kill();
    running.delete(owner);
  }
  try {
    const tl = gsap.timeline({ defaults: { duration: DURATION, ease: EASE, overwrite: 'auto' } });
    for (const move of moves) {
      const targets = list(move.targets);
      if (targets.length === 0) continue;
      tl.to(
        targets,
        {
          ...move.vars,
          ...(move.duration !== undefined && { duration: move.duration }),
          ...(move.ease !== undefined && { ease: move.ease }),
          ...(move.stagger !== undefined && { stagger: move.stagger }),
        },
        move.at ?? 0,
      );
    }
    if (snap) {
      tl.progress(1);
      tl.kill();
      return null;
    }
    if (owner) running.set(owner, tl);
    return tl;
  } catch (error) {
    if (import.meta.env.DEV) console.error('transition failed; applying final state', error);
    for (const move of moves) for (const el of list(move.targets)) applyVars(el, move.vars);
    return null;
  }
}
