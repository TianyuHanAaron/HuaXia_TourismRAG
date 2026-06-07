import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8BudgetExpenseCostAwarenessDecisionGate,
  buildV8BudgetExpenseCostAwarenessReadiness,
  buildV8BudgetExpenseCostAwarenessViewModel,
  getV8BudgetCostCategory,
  getV8BudgetCostSection,
  getV8BudgetCostState,
  v8BudgetExpenseCostAwarenessDefaults,
  v8BudgetExpenseCostAwarenessUi,
  v8RequiredBudgetCostCategoryIds,
  v8RequiredBudgetCostSectionIds,
  v8RequiredBudgetCostStateIds,
} from './v8BudgetExpenseCostAwarenessUi';

describe('v8BudgetExpenseCostAwarenessUi', () => {
  const gate = buildV8BudgetExpenseCostAwarenessDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T14:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved cost awareness with planned range, known costs, payment tasks, Marriott-clear expense rows, and red only when over budget.',
      },
    ],
  });

  const expense = {
    expenseId: 'hotel_deposit',
    title: 'Hotel deposit',
    categoryId: 'lodging' as const,
    amountLabel: 'A$980',
    payerLabel: 'Paid by You',
    splitLabel: 'Split with Aki',
    status: 'known' as const,
  };

  it('captures Step 42 defaults and rejects finance or technical copy', () => {
    expect(v8BudgetExpenseCostAwarenessUi).toMatchObject({
      stepId: 42,
      slug: 'budget-expense-and-cost-awareness-ui',
      travelerQuestion: 'How does cost affect my travel decisions?',
      defaults: v8BudgetExpenseCostAwarenessDefaults,
    });
    expect(v8BudgetExpenseCostAwarenessDefaults).toMatchObject({
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
    });

    const serialized = JSON.stringify(v8BudgetExpenseCostAwarenessUi).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('finance dashboard');
    expect(serialized).not.toContain('validation object');
  });

  it('requires cost categories, sections, and screen states', () => {
    expect(v8RequiredBudgetCostCategoryIds).toEqual([
      'transport',
      'lodging',
      'food',
      'tickets',
      'shopping',
      'other',
    ]);
    expect(v8RequiredBudgetCostSectionIds).toEqual([
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
    ]);
    expect(v8RequiredBudgetCostStateIds).toEqual([
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
    ]);

    expect(getV8BudgetCostCategory('lodging')).toMatchObject({
      label: 'Lodging',
      iconName: 'bed',
    });
    expect(getV8BudgetCostSection('planned_range')).toMatchObject({
      label: 'Planned range',
      firstViewport: true,
    });
    expect(getV8BudgetCostSection('provider_cost_context')).toMatchObject({
      componentModel: 'provider_search_cost_context_row',
    });
  });

  it('keeps unknown cost, over-budget, currency, exchange, and offline states recoverable', () => {
    expect(getV8BudgetCostState('unknown_cost')).toMatchObject({
      copy: 'Some costs are not known yet. Add them when you have a price.',
      primaryAction: 'Add expense',
      statusLabel: 'Cost missing',
      colorTokenRole: 'risk_amber',
    });
    expect(getV8BudgetCostState('over_budget')).toMatchObject({
      copy: 'This trip is over the planned range. Review costs before booking.',
      primaryAction: 'Review cost',
      statusLabel: 'Over budget',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8BudgetCostState('currency_changed')).toMatchObject({
      copy: 'Currency changed. Review converted amounts before deciding.',
      primaryAction: 'Update currency',
      statusLabel: 'Currency changed',
    });
    expect(getV8BudgetCostState('missing_exchange_data')).toMatchObject({
      copy: 'Exchange data is missing. Keep the original amounts visible until rates refresh.',
      primaryAction: 'Refresh rates',
      statusLabel: 'Rates unavailable',
    });
    expect(getV8BudgetCostState('offline_saved')).toMatchObject({
      copy: 'Cost changes are saved locally. They will sync when online.',
      primaryAction: 'Continue offline',
      statusLabel: 'Saved locally',
    });
  });

  it('builds a mobile cost summary with planned range, known cost, payment task, and provider context', () => {
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        tripId: 'trip_kyoto',
        budgetRange: { minLabel: 'A$2,400', maxLabel: 'A$3,200' },
        knownCostLabel: 'A$1,860 known',
        currencyLabel: 'AUD',
        homeCurrencyLabel: 'AUD',
        currencyChanged: false,
        exchangeDataAvailable: true,
        overBudget: false,
        expenses: [expense],
        paymentTasks: [
          {
            taskId: 'jr_pass',
            title: 'Pay JR pass balance',
            dueLabel: 'Due tomorrow',
            amountLabel: 'A$420',
            urgent: false,
          },
        ],
        providerCostContext: {
          providerName: 'JR Rail',
          costLabel: 'A$420',
          confidenceLabel: 'High confidence',
        },
        screenSyncStatus: 'synced',
        largeTextMode: false,
        highlightExpenseId: null,
        highlightSplitExpense: false,
        saveState: 'none',
        postActionMessage: null,
        exportDetail: 'Budget fixture export',
        errorMessage: null,
      }),
    ).toEqual({
      stateId: 'summary_ready',
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
        statusLabel: 'Cost summary',
        currencyLabel: 'AUD',
      },
      summary: {
        plannedRangeLabel: 'A$2,400-A$3,200 planned',
        knownCostLabel: 'A$1,860 known',
        paymentTaskLabel: '1 upcoming payment',
      },
      expenses: [
        {
          expenseId: 'hotel_deposit',
          title: 'Hotel deposit',
          categoryLabel: 'Lodging',
          amountLabel: 'A$980',
          payerLabel: 'Paid by You',
          splitLabel: 'Split with Aki',
          statusLabel: 'Known',
        },
      ],
      paymentTasks: [
        {
          taskId: 'jr_pass',
          title: 'Pay JR pass balance',
          dueLabel: 'Due tomorrow',
          amountLabel: 'A$420',
          urgent: false,
        },
      ],
      costCue: {
        visible: true,
        providerName: 'JR Rail',
        copy: 'JR Rail shows A$420. High confidence.',
      },
      warnings: {
        overBudget: null,
        currency: 'AUD',
        exchangeData: null,
      },
      primaryAction: {
        label: 'Add expense',
        hidden: false,
        disabled: false,
      },
      secondaryActions: [
        { actionId: 'review_cost', label: 'Review cost' },
        { actionId: 'split_expense', label: 'Split expense' },
        { actionId: 'update_currency', label: 'Update currency' },
      ],
      adminExportDetail: {
        visible: true,
        label: 'Export detail',
        body: 'Budget fixture export',
      },
      screenReaderSummary:
        'Costs: Cost summary. A$1,860 known. 1 upcoming payment. Next action: Add expense.',
      stateCopy: 'Costs are within the planned range.',
    });
  });

  it('resolves edge cases for empty, unknown cost, over-budget, currency, split, payment, offline, save, error, and large text states', () => {
    const baseInput = {
      tripId: 'trip_kyoto',
      budgetRange: { minLabel: 'A$2,400', maxLabel: 'A$3,200' },
      knownCostLabel: 'A$1,860 known',
      currencyLabel: 'AUD',
      homeCurrencyLabel: 'AUD',
      currencyChanged: false,
      exchangeDataAvailable: true,
      overBudget: false,
      expenses: [expense],
      paymentTasks: [],
      providerCostContext: null,
      screenSyncStatus: 'synced' as const,
      largeTextMode: false,
      highlightExpenseId: null,
      highlightSplitExpense: false,
      saveState: 'none' as const,
      postActionMessage: null,
      exportDetail: null,
      errorMessage: null,
    };

    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        budgetRange: null,
        knownCostLabel: null,
        expenses: [],
      }).stateId,
    ).toBe('empty_budget');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        expenses: [{ ...expense, status: 'unknown' as const, amountLabel: 'Cost unknown' }],
      }).stateId,
    ).toBe('unknown_cost');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        overBudget: true,
      }).stateId,
    ).toBe('over_budget');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        currencyLabel: 'JPY',
        homeCurrencyLabel: 'AUD',
        currencyChanged: true,
      }).stateId,
    ).toBe('currency_changed');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        currencyLabel: 'JPY',
        homeCurrencyLabel: 'AUD',
        exchangeDataAvailable: false,
      }).stateId,
    ).toBe('missing_exchange_data');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        highlightSplitExpense: true,
      }).stateId,
    ).toBe('split_expense');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        paymentTasks: [
          {
            taskId: 'hotel_due',
            title: 'Pay hotel deposit',
            dueLabel: 'Due today',
            amountLabel: 'A$180',
            urgent: true,
          },
        ],
      }).stateId,
    ).toBe('payment_task_due');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        screenSyncStatus: 'saved_locally',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        saveState: 'saved',
        postActionMessage: 'Expense added.',
      }).stateCopy,
    ).toBe('Expense added.');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        saveState: 'failed',
      }).stateId,
    ).toBe('save_failed');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        errorMessage: 'Costs could not refresh. Your saved expenses are still available.',
      }).stateId,
    ).toBe('error_recoverable');
    expect(
      buildV8BudgetExpenseCostAwarenessViewModel({
        ...baseInput,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('requires Step 21 and Step 27 approvals before implementation readiness passes', () => {
    const notReady = buildV8BudgetExpenseCostAwarenessReadiness({
      approvedTripDraftReviewApproval: false,
      approvedTaskCommandScreen: false,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord: null,
      approvedCategoryIds: [],
      approvedSectionIds: [],
      approvedStateIds: [],
    });

    expect(notReady.ready).toBe(false);
    expect(notReady.blockers).toEqual([
      'Step 21 Trip Draft Review And Approval approval is required before Budget Expense And Cost Awareness UI implementation.',
      'Step 27 Task Command Screen approval is required before Budget Expense And Cost Awareness UI implementation.',
      'Budget Expense And Cost Awareness UI requires an approved V8 decision record.',
      'Budget Expense And Cost Awareness UI is missing required categories: transport, lodging, food, tickets, shopping, other.',
      'Budget Expense And Cost Awareness UI is missing required sections: budget_header, planned_range, known_costs, upcoming_payment_tasks, expense_rows, cost_cue_card, currency_selector, split_expense, provider_cost_context, over_budget_warning, primary_cost_action, screen_reader_summary, admin_export_detail.',
      'Budget Expense And Cost Awareness UI is missing required states: loading, empty_budget, summary_ready, expense_detail, unknown_cost, currency_changed, split_expense, over_budget, missing_exchange_data, payment_task_due, offline_saved, save_success, save_failed, error_recoverable, large_text_review.',
    ]);

    expect(
      buildV8BudgetExpenseCostAwarenessReadiness({
        approvedTripDraftReviewApproval: true,
        approvedTaskCommandScreen: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedCategoryIds: v8RequiredBudgetCostCategoryIds,
        approvedSectionIds: v8RequiredBudgetCostSectionIds,
        approvedStateIds: v8RequiredBudgetCostStateIds,
      }),
    ).toEqual({
      ready: true,
      missingCategoryIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
      approvedEvidenceLabel:
        'Approved cost awareness with planned range, known costs, payment tasks, Marriott-clear expense rows, and red only when over budget.',
    });
  });
});
