import { describe, expect, it } from 'vitest';

import {
  calculateInclusiveTripDays,
  chinaRegionOptions,
  destinationTextFromSelections,
} from './chinaRegions';

describe('chinaRegions', () => {
  it('contains real province-grouped Chinese regions', () => {
    expect(chinaRegionOptions.some((item) => item.province === '河南省' && item.label === '洛阳市')).toBe(true);
    expect(chinaRegionOptions.some((item) => item.province === '新疆维吾尔自治区' && item.label === '喀什地区')).toBe(true);
    expect(chinaRegionOptions.some((item) => item.province === '广西壮族自治区' && item.label === '桂林市')).toBe(true);
  });

  it('does not duplicate direct-admin city labels in the autocomplete list', () => {
    const labels = chinaRegionOptions.map((item) => item.label);
    expect(labels.filter((label) => label === '北京市')).toHaveLength(1);
    expect(labels.filter((label) => label === '天津市')).toHaveLength(1);
    expect(labels.filter((label) => label === '上海市')).toHaveLength(1);
    expect(labels.filter((label) => label === '重庆市')).toHaveLength(1);
  });

  it('calculates inclusive travel days from start and return dates', () => {
    expect(calculateInclusiveTripDays('2026-10-01', '2026-10-05')).toBe(5);
    expect(calculateInclusiveTripDays('2026-10-05', '2026-10-05')).toBe(1);
    expect(calculateInclusiveTripDays('2026-10-06', '2026-10-05')).toBeNull();
  });

  it('joins multiple destinations for the backend DTO string field', () => {
    expect(destinationTextFromSelections(['山西省', '大同市', '平遥县'])).toBe('山西省、大同市、平遥县');
  });
});
