import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';

export type V8BudgetCostLayout = 'cost_cue_summary_with_expense_bottom_sheet';
export type V8BudgetCostSummaryModel = 'planned_range_known_costs_payment_tasks';
export type V8BudgetExpenseDetailModel = 'marriott_clear_rows_wanderlog_utility';
export type V8BudgetCostCtaModel = 'add_expense_or_review_cost';
export type V8BudgetCostColorRule = 'red_only_when_over_budget';
export type V8BudgetCostDensityRule = 'cost_secondary_to_travel_actions';
export type V8BudgetCostCategoryId =
  | 'transport'
  | 'lodging'
  | 'food'
  | 'tickets'
  | 'shopping'
  | 'other';
export type V8BudgetCostSectionId =
  | 'budget_header'
  | 'planned_range'
  | 'known_costs'
  | 'upcoming_payment_tasks'
  | 'expense_rows'
  | 'cost_cue_card'
  | 'currency_selector'
  | 'split_expense'
  | 'provider_cost_context'
  | 'over_budget_warning'
  | 'primary_cost_action'
  | 'screen_reader_summary'
  | 'admin_export_detail';
export type V8BudgetCostStateId =
  | 'loading'
  | 'empty_budget'
  | 'summary_ready'
  | 'expense_detail'
  | 'unknown_cost'
  | 'currency_changed'
  | 'split_expense'
  | 'over_budget'
  | 'missing_exchange_data'
  | 'payment_task_due'
  | 'offline_saved'
  | 'save_success'
  | 'save_failed'
  | 'error_recoverable'
  | 'large_text_review';
export type V8BudgetExpenseStatus = 'known' | 'estimated' | 'unknown' | 'paid';
export type V8BudgetCostSaveState = 'none' | 'saving' | 'saved' | 'failed';
export type V8BudgetCostSyncStatus =
  | 'cached'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'saved_locally'
  | 'error'
  | 'delayed';
export type V8BudgetCostSecondaryActionId =
  | 'review_cost'
  | 'split_expense'
  | 'update_currency';

export type V8BudgetExpenseCostAwarenessDefaults = {
  travelerQuestion: 'How does cost affect my travel decisions?';
  layout: V8BudgetCostLayout;
  densityProfileId: V8DensityProfileId;
  summaryModel: V8BudgetCostSummaryModel;
  expenseDetailModel: V8BudgetExpenseDetailModel;
  ctaModel: V8BudgetCostCtaModel;
  colorRule: V8BudgetCostColorRule;
  densityRule: V8BudgetCostDensityRule;
  primaryAction: 'Add expense';
  secondaryActions: ['Review cost', 'Split expense', 'Update currency'];
  minTouchTarget: 44;
};

export type V8BudgetCostCategory = {
  categoryId: V8BudgetCostCategoryId;
  label: string;
  iconName: string;
};

export type V8BudgetCostSection = {
  sectionId: V8BudgetCostSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8BudgetCostState = {
  stateId: V8BudgetCostStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8BudgetRangeInput = {
  minLabel: string;
  maxLabel: string;
};

export type V8BudgetExpenseInput = {
  expenseId: string;
  title: string;
  categoryId: V8BudgetCostCategoryId;
  amountLabel: string;
  payerLabel: string;
  splitLabel: string | null;
  status: V8BudgetExpenseStatus;
};

export type V8BudgetPaymentTaskInput = {
  taskId: string;
  title: string;
  dueLabel: string;
  amountLabel: string;
  urgent: boolean;
};

export type V8BudgetProviderCostContextInput = {
  providerName: string;
  costLabel: string;
  confidenceLabel: string;
};

export type V8BudgetExpenseCostAwarenessInput = {
  tripId: string | null;
  budgetRange: V8BudgetRangeInput | null;
  knownCostLabel: string | null;
  currencyLabel: string;
  homeCurrencyLabel: string;
  currencyChanged: boolean;
  exchangeDataAvailable: boolean;
  overBudget: boolean;
  expenses: readonly V8BudgetExpenseInput[];
  paymentTasks: readonly V8BudgetPaymentTaskInput[];
  providerCostContext: V8BudgetProviderCostContextInput | null;
  screenSyncStatus: V8BudgetCostSyncStatus;
  largeTextMode: boolean;
  highlightExpenseId: string | null;
  highlightSplitExpense: boolean;
  saveState: V8BudgetCostSaveState;
  postActionMessage: string | null;
  exportDetail: string | null;
  errorMessage: string | null;
};

export type V8BudgetHeaderViewModel = {
  title: 'Costs';
  statusLabel: string;
  currencyLabel: string;
};

export type V8BudgetSummaryViewModel = {
  plannedRangeLabel: string;
  knownCostLabel: string;
  paymentTaskLabel: string;
};

export type V8BudgetExpenseRowViewModel = {
  expenseId: string;
  title: string;
  categoryLabel: string;
  amountLabel: string;
  payerLabel: string;
  splitLabel: string | null;
  statusLabel: string;
};

export type V8BudgetPaymentTaskViewModel = V8BudgetPaymentTaskInput;

export type V8BudgetCostCueViewModel = {
  visible: boolean;
  providerName: string | null;
  copy: string | null;
};

export type V8BudgetCostWarningsViewModel = {
  overBudget: string | null;
  currency: string;
  exchangeData: string | null;
};

export type V8BudgetPrimaryActionViewModel = {
  label: string;
  hidden: false;
  disabled: boolean;
};

export type V8BudgetSecondaryActionViewModel = {
  actionId: V8BudgetCostSecondaryActionId;
  label: 'Review cost' | 'Split expense' | 'Update currency';
};

export type V8BudgetAdminExportDetailViewModel = {
  visible: boolean;
  label: 'Export detail';
  body: string;
};

export type V8BudgetExpenseCostAwarenessViewModel = {
  stateId: V8BudgetCostStateId;
  travelerQuestion: 'How does cost affect my travel decisions?';
  layout: V8BudgetCostLayout;
  firstViewportItems: [
    'budget_header',
    'planned_range',
    'known_costs',
    'upcoming_payment_tasks',
    'primary_cost_action',
  ];
  header: V8BudgetHeaderViewModel;
  summary: V8BudgetSummaryViewModel;
  expenses: V8BudgetExpenseRowViewModel[];
  paymentTasks: V8BudgetPaymentTaskViewModel[];
  costCue: V8BudgetCostCueViewModel;
  warnings: V8BudgetCostWarningsViewModel;
  primaryAction: V8BudgetPrimaryActionViewModel;
  secondaryActions: V8BudgetSecondaryActionViewModel[];
  adminExportDetail: V8BudgetAdminExportDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8BudgetExpenseCostAwarenessUi = {
  stepId: 42;
  slug: 'budget-expense-and-cost-awareness-ui';
  title: 'Budget Expense And Cost Awareness UI';
  sourceOfTruth: 'V8 Step 42 approved Budget Expense And Cost Awareness UI decision record';
  travelerQuestion: 'How does cost affect my travel decisions?';
  defaults: V8BudgetExpenseCostAwarenessDefaults;
  categories: V8BudgetCostCategory[];
  sections: V8BudgetCostSection[];
  states: V8BudgetCostState[];
  dataFlow: {
    source: 'budget_known_expenses_booking_tasks_and_provider_search_context';
    viewModel: 'V8BudgetExpenseCostAwarenessViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    firstViewportRule: string;
    costCueRule: string;
    bottomSheetRule: string;
  };
  webScope: {
    role: 'fuller_budget_review_and_export';
    rule: string;
  };
};

export type V8BudgetExpenseCostAwarenessReadinessInput = {
  approvedTripDraftReviewApproval: boolean;
  approvedTaskCommandScreen: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedCategoryIds: V8BudgetCostCategoryId[];
  approvedSectionIds: V8BudgetCostSectionId[];
  approvedStateIds: V8BudgetCostStateId[];
};

export type V8BudgetExpenseCostAwarenessReadinessReport = {
  ready: boolean;
  missingCategoryIds: V8BudgetCostCategoryId[];
  missingSectionIds: V8BudgetCostSectionId[];
  missingStateIds: V8BudgetCostStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredBudgetCostCategoryIds: V8BudgetCostCategoryId[] = [
  'transport',
  'lodging',
  'food',
  'tickets',
  'shopping',
  'other',
];

export const v8RequiredBudgetCostSectionIds: V8BudgetCostSectionId[] = [
  'budget_header',
  'planned_range',
  'known_costs',
  'upcoming_payment_tasks',
  'expense_rows',
  'cost_cue_card',
  'currency_selector',
  'split_expense',
  'provider_cost_context',
  'over_budget_warning',
  'primary_cost_action',
  'screen_reader_summary',
  'admin_export_detail',
];

export const v8RequiredBudgetCostStateIds: V8BudgetCostStateId[] = [
  'loading',
  'empty_budget',
  'summary_ready',
  'expense_detail',
  'unknown_cost',
  'currency_changed',
  'split_expense',
  'over_budget',
  'missing_exchange_data',
  'payment_task_due',
  'offline_saved',
  'save_success',
  'save_failed',
  'error_recoverable',
  'large_text_review',
];

export const v8BudgetExpenseCostAwarenessDefaults:
  V8BudgetExpenseCostAwarenessDefaults = {
    travelerQuestion: 'How does cost affect my travel decisions?',
    layout: 'cost_cue_summary_with_expense_bottom_sheet',
    densityProfileId: 'mobile_command_center',
    summaryModel: 'planned_range_known_costs_payment_tasks',
    expenseDetailModel: 'marriott_clear_rows_wanderlog_utility',
    ctaModel: 'add_expense_or_review_cost',
    colorRule: 'red_only_when_over_budget',
    densityRule: 'cost_secondary_to_travel_actions',
    primaryAction: 'Add expense',
    secondaryActions: ['Review cost', 'Split expense', 'Update currency'],
    minTouchTarget: 44,
  };

const categories: V8BudgetCostCategory[] = [
  { categoryId: 'transport', label: 'Transport', iconName: 'train' },
  { categoryId: 'lodging', label: 'Lodging', iconName: 'bed' },
  { categoryId: 'food', label: 'Food', iconName: 'utensils' },
  { categoryId: 'tickets', label: 'Tickets', iconName: 'ticket' },
  { categoryId: 'shopping', label: 'Shopping', iconName: 'shopping-bag' },
  { categoryId: 'other', label: 'Other', iconName: 'circle-dollar-sign' },
];

const sections: V8BudgetCostSection[] = [
  {
    sectionId: 'budget_header',
    label: 'Budget header',
    visibleQuestion: 'How does cost affect my travel decisions?',
    firstViewport: true,
    componentModel: 'cost_title_status_currency_row',
  },
  {
    sectionId: 'planned_range',
    label: 'Planned range',
    visibleQuestion: 'What range did I plan for?',
    firstViewport: true,
    componentModel: 'compact_planned_range_summary',
  },
  {
    sectionId: 'known_costs',
    label: 'Known costs',
    visibleQuestion: 'What is already known?',
    firstViewport: true,
    componentModel: 'known_cost_total_and_status_chip',
  },
  {
    sectionId: 'upcoming_payment_tasks',
    label: 'Upcoming payment tasks',
    visibleQuestion: 'Which payments need action?',
    firstViewport: true,
    componentModel: 'task_linked_payment_row',
  },
  {
    sectionId: 'expense_rows',
    label: 'Expense rows',
    visibleQuestion: 'Which costs make up this total?',
    firstViewport: false,
    componentModel: 'marriott_clear_expense_rows',
  },
  {
    sectionId: 'cost_cue_card',
    label: 'Cost cue card',
    visibleQuestion: 'Does a cost change the next action?',
    firstViewport: true,
    componentModel: 'secondary_cost_cue_card',
  },
  {
    sectionId: 'currency_selector',
    label: 'Currency selector',
    visibleQuestion: 'Which currency am I reviewing?',
    firstViewport: false,
    componentModel: 'home_and_trip_currency_picker',
  },
  {
    sectionId: 'split_expense',
    label: 'Split expense',
    visibleQuestion: 'Who paid and who shares this cost?',
    firstViewport: false,
    componentModel: 'split_with_tripmate_bottom_sheet',
  },
  {
    sectionId: 'provider_cost_context',
    label: 'Provider cost context',
    visibleQuestion: 'What price did the provider show?',
    firstViewport: false,
    componentModel: 'provider_search_cost_context_row',
  },
  {
    sectionId: 'over_budget_warning',
    label: 'Over-budget warning',
    visibleQuestion: 'Do I need to review before booking?',
    firstViewport: true,
    componentModel: 'red_only_when_over_budget_banner',
  },
  {
    sectionId: 'primary_cost_action',
    label: 'Primary cost action',
    visibleQuestion: 'What can I do about cost now?',
    firstViewport: true,
    componentModel: 'add_expense_or_review_cost_button',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech explain costs and next action?',
    firstViewport: true,
    componentModel: 'known_cost_payment_count_next_action_summary',
  },
  {
    sectionId: 'admin_export_detail',
    label: 'Admin export detail',
    visibleQuestion: 'What support detail helps without dominating the trip?',
    firstViewport: false,
    componentModel: 'collapsed_budget_export_detail',
  },
];

const states: V8BudgetCostState[] = [
  {
    stateId: 'loading',
    copy: 'Loading cost summary.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'empty_budget',
    copy: 'Add a budget when you want cost-aware suggestions.',
    primaryAction: 'Add budget',
    statusLabel: 'No budget yet',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'summary_ready',
    copy: 'Costs are within the planned range.',
    primaryAction: 'Add expense',
    statusLabel: 'Cost summary',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'expense_detail',
    copy: 'Review expense details before changing this trip.',
    primaryAction: 'Review cost',
    statusLabel: 'Expense detail',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'unknown_cost',
    copy: 'Some costs are not known yet. Add them when you have a price.',
    primaryAction: 'Add expense',
    statusLabel: 'Cost missing',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'currency_changed',
    copy: 'Currency changed. Review converted amounts before deciding.',
    primaryAction: 'Update currency',
    statusLabel: 'Currency changed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'split_expense',
    copy: 'Split this cost with the right tripmates before saving.',
    primaryAction: 'Split expense',
    statusLabel: 'Split expense',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'over_budget',
    copy: 'This trip is over the planned range. Review costs before booking.',
    primaryAction: 'Review cost',
    statusLabel: 'Over budget',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'missing_exchange_data',
    copy: 'Exchange data is missing. Keep the original amounts visible until rates refresh.',
    primaryAction: 'Refresh rates',
    statusLabel: 'Rates unavailable',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'payment_task_due',
    copy: 'A payment task is due soon. Review it before booking more.',
    primaryAction: 'Review payment',
    statusLabel: 'Payment due',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_saved',
    copy: 'Cost changes are saved locally. They will sync when online.',
    primaryAction: 'Continue offline',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'save_success',
    copy: 'Cost change saved.',
    primaryAction: 'Review cost',
    statusLabel: 'Saved',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'save_failed',
    copy: 'Cost change could not save. Your previous costs are still available.',
    primaryAction: 'Try again',
    statusLabel: 'Save failed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Costs could not refresh. Your saved expenses are still available.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Cost details stay readable with large text.',
    primaryAction: 'Add expense',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8BudgetExpenseCostAwarenessUi: V8BudgetExpenseCostAwarenessUi = {
  stepId: 42,
  slug: 'budget-expense-and-cost-awareness-ui',
  title: 'Budget Expense And Cost Awareness UI',
  sourceOfTruth: 'V8 Step 42 approved Budget Expense And Cost Awareness UI decision record',
  travelerQuestion: 'How does cost affect my travel decisions?',
  defaults: v8BudgetExpenseCostAwarenessDefaults,
  categories,
  sections,
  states,
  dataFlow: {
    source: 'budget_known_expenses_booking_tasks_and_provider_search_context',
    viewModel: 'V8BudgetExpenseCostAwarenessViewModel',
    action:
      'Map planned range, known costs, payment tasks, provider cost context, and expense rows into mobile cost cues.',
    feedback:
      'Show saved, offline, unknown cost, currency, over-budget, split, and recovery states in traveler wording.',
  },
  mobileScope: {
    primarySurface: true,
    firstViewportRule:
      'Mobile first viewport shows the planned range, known costs, upcoming payment task count, and one cost action.',
    costCueRule:
      'Cost cues remain secondary unless the trip is over budget, exchange data is missing, or a payment task is due.',
    bottomSheetRule:
      'Expense detail opens in a bottom sheet with Marriott-clear rows and Wanderlog trip utility.',
  },
  webScope: {
    role: 'fuller_budget_review_and_export',
    rule: 'Web may show richer review and export detail while keeping admin metadata collapsed.',
  },
};

export function getV8BudgetCostCategory(
  categoryId: V8BudgetCostCategoryId,
): V8BudgetCostCategory {
  const category = categories.find((candidate) => candidate.categoryId === categoryId);
  if (!category) {
    throw new Error(`Unknown V8 budget cost category: ${categoryId}`);
  }
  return category;
}

export function getV8BudgetCostSection(sectionId: V8BudgetCostSectionId): V8BudgetCostSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 budget cost section: ${sectionId}`);
  }
  return section;
}

export function getV8BudgetCostState(stateId: V8BudgetCostStateId): V8BudgetCostState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 budget cost state: ${stateId}`);
  }
  return state;
}

export function buildV8BudgetExpenseCostAwarenessViewModel(
  input: V8BudgetExpenseCostAwarenessInput,
): V8BudgetExpenseCostAwarenessViewModel {
  const stateId = resolveBudgetCostStateId(input);
  const state = getV8BudgetCostState(stateId);
  const knownCostLabel = input.knownCostLabel ?? 'No known costs yet';
  const paymentTaskLabel = `${input.paymentTasks.length} upcoming ${pluralize(
    'payment',
    input.paymentTasks.length,
  )}`;
  const primaryLabel = resolvePrimaryActionLabel(state);

  return {
    stateId,
    travelerQuestion: 'How does cost affect my travel decisions?',
    layout: 'cost_cue_summary_with_expense_bottom_sheet',
    firstViewportItems: [
      'budget_header',
      'planned_range',
      'known_costs',
      'upcoming_payment_tasks',
      'primary_cost_action',
    ],
    header: {
      title: 'Costs',
      statusLabel: state.statusLabel,
      currencyLabel: input.currencyLabel,
    },
    summary: {
      plannedRangeLabel: formatPlannedRange(input.budgetRange),
      knownCostLabel,
      paymentTaskLabel,
    },
    expenses: input.expenses.map(buildExpenseRow),
    paymentTasks: input.paymentTasks.map((task) => ({ ...task })),
    costCue: buildCostCue(input.providerCostContext),
    warnings: {
      overBudget: input.overBudget ? getV8BudgetCostState('over_budget').copy : null,
      currency: input.currencyLabel,
      exchangeData: input.exchangeDataAvailable
        ? null
        : getV8BudgetCostState('missing_exchange_data').copy,
    },
    primaryAction: {
      label: primaryLabel,
      hidden: false,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions: [
      { actionId: 'review_cost', label: 'Review cost' },
      { actionId: 'split_expense', label: 'Split expense' },
      { actionId: 'update_currency', label: 'Update currency' },
    ],
    adminExportDetail: {
      visible: input.exportDetail !== null,
      label: 'Export detail',
      body: input.exportDetail ?? '',
    },
    screenReaderSummary: `Costs: ${state.statusLabel}. ${knownCostLabel}. ${paymentTaskLabel}. Next action: ${primaryLabel}.`,
    stateCopy: input.postActionMessage ?? input.errorMessage ?? state.copy,
  };
}

export function buildV8BudgetExpenseCostAwarenessDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(42), {
    screenOrComponent: 'Budget Expense And Cost Awareness UI',
    defaultEvidenceLabel: 'V8 Step 42 Budget Expense And Cost Awareness UI approval',
  });
}

export function buildV8BudgetExpenseCostAwarenessReadiness(
  input: V8BudgetExpenseCostAwarenessReadinessInput,
): V8BudgetExpenseCostAwarenessReadinessReport {
  const gate = buildV8BudgetExpenseCostAwarenessDecisionGate();
  const approvedCategoryIds = new Set(input.approvedCategoryIds);
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingCategoryIds = v8RequiredBudgetCostCategoryIds.filter(
    (categoryId) => !approvedCategoryIds.has(categoryId),
  );
  const missingSectionIds = v8RequiredBudgetCostSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredBudgetCostStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripDraftReviewApproval
      ? null
      : 'Step 21 Trip Draft Review And Approval approval is required before Budget Expense And Cost Awareness UI implementation.',
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Budget Expense And Cost Awareness UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Budget Expense And Cost Awareness UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Budget Expense And Cost Awareness UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Budget Expense And Cost Awareness UI implementation.',
    missingApprovalRecord
      ? 'Budget Expense And Cost Awareness UI requires an approved V8 decision record.'
      : null,
    invalidApprovalRecord
      ? 'Budget Expense And Cost Awareness UI approval record is incomplete or invalid.'
      : null,
    missingCategoryIds.length
      ? `Budget Expense And Cost Awareness UI is missing required categories: ${missingCategoryIds.join(
          ', ',
        )}.`
      : null,
    missingSectionIds.length
      ? `Budget Expense And Cost Awareness UI is missing required sections: ${missingSectionIds.join(
          ', ',
        )}.`
      : null,
    missingStateIds.length
      ? `Budget Expense And Cost Awareness UI is missing required states: ${missingStateIds.join(
          ', ',
        )}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingCategoryIds,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveBudgetCostStateId(
  input: V8BudgetExpenseCostAwarenessInput,
): V8BudgetCostStateId {
  if (input.largeTextMode) {
    return 'large_text_review';
  }
  if (input.saveState === 'failed') {
    return 'save_failed';
  }
  if (input.errorMessage) {
    return 'error_recoverable';
  }
  if (input.saveState === 'saved') {
    return 'save_success';
  }
  if (!input.budgetRange && !input.knownCostLabel && input.expenses.length === 0) {
    return 'empty_budget';
  }
  if (input.overBudget) {
    return 'over_budget';
  }
  if (!input.exchangeDataAvailable && input.currencyLabel !== input.homeCurrencyLabel) {
    return 'missing_exchange_data';
  }
  if (input.currencyChanged || input.currencyLabel !== input.homeCurrencyLabel) {
    return 'currency_changed';
  }
  if (input.expenses.some((expense) => expense.status === 'unknown')) {
    return 'unknown_cost';
  }
  if (input.highlightSplitExpense) {
    return 'split_expense';
  }
  if (input.paymentTasks.some((task) => task.urgent)) {
    return 'payment_task_due';
  }
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'saved_locally') {
    return 'offline_saved';
  }
  if (input.highlightExpenseId) {
    return 'expense_detail';
  }
  return 'summary_ready';
}

function formatPlannedRange(range: V8BudgetRangeInput | null): string {
  return range ? `${range.minLabel}-${range.maxLabel} planned` : 'No planned range yet';
}

function buildExpenseRow(expense: V8BudgetExpenseInput): V8BudgetExpenseRowViewModel {
  return {
    expenseId: expense.expenseId,
    title: expense.title,
    categoryLabel: getV8BudgetCostCategory(expense.categoryId).label,
    amountLabel: expense.amountLabel,
    payerLabel: expense.payerLabel,
    splitLabel: expense.splitLabel,
    statusLabel: statusLabel(expense.status),
  };
}

function buildCostCue(
  providerCostContext: V8BudgetProviderCostContextInput | null,
): V8BudgetCostCueViewModel {
  if (!providerCostContext) {
    return {
      visible: false,
      providerName: null,
      copy: null,
    };
  }
  return {
    visible: true,
    providerName: providerCostContext.providerName,
    copy: `${providerCostContext.providerName} shows ${providerCostContext.costLabel}. ${providerCostContext.confidenceLabel}.`,
  };
}

function statusLabel(status: V8BudgetExpenseStatus): string {
  const labels: Record<V8BudgetExpenseStatus, string> = {
    known: 'Known',
    estimated: 'Estimated',
    unknown: 'Unknown',
    paid: 'Paid',
  };
  return labels[status];
}

function resolvePrimaryActionLabel(state: V8BudgetCostState): string {
  return state.stateId === 'summary_ready' ? 'Add expense' : state.primaryAction;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
