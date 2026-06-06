import type {
  PaywallConfigResponse,
  PrivacySettingsResponse,
  SubscriptionState,
  UserPreferenceProfile,
} from '../../types/trip';

export const SETTINGS_SCREEN_QUESTION =
  "How does HuaXia remember my defaults, protect my data, and let me change the app's behavior?";

export type SettingsSectionId =
  | 'trip_defaults'
  | 'reminders'
  | 'subscription'
  | 'privacy_documents'
  | 'account_recovery';

export type SettingsRowTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type SettingsRow = {
  id: string;
  title: string;
  description: string;
  valueLabel?: string | null;
  helper?: string;
  tone?: SettingsRowTone;
  editable?: boolean;
};

export type SettingsSection = {
  id: SettingsSectionId;
  title: string;
  summary: string;
  statusLabel: string;
  rows: SettingsRow[];
};

export type SettingsDangerAction = {
  id: 'clear_cache' | 'data_export' | 'delete_request';
  title: string;
  description: string;
  buttonLabel: string;
  tone: 'default' | 'danger';
};

export type SettingsScreenViewModel = {
  title: string;
  subtitle: string;
  screenQuestion: string;
  sections: SettingsSection[];
  dangerActions: SettingsDangerAction[];
  supportAccess: {
    title: string;
    description: string;
    accessibilityLabel: string;
    saveButtonLabel: string;
    unchangedHelper: string;
  };
  subscriptionRefresh: {
    buttonLabel: string;
    helper: string;
  };
};

type BuildSettingsScreenViewModelInput = {
  preferences?: UserPreferenceProfile | null;
  subscription?: SubscriptionState | null;
  paywall?: PaywallConfigResponse | null;
  privacy?: PrivacySettingsResponse | null;
};

const mapProviderLabels: Record<string, string> = {
  google_maps: 'Google Maps',
  apple_maps: 'Apple Maps',
  mapbox: 'Mapbox',
};

const hotelPlatformLabels: Record<string, string> = {
  booking: 'Booking.com',
  agoda: 'Agoda',
  expedia: 'Expedia',
  hotel_website: '酒店官网',
};

const flightPlatformLabels: Record<string, string> = {
  skyscanner: 'Skyscanner',
  airline_direct: '航空公司官网',
  google_flights: 'Google Flights',
};

const calendarProviderLabels: Record<string, string> = {
  device_calendar: '手机日历',
  ics: '.ics 文件',
};

const languageLabels: Record<string, string> = {
  'zh-CN': '简体中文',
  en: 'English',
};

const currencyLabels: Record<string, string> = {
  CNY: '人民币 CNY',
  AUD: '澳元 AUD',
  USD: '美元 USD',
  GBP: '英镑 GBP',
};

export function buildSettingsScreenViewModel({
  preferences,
  subscription,
  paywall,
  privacy,
}: BuildSettingsScreenViewModelInput): SettingsScreenViewModel {
  const tripDefaults: SettingsSection = {
    id: 'trip_defaults',
    title: '旅行默认值',
    summary: '这些选项会影响后续路线、日历、酒店和航班动作的默认排序。',
    statusLabel: '影响未来动作',
    rows: [
      {
        id: 'map_provider',
        title: '地图服务',
        description: 'Map preference controls the first option shown in route action sheets.',
        valueLabel: mapProviderLabels[preferences?.map_provider ?? ''] ?? '跟随推荐',
        helper:
          'If your preferred provider cannot open this route, HuaXia will show the recommended fallback before launch.',
        editable: true,
      },
      {
        id: 'calendar_provider',
        title: '日历导出',
        description:
          'Calendar preference controls the default export option. You can still choose another option before exporting.',
        valueLabel: calendarProviderLabels[preferences?.calendar_provider ?? ''] ?? '手机日历或 .ics',
        editable: true,
      },
      {
        id: 'hotel_platform',
        title: '酒店平台',
        description: '酒店偏好会把常用平台放在住宿任务的第一选择。',
        valueLabel: hotelPlatformLabels[preferences?.hotel_platform ?? ''] ?? '跟随推荐',
        editable: true,
      },
      {
        id: 'flight_platform',
        title: '航班平台',
        description: '航班偏好会影响机票搜索、值机和航班状态动作的首选入口。',
        valueLabel: flightPlatformLabels[preferences?.flight_platform ?? ''] ?? '跟随推荐',
        editable: true,
      },
      {
        id: 'display_locale',
        title: '语言、地区与货币',
        description: '这些设置只改变界面显示，不会重写已生成的行程正文。',
        valueLabel: [
          languageLabels[preferences?.language ?? ''] ?? '简体中文',
          currencyLabels[preferences?.currency ?? ''] ?? '人民币 CNY',
        ].join(' · '),
        editable: true,
      },
    ],
  };

  const reminderRows: SettingsRow[] = [
    {
      id: 'notifications',
      title: '提醒方式',
      description: preferences?.notification_enabled
        ? '行前、出发日和返程提醒会按安静时段避让。'
        : '开启后才会请求通知权限；关闭时仍会显示应用内提醒。',
      valueLabel: preferences?.notification_enabled ? '已开启' : '应用内提醒',
      tone: preferences?.notification_enabled ? 'success' : 'info',
      editable: true,
    },
    {
      id: 'quiet_hours',
      title: '安静时段',
      description: '安静时段会减少夜间打扰；紧急安全提醒仍会显示在应用内。',
      valueLabel:
        preferences?.quiet_hours_start && preferences.quiet_hours_end
          ? `${preferences.quiet_hours_start}-${preferences.quiet_hours_end}`
          : '未设置',
      editable: true,
    },
    {
      id: 'fallback_reminders',
      title: '通知被拒绝时',
      description: '如果系统通知不可用，今日任务和出发日卡片会继续显示关键提醒。',
      valueLabel: '应用内兜底',
      tone: 'info',
    },
  ];

  const subscriptionRows: SettingsRow[] = [
    {
      id: 'tier',
      title: '当前方案',
      description: paywall?.positioning.primary_value ?? '订阅控制高级执行能力，不影响已创建旅行的安全信息。',
      valueLabel: subscription
        ? `${subscription.tier.toUpperCase()} · ${subscription.status}`
        : '读取中',
      tone: subscription?.status === 'active' || subscription?.status === 'trialing' ? 'success' : 'warning',
    },
    {
      id: 'safety_exception',
      title: '安全例外',
      description:
        'Safety information remains available for active trips even if subscription status changes.',
      valueLabel: paywall?.safety_exceptions?.length
        ? `${paywall.safety_exceptions.length} 项可用`
        : '始终可见',
      tone: 'success',
    },
  ];

  const privacyRows: SettingsRow[] = [
    {
      id: 'document_prompt_privacy',
      title: '证件与订单隐私',
      description: 'Sensitive documents are excluded from AI prompts by default.',
      valueLabel: privacy?.sensitive_documents_prompt_excluded === false ? '需要检查' : '默认排除',
      tone: privacy?.sensitive_documents_prompt_excluded === false ? 'warning' : 'success',
    },
    {
      id: 'support_access',
      title: '支持访问',
      description: 'Support access is off until you allow it for recovery.',
      valueLabel: privacy?.support_access_consent ? '已允许' : '关闭',
      tone: privacy?.support_access_consent ? 'success' : 'info',
      editable: true,
    },
    {
      id: 'local_cache',
      title: '本机离线缓存',
      description: '只保存当前旅行展示所需的非敏感内容，方便离线查看和快速启动。',
      valueLabel: '可清理',
    },
  ];

  const accountRows: SettingsRow[] = [
    {
      id: 'guest_upgrade',
      title: '账户恢复',
      description: '登录或升级账户后，旅行和任务可以跨设备恢复。',
      valueLabel: '可升级',
      editable: true,
    },
    {
      id: 'data_export',
      title: '数据导出',
      description: '导出包含行程、任务、隐私和订阅摘要；文件正文不会默认放入恢复包。',
      valueLabel: '可请求',
      editable: true,
    },
    {
      id: 'deletion_request',
      title: '删除请求',
      description: privacy?.deletion_policy ?? '删除请求会说明保留周期和活动旅行安全影响。',
      valueLabel: '需要确认',
      tone: 'danger',
      editable: true,
    },
  ];

  return {
    title: '偏好、隐私与账户',
    subtitle: '先保留旅行执行需要的默认值，再管理隐私、订阅和恢复。',
    screenQuestion: SETTINGS_SCREEN_QUESTION,
    sections: [
      tripDefaults,
      {
        id: 'reminders',
        title: '提醒',
        summary: '提醒设置会影响出发日、每日任务和返程检查的提示方式。',
        statusLabel: preferences?.notification_enabled ? '已开启' : '先用应用内提醒',
        rows: reminderRows,
      },
      {
        id: 'subscription',
        title: '订阅',
        summary: paywall?.positioning.subheadline ?? '查看当前方案、刷新状态，并确认安全功能不会被隐藏。',
        statusLabel: subscription?.status ?? '读取中',
        rows: subscriptionRows,
      },
      {
        id: 'privacy_documents',
        title: '隐私与文件',
        summary: '敏感文件、支持访问和本机缓存放在这里，和普通偏好分开。',
        statusLabel: privacy?.support_access_consent ? '支持访问已允许' : '支持访问关闭',
        rows: privacyRows,
      },
      {
        id: 'account_recovery',
        title: '账户与恢复',
        summary: '导出、删除和恢复动作都需要明确确认，不和常用开关混在一起。',
        statusLabel: '需要确认',
        rows: accountRows,
      },
    ],
    dangerActions: [
      {
        id: 'clear_cache',
        title: '清理本机离线缓存',
        description: '只清理这台设备上的离线展示数据；服务器行程不会改变。',
        buttonLabel: '清理本机缓存',
        tone: 'default',
      },
      {
        id: 'data_export',
        title: '生成支持恢复包',
        description: '导出行程、任务、隐私和订阅摘要；敏感文件正文默认排除。',
        buttonLabel: '生成恢复包',
        tone: 'default',
      },
      {
        id: 'delete_request',
        title: '请求删除账户与行程数据',
        description: '提交前会保留活动旅行的安全说明，并返回保留期提示。',
        buttonLabel: '请求删除数据',
        tone: 'danger',
      },
    ],
    supportAccess: {
      title: '支持人员访问授权',
      description: privacy?.support_access_consent
        ? '已允许支持人员在恢复问题时查看必要元数据。'
        : '默认关闭；需要恢复帮助时再开启。',
      accessibilityLabel: `support access ${privacy?.support_access_consent ? 'enabled' : 'disabled'}`,
      saveButtonLabel: '保存隐私设置',
      unchangedHelper: '修改支持访问后再保存。',
    },
    subscriptionRefresh: {
      buttonLabel: '刷新订阅状态',
      helper: '刷新只更新订阅摘要；不会改变你的行程、任务或安全信息。',
    },
  };
}
