import { describe, expect, it } from 'vitest';

import {
  buildV7FinalAnswerPdfTripDraftPlan,
  v7FinalAnswerExportScenario,
  v7FinalAnswerPdfTripDraftAuditEvidence,
  v7FinalAnswerPdfTripDraftWebSpec,
  v7TripDraftCreationScenario,
  v7TripDraftFixture,
} from './v7FinalAnswerPdfTripDraft';

describe('v7 final answer PDF and trip draft tests contract', () => {
  it('defines the final answer export scenario and visible answer signals', () => {
    expect(v7FinalAnswerExportScenario).toMatchObject({
      scenarioId: 'final_answer_pdf_export',
      jobId: 'job_v7_final_answer_hangzhou',
      route: '/',
      pdfFilename: 'huaxia-itinerary.pdf',
      csvFilename: 'huaxia-itinerary.csv',
      answerHeading: '行程',
      timelineSignal: 'D2｜杭州',
      topicTitle: '西湖与龙井慢节奏安排',
      citationSignal: '杭州市文化广电旅游局公开信息',
      liveProviderCallsAllowed: false,
    });
  });

  it('defines the trip draft response fixture', () => {
    expect(v7TripDraftCreationScenario).toMatchObject({
      scenarioId: 'final_answer_create_trip_draft',
      tripId: 'trip_v7_hangzhou_draft',
      sourceJobId: 'job_v7_final_answer_hangzhou',
      successCopy: '旅行草稿已保存到指挥中心。',
      commandCenterTitle: '杭州三日亲子慢旅行草稿',
    });

    expect(v7TripDraftFixture).toMatchObject({
      trip_id: v7TripDraftCreationScenario.tripId,
      status: 'draft',
      draft: {
        title: v7TripDraftCreationScenario.commandCenterTitle,
        destination: '杭州',
        source_job_id: v7TripDraftCreationScenario.sourceJobId,
      },
    });
  });

  it('locks the Playwright web spec requirements', () => {
    expect(v7FinalAnswerPdfTripDraftWebSpec).toMatchObject({
      laneId: 'playwright_web',
      specPath: 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
      usesMockEventSource: true,
      assertsTextView: true,
      assertsTimelineView: true,
      assertsTopicExpansion: true,
      assertsCitations: true,
      assertsPdfDownload: true,
      assertsCsvDownload: true,
      assertsTripDraftCreation: true,
      assertsNoLiveProviderCalls: true,
    });
  });

  it('builds the Step 18 production-readiness plan', () => {
    expect(buildV7FinalAnswerPdfTripDraftPlan()).toMatchObject({
      step: 18,
      laneIds: ['playwright_web'],
      requiresReadableFinalAnswer: true,
      requiresTimelineView: true,
      requiresCitationReview: true,
      requiresPdfExport: true,
      requiresCsvExport: true,
      requiresTripDraftCreation: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Playwright audit evidence for the Step 18 release gate', () => {
    expect(v7FinalAnswerPdfTripDraftAuditEvidence).toEqual({
      step: 18,
      scenarioId: 'final_answer_pdf_trip_draft_real_playwright_audit',
      realFinalAnswerAuditScript: 'scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs',
      requiredSpecPath: 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
      requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
      requiredScenarios: ['final_answer_pdf_export', 'final_answer_create_trip_draft'],
      requiredVisibleSignals: [
        '最终版：杭州三日亲子慢旅行已完成',
        'D2｜杭州',
        '西湖与龙井慢节奏安排',
        '杭州市文化广电旅游局公开信息',
        '旅行草稿已保存到指挥中心。',
        '杭州三日亲子慢旅行草稿',
      ],
      requiredDownloadFilenames: ['huaxia-itinerary.pdf', 'huaxia-itinerary.csv'],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'eventSourceCoverage',
        'finalAnswerCoverage',
        'exportCoverage',
        'tripDraftCoverage',
        'networkCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
