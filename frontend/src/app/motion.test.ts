import { describe, expect, it } from 'vitest';

import { getStaggerDelay, prefersReducedMotion } from './motion';

describe('motion utilities', () => {
  it('returns capped stagger delays', () => {
    expect(getStaggerDelay(0)).toBe('0ms');
    expect(getStaggerDelay(3)).toBe('270ms');
    expect(getStaggerDelay(20)).toBe('540ms');
  });

  it('detects reduced motion when matchMedia reports it', () => {
    const media = {
      matches: true,
    } as MediaQueryList;
    const target = {
      matchMedia: () => media,
    } as Pick<Window, 'matchMedia'>;

    expect(prefersReducedMotion(target)).toBe(true);
  });
});
