import type { CSSProperties } from 'react';

export type MotionToken = 'instant' | 'fast' | 'base' | 'slow' | 'deferred';
export type MotionEasingToken = 'standard' | 'emphasized';

export const motionDurations: Record<MotionToken, number> = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 320,
  deferred: 900,
};

export const motionEasings: Record<MotionEasingToken, string> = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

export const getStaggerDelay = (index: number, stepMs = 90, maxMs = 540): string => {
  const safeIndex = Math.max(0, index);
  return `${Math.min(safeIndex * stepMs, maxMs)}ms`;
};

export const prefersReducedMotion = (
  target: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window,
): boolean => Boolean(target?.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function getMotionDurationMs(token: MotionToken, reducedMotion = false): number {
  return reducedMotion ? 1 : motionDurations[token];
}

export function getMotionStyle(
  token: MotionToken,
  options: {
    reducedMotion?: boolean;
    easing?: MotionEasingToken;
    transform?: string;
  } = {},
): CSSProperties {
  const durationMs = getMotionDurationMs(token, options.reducedMotion);
  return {
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: motionEasings[options.easing ?? 'standard'],
    animationDuration: `${durationMs}ms`,
    animationTimingFunction: motionEasings[options.easing ?? 'standard'],
    transform: options.reducedMotion ? 'none' : options.transform,
  };
}
