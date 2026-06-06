import type { TravelAnswer, TravelJobStatusResponse } from '../api/generated/model';
import type { V6Language } from './v6ProductionUi';

export type WebPlanningRailItemId =
  | 'new_plan'
  | 'current_answer'
  | 'saved_trips'
  | 'draft_review'
  | 'downloads';

export type WebPlanningRailItem = {
  id: WebPlanningRailItemId;
  label: string;
  helper: string;
  href: string;
};

export type WebPlanningShellCopy = {
  title: string;
  subtitle: string;
  composerQuestion: string;
  progressQuestion: string;
  answerQuestion: string;
  evidenceQuestion: string;
  draftQuestion: string;
  savedTripsQuestion: string;
  languageToggleLabel: string;
  voiceCta: string;
  voiceAriaLabel: string;
  compactIdentity: string;
  rail: WebPlanningRailItem[];
  evidenceEmpty: string;
  citationSupportCopy: string;
  draftApprovalCopy: string;
  savedTripsCopy: string;
  providerReadinessCopy: string;
  activeStatusLabel: string;
};

export type WebPlanningContextSummary = {
  statusLabel: string;
  progressLabel: string;
  citationCountLabel: string;
  warningCountLabel: string;
  providerReadinessLabel: string;
};

const englishShellCopy: WebPlanningShellCopy = {
  title: 'Trip planning workspace',
  subtitle: 'Create the plan, inspect the evidence, approve the checklist.',
  composerQuestion: 'What trip should HuaXia plan?',
  progressQuestion: 'What is happening now?',
  answerQuestion: 'Is this route good enough to approve?',
  evidenceQuestion: 'Can I trust this detail?',
  draftQuestion: 'What changes when I approve this trip?',
  savedTripsQuestion: 'Which plans already became executable workflows?',
  languageToggleLabel: '中文',
  voiceCta: 'Voice input',
  voiceAriaLabel: 'Open voice input',
  compactIdentity: 'HuaXia planning workbench',
  rail: [
    {
      id: 'new_plan',
      label: 'Create a plan',
      helper: 'Intake and route goals',
      href: '#composer',
    },
    {
      id: 'current_answer',
      label: 'Inspect evidence',
      helper: 'Itinerary, citations, and timing',
      href: '#answer-workspace',
    },
    {
      id: 'saved_trips',
      label: 'Saved trips',
      helper: 'Drafts and executable workflows',
      href: '#saved-trips',
    },
    {
      id: 'draft_review',
      label: 'Approve and create checklist',
      helper: 'Turn the draft into tasks',
      href: '#draft-review',
    },
    {
      id: 'downloads',
      label: 'Downloads',
      helper: 'CSV, PDF, and source review',
      href: '#answer-workspace',
    },
  ],
  evidenceEmpty: 'Citations, warnings, and provider readiness will appear here after generation starts.',
  citationSupportCopy: 'This source supports the route timing.',
  draftApprovalCopy: 'This draft will create executable tasks after approval.',
  savedTripsCopy: 'Saved trips stay below the planning review so the desktop workspace does not become an execution dashboard.',
  providerReadinessCopy: 'Provider readiness is shown only when route or service context is available.',
  activeStatusLabel: 'Planning status',
};

const chineseShellCopy: WebPlanningShellCopy = {
  ...englishShellCopy,
  languageToggleLabel: 'English',
  voiceCta: '语音输入',
  voiceAriaLabel: '打开语音输入',
  compactIdentity: '华夏桌面规划工作台',
};

export function getWebPlanningShellCopy(language: V6Language): WebPlanningShellCopy {
  return language === 'en' ? englishShellCopy : chineseShellCopy;
}

export function buildWebPlanningContextSummary({
  job,
  answer,
}: {
  job?: TravelJobStatusResponse | null;
  answer?: TravelAnswer | null;
}): WebPlanningContextSummary {
  const status = job?.status ?? (answer ? 'ready_for_review' : 'idle');
  const progress = typeof job?.progress_percent === 'number' ? `${job.progress_percent}%` : 'Waiting for a job';
  const warnings = answer?.warnings?.length ?? 0;
  const citations = answer?.citations?.length ?? 0;

  return {
    statusLabel: status.replaceAll('_', ' '),
    progressLabel: progress,
    citationCountLabel: citations > 0 ? `${citations} citation lines` : 'No citations yet',
    warningCountLabel: warnings > 0 ? `${warnings} warnings` : 'No warnings yet',
    providerReadinessLabel: answer ? 'Review route and service context before approval' : 'Not available yet',
  };
}
