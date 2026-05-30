export const getStaggerDelay = (index: number, stepMs = 90, maxMs = 540): string => {
  const safeIndex = Math.max(0, index);
  return `${Math.min(safeIndex * stepMs, maxMs)}ms`;
};

export const prefersReducedMotion = (
  target: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window,
): boolean => Boolean(target?.matchMedia('(prefers-reduced-motion: reduce)').matches);
