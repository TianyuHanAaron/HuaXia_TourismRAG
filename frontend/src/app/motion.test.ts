import { describe, expect, it } from 'vitest';

import {
  getMotionDurationMs,
  getMotionStyle,
  getStaggerDelay,
  motionDurations,
  motionEasings,
  prefersReducedMotion,
} from './motion';

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

  it('defines V6 production timing and easing tokens', () => {
    expect(motionDurations).toMatchObject({
      instant: 80,
      fast: 140,
      base: 220,
      slow: 320,
      deferred: 900,
    });
    expect(motionEasings).toMatchObject({
      standard: expect.stringContaining('cubic-bezier'),
      emphasized: expect.stringContaining('cubic-bezier'),
    });
  });

  it('builds reduced-motion-safe transition styles without removing feedback', () => {
    expect(getMotionDurationMs('base')).toBe(220);
    expect(getMotionDurationMs('base', true)).toBe(1);
    expect(getMotionStyle('base')).toMatchObject({
      transitionDuration: '220ms',
      transitionTimingFunction: motionEasings.standard,
    });
    expect(getMotionStyle('slow', { reducedMotion: true, transform: 'translateY(8px)' })).toMatchObject({
      transitionDuration: '1ms',
      animationDuration: '1ms',
      transform: 'none',
    });
  });
});
