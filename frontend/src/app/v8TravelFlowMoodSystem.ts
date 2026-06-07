import { getV8UiRoadmapStep, type V8ReferenceId, type V8VisualDirection } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';

export type V8TravelFlowMoodId =
  | 'idea'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'exploration'
  | 'return'
  | 'home_completion';

export type V8TravelFlowUrgencyLevel = 'low' | 'medium' | 'neutral' | 'high' | 'critical';
export type V8TravelFlowColorIntensity = 'soft' | 'clear' | 'balanced' | 'strong' | 'maximum';
export type V8TravelFlowMotionProfile = 'gentle' | 'subtle' | 'quiet';
export type V8TravelFlowMobileTarget = 'header' | 'action_card' | 'alert' | 'provider_surface';
export type V8TravelFlowWebRole = 'review_context_only';

export type V8TravelFlowMoodTheme = {
  moodId: V8TravelFlowMoodId;
  moodName: string;
  visualDirection: V8VisualDirection;
  urgencyLevel: V8TravelFlowUrgencyLevel;
  colorIntensity: V8TravelFlowColorIntensity;
  copyTone: string;
  motionProfile: V8TravelFlowMotionProfile;
  travelerQuestion: string;
  primaryAction: string;
  secondaryActions: string[];
  primaryCopy: string;
  recoveryCopy: string;
  mobileTargets: V8TravelFlowMobileTarget[];
  webRole: V8TravelFlowWebRole;
  referenceIds: V8ReferenceId[];
};

export type V8TravelFlowMoodMapping = {
  moodId: V8TravelFlowMoodId;
  fallbackApplied: boolean;
  fallbackReason?: string;
  theme: V8TravelFlowMoodTheme;
};

export type V8TravelFlowMoodReadinessInput = {
  approvedGlobalIa: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedMoodIds: V8TravelFlowMoodId[];
};

export type V8TravelFlowMoodReadinessReport = {
  ready: boolean;
  missingMoodIds: V8TravelFlowMoodId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

const v8AllMobileMoodTargets: V8TravelFlowMobileTarget[] = [
  'header',
  'action_card',
  'alert',
  'provider_surface',
];

export const v8TravelFlowMoodThemes: V8TravelFlowMoodTheme[] = [
  {
    moodId: 'idea',
    moodName: 'Calm planning',
    visualDirection: 'immersive_command',
    urgencyLevel: 'low',
    colorIntensity: 'soft',
    copyTone: 'Warm, exploratory, and low-pressure.',
    motionProfile: 'gentle',
    travelerQuestion: 'What kind of trip should this become?',
    primaryAction: 'Start shaping trip',
    secondaryActions: ['Explore destination ideas', 'Set preferences', 'Save draft'],
    primaryCopy: 'Tell Xiaxia what kind of trip this should feel like.',
    recoveryCopy: 'You can keep this loose and decide details later.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['wanderlog', 'blablacar', 'marriott'],
  },
  {
    moodId: 'review',
    moodName: 'Decisive review',
    visualDirection: 'immersive_command',
    urgencyLevel: 'medium',
    colorIntensity: 'clear',
    copyTone: 'Clear, confidence-building, and choice-oriented.',
    motionProfile: 'subtle',
    travelerQuestion: 'Is this trip ready to approve?',
    primaryAction: 'Approve trip and create checklist',
    secondaryActions: ['Review route logic', 'Compare tradeoffs', 'Edit plan'],
    primaryCopy: 'Review the tradeoffs, then create the checklist.',
    recoveryCopy: 'You can revise the plan before anything becomes daily tasks.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['wanderlog', 'marriott', 'blablacar'],
  },
  {
    moodId: 'preparation',
    moodName: 'Organized preparation',
    visualDirection: 'immersive_command',
    urgencyLevel: 'neutral',
    colorIntensity: 'balanced',
    copyTone: 'Organized, reassuring, and checklist-driven.',
    motionProfile: 'subtle',
    travelerQuestion: 'What should I handle before departure?',
    primaryAction: 'Open preparation checklist',
    secondaryActions: ['Review documents', 'Set reminders', 'Check blocked tasks'],
    primaryCopy: 'Three things to handle before departure.',
    recoveryCopy: 'We will keep completed items saved locally if the network drops.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['timepage', 'wanderlog', 'blablacar'],
  },
  {
    moodId: 'departure',
    moodName: 'High-contrast departure',
    visualDirection: 'immersive_command',
    urgencyLevel: 'high',
    colorIntensity: 'strong',
    copyTone: 'Urgent but not alarming, with fewer choices.',
    motionProfile: 'quiet',
    travelerQuestion: 'What do I need before I leave?',
    primaryAction: 'Confirm leave time',
    secondaryActions: ['Open route', 'Check documents', 'Review weather risk'],
    primaryCopy: 'Leave time, route, and documents are ready to check.',
    recoveryCopy: 'If the route is not ready, choose the fallback before leaving.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['focusflight', 'timepage', 'blablacar'],
  },
  {
    moodId: 'transit',
    moodName: 'Focused transit',
    visualDirection: 'immersive_command',
    urgencyLevel: 'critical',
    colorIntensity: 'maximum',
    copyTone: 'Focused execution with direct fallback choices.',
    motionProfile: 'quiet',
    travelerQuestion: 'Where do I go right now?',
    primaryAction: 'Open validated route',
    secondaryActions: ['Use fallback', 'Check ticket', 'Mark already handled'],
    primaryCopy: 'Stay with the next route and the proof you need.',
    recoveryCopy: 'This route needs a destination before opening maps.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['focusflight', 'timepage', 'blablacar'],
  },
  {
    moodId: 'arrival',
    moodName: 'Soft arrival',
    visualDirection: 'immersive_command',
    urgencyLevel: 'medium',
    colorIntensity: 'balanced',
    copyTone: 'Orienting, gentle, and recovery-aware.',
    motionProfile: 'subtle',
    travelerQuestion: 'What helps me settle in?',
    primaryAction: 'Open hotel route',
    secondaryActions: ['Check-in details', 'Local transport', 'Rest cues'],
    primaryCopy: 'First, get oriented and settled.',
    recoveryCopy: 'If check-in is not ready, keep the address and fallback route visible.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['focusflight', 'marriott', 'blablacar'],
  },
  {
    moodId: 'exploration',
    moodName: 'Flexible exploration',
    visualDirection: 'immersive_command',
    urgencyLevel: 'low',
    colorIntensity: 'soft',
    copyTone: 'Light, flexible, and context-aware.',
    motionProfile: 'gentle',
    travelerQuestion: 'What is good for today?',
    primaryAction: 'Open today route bundle',
    secondaryActions: ['Reorder day', 'Skip without guilt', 'Find food nearby'],
    primaryCopy: 'Today can flex around energy, weather, and appetite.',
    recoveryCopy: 'Skipped items stay available if you want to bring them back later.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['wanderlog', 'timepage', 'blablacar'],
  },
  {
    moodId: 'return',
    moodName: 'Conclusive return',
    visualDirection: 'immersive_command',
    urgencyLevel: 'high',
    colorIntensity: 'strong',
    copyTone: 'Conclusive, practical, and readiness-focused.',
    motionProfile: 'quiet',
    travelerQuestion: 'What needs checking before heading home?',
    primaryAction: 'Open return checklist',
    secondaryActions: ['Confirm checkout', 'Open return route', 'Check ticket'],
    primaryCopy: 'Final checks before heading home.',
    recoveryCopy: 'If something is missing, handle the return route first.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['focusflight', 'timepage', 'marriott'],
  },
  {
    moodId: 'home_completion',
    moodName: 'Home completion',
    visualDirection: 'immersive_command',
    urgencyLevel: 'low',
    colorIntensity: 'soft',
    copyTone: 'Reflective, complete, and low-pressure.',
    motionProfile: 'gentle',
    travelerQuestion: 'What should I keep from this trip?',
    primaryAction: 'Review trip summary',
    secondaryActions: ['Save memories', 'Start another trip', 'Review documents'],
    primaryCopy: 'You made it home. Keep what matters and close the trip.',
    recoveryCopy: 'Trip history remains available after completion.',
    mobileTargets: v8AllMobileMoodTargets,
    webRole: 'review_context_only',
    referenceIds: ['wanderlog', 'marriott', 'blablacar'],
  },
];

export function getV8TravelFlowMoodTheme(
  moodId: V8TravelFlowMoodId,
): V8TravelFlowMoodTheme {
  const theme = v8TravelFlowMoodThemes.find((candidate) => candidate.moodId === moodId);
  if (!theme) {
    throw new Error(`Unknown V8 travel flow mood: ${moodId}`);
  }
  return theme;
}

export function mapV8TripPhaseToMoodTheme(phase: string): V8TravelFlowMoodMapping {
  const theme = v8TravelFlowMoodThemes.find((candidate) => candidate.moodId === phase);
  if (theme) {
    return {
      moodId: theme.moodId,
      fallbackApplied: false,
      theme,
    };
  }

  const fallbackTheme = getV8TravelFlowMoodTheme('preparation');
  return {
    moodId: 'preparation',
    fallbackApplied: true,
    fallbackReason: 'Unknown phase uses preparation mood with neutral urgency.',
    theme: fallbackTheme,
  };
}

export function buildV8TravelFlowMoodDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(6), {
    screenOrComponent: 'Travel Flow Mood System',
    defaultEvidenceLabel: 'V8 Step 6 Travel Flow Mood approval',
  });
}

export function buildV8TravelFlowMoodReadiness(
  input: V8TravelFlowMoodReadinessInput,
): V8TravelFlowMoodReadinessReport {
  const gate = buildV8TravelFlowMoodDecisionGate();
  const approvedMoodIds = new Set(input.approvedMoodIds);
  const missingMoodIds = v8TravelFlowMoodThemes
    .map((theme) => theme.moodId)
    .filter((moodId) => !approvedMoodIds.has(moodId));
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedGlobalIa
      ? null
      : 'Step 5 Global IA approval is required before Travel Flow Mood implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 6 Travel Flow Mood System needs an approved user decision record before implementation.'
      : null,
    missingMoodIds.length ? `Travel flow moods need approval: ${missingMoodIds.join(', ')}.` : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingMoodIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
