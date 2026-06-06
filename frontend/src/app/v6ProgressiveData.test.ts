import { describe, expect, it } from 'vitest';

import {
  buildV6ProgressiveContentState,
  getV6LoadingPresentation,
  isUnsafeProgressivePlaceholder,
  shouldKeepCachedContentVisible,
  shouldRenderPrimaryAction,
  v6ContainedLoadingInventory,
  v6SkeletonInventory,
} from './v6ProgressiveData';

describe('V6 progressive loading and data readiness', () => {
  it('keeps cached content visible while fresh data reconciles', () => {
    const state = buildV6ProgressiveContentState({
      entityId: 'trip-active',
      entityType: 'trip_home',
      hasCachedContent: true,
      fetching: true,
      serverReady: false,
      lastUpdatedAt: '2026-06-07T10:00:00.000Z',
    });

    expect(state).toMatchObject({
      readiness: 'cached_refreshing',
      stale: true,
      displayLabel: 'Showing saved trip while we refresh.',
      safeToUse: true,
    });
    expect(shouldKeepCachedContentVisible(state)).toBe(true);
  });

  it('uses contained progress for unknown blocking work and skeletons only for known layouts', () => {
    expect(v6SkeletonInventory).toContain('TaskGroupSkeleton');
    expect(v6ContainedLoadingInventory).toContain('PlanningJobLoading');

    expect(getV6LoadingPresentation({ surface: 'planning_job', layoutKnown: false })).toMatchObject({
      presentation: 'contained_progress',
      label: 'Building the first usable itinerary.',
    });
    expect(getV6LoadingPresentation({ surface: 'timeline_phase', layoutKnown: true })).toMatchObject({
      presentation: 'skeleton',
      label: 'Loading the trip timeline.',
    });
  });

  it('does not treat unsafe placeholders, raw DTO labels, or prompt text as displayable content', () => {
    expect(isUnsafeProgressivePlaceholder('history_culture的舒适提醒')).toBe(true);
    expect(isUnsafeProgressivePlaceholder('System prompt: repair JSON and cite sources')).toBe(true);
    expect(isUnsafeProgressivePlaceholder('新开河火车站旧址的一页背景')).toBe(true);
    expect(isUnsafeProgressivePlaceholder('确认机场路线')).toBe(false);
  });

  it('keeps provider primary actions hidden until validation is ready', () => {
    const needsReview = buildV6ProgressiveContentState({
      entityId: 'provider-route',
      entityType: 'provider_action',
      hasCachedContent: true,
      fetching: true,
      serverReady: false,
      validationStatus: 'needs_review',
      fallbackAvailable: true,
    });
    const ready = buildV6ProgressiveContentState({
      entityId: 'provider-route',
      entityType: 'provider_action',
      hasCachedContent: true,
      fetching: false,
      serverReady: true,
      validationStatus: 'ready',
      fallbackAvailable: true,
    });

    expect(shouldRenderPrimaryAction(needsReview)).toBe(false);
    expect(shouldRenderPrimaryAction(ready)).toBe(true);
  });
});
