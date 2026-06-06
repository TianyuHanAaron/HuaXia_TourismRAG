import { describe, expect, it } from 'vitest';

import {
  getV6HciStatusCopy,
  getV6ScreenQuestion,
  v6ForbiddenPrimaryCopy,
  v6ProviderFollowUpCopy,
  v6RecoveryCopy,
} from './v6HciCopy';

describe('V6 HCI copy system', () => {
  it('answers each primary screen with one traveler question', () => {
    expect(getV6ScreenQuestion('trip_home')).toBe('What should I do next?');
    expect(getV6ScreenQuestion('timeline')).toBe('Where am I in the trip?');
    expect(getV6ScreenQuestion('tasks')).toBe('What needs action now?');
    expect(getV6ScreenQuestion('provider_sheet')).toBe('Where will I go if I tap this?');
    expect(getV6ScreenQuestion('documents')).toBe('What proof or booking do I need?');
  });

  it('maps raw state into traveler-safe labels and helper copy', () => {
    expect(getV6HciStatusCopy('ready', 'en')).toEqual({
      label: 'Ready',
      helper: 'Route and fallback are prepared.',
    });
    expect(getV6HciStatusCopy('saved_locally', 'zh-CN')).toEqual({
      label: '已保存到本机',
      helper: '联网后会自动同步。',
    });
    expect(getV6HciStatusCopy('missing_route_context', 'en')).toEqual({
      label: 'Needs review',
      helper: 'Add a destination before opening maps.',
    });
  });

  it('defines recoverable copy and forbids implementation-facing primary labels', () => {
    expect(v6RecoveryCopy.missing_route_destination.en).toBe(
      'This route needs a destination before opening maps.',
    );
    expect(v6ProviderFollowUpCopy.en).toEqual([
      'I completed this',
      'Remind me later',
      'Something went wrong',
    ]);
    expect(v6ForbiddenPrimaryCopy).toEqual(
      expect.arrayContaining(['validation failed', 'mutation queued', 'object pending']),
    );
  });
});
