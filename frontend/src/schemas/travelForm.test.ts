import { describe, expect, it } from 'vitest';

import { travelFormSchema } from './travelForm';

describe('travelFormSchema', () => {
  it('accepts a complete quick travel request', () => {
    const result = travelFormSchema.safeParse({
      destination: '山西',
      duration_days: 10,
      traveler_composition: { adults: 2, elders: 2, children: 1 },
      detail_level: 'deep',
      language: 'zh-CN',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty traveler composition', () => {
    const result = travelFormSchema.safeParse({
      destination: '山西',
      traveler_composition: { adults: 0, elders: 0, children: 0 },
    });

    expect(result.success).toBe(false);
  });
});
