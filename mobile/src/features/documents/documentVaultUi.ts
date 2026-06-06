import type {
  TripBooking,
  TripBookingCategory,
  TripDocument,
  TripDocumentCategory,
  TripDocumentCreateRequest,
  TripPhase,
  TripTask,
} from '../../types/trip';

export type DocumentVaultCategoryKey =
  | 'flight_train'
  | 'hotel'
  | 'ticket'
  | 'id_passport'
  | 'insurance'
  | 'custom';

export type PickedDocumentAsset = {
  name?: string | null;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
};

export type DocumentVaultReadinessStatus =
  | 'ready'
  | 'missing'
  | 'needs_review'
  | 'sensitive'
  | 'saved_locally'
  | 'unavailable';

export type DocumentVaultPrivacyStatus =
  | 'standard'
  | 'sensitive'
  | 'prompt_excluded'
  | 'needs_user_scope';

export type DocumentVaultPrimaryAction =
  | 'add_proof'
  | 'attach_to_task'
  | 'open_booking'
  | 'review_privacy'
  | 'replace_file';

export type DocumentVaultItem = {
  itemId: string;
  itemType: 'document' | 'booking';
  title: string;
  category: DocumentVaultCategoryKey;
  provider?: string | null;
  confirmationCodeMasked?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sensitivity: 'standard' | 'sensitive';
  promptPolicy: 'excluded' | 'needs_scoped_approval';
  localAvailable: boolean;
  remoteAvailable: boolean;
  linkedTaskIds: string[];
  displayStatus: string;
  revealRequired: boolean;
  lastVerifiedAt?: string | null;
};

export type DocumentVaultGroup = {
  key: DocumentVaultCategoryKey;
  title: string;
  subtitle: string;
  executionSubtitle: string;
  privacyCopy: string;
  privacyLabel: string;
  privacyStatus: DocumentVaultPrivacyStatus;
  sensitive: boolean;
  promptExcluded: boolean;
  documents: TripDocument[];
  bookings: TripBooking[];
  items: DocumentVaultItem[];
  emptyLabel: string;
  emptyStateCopy: string;
  readinessStatus: DocumentVaultReadinessStatus;
  readinessLabel: string;
  documentCount: number;
  bookingCount: number;
  missingRequiredCount: number;
  relatedTaskIds: string[];
  relatedTaskCount: number;
  missingProofTasks: TripTask[];
  primaryAction: DocumentVaultPrimaryAction;
  primaryActionLabel: string;
  offlineAvailability: 'local_available' | 'cloud_only' | 'mixed' | 'none';
  accessibilityLabel: string;
  priorityRank: number;
};

export const DOCUMENT_VAULT_PROOF_QUESTION =
  'What proof or booking do I need for this trip step?';

export const DOCUMENT_VAULT_PROOF_QUESTION_ZH = '这一步需要什么凭证或预订信息？';

export const DOCUMENT_VAULT_SENSITIVE_PRIVACY_COPY =
  '证件文件属于隐私内容。HuaXia 不会读取正文，除非你为某一个任务明确授权。';

export const DOCUMENT_VAULT_BOOKING_CODE_ONLY_COPY =
  '已有预订号，但还没有凭证文件。';

export const DOCUMENT_VAULT_CATEGORIES: Array<{
  key: DocumentVaultCategoryKey;
  title: string;
  subtitle: string;
  executionSubtitle: string;
  sensitive: boolean;
}> = [
  {
    key: 'flight_train',
    title: '机票 / 车票',
    subtitle: '航班、火车票、登机牌和交通订单。',
    executionSubtitle: '出发和返程时优先看这里：班次、登机牌、座位、行李和换乘凭证。',
    sensitive: false,
  },
  {
    key: 'hotel',
    title: '住宿',
    subtitle: '酒店、民宿、入住确认和押金说明。',
    executionSubtitle: '入住前优先看这里：酒店地址、确认号、入住时间和押金说明。',
    sensitive: false,
  },
  {
    key: 'ticket',
    title: '门票',
    subtitle: '景区、演出、活动和预约凭证。',
    executionSubtitle: '游玩当天优先看这里：预约码、入场时段、证件要求和退改说明。',
    sensitive: false,
  },
  {
    key: 'id_passport',
    title: '证件 / 护照',
    subtitle: '身份证、护照、签证和紧急身份证明。',
    executionSubtitle: '出发、值机、入住和紧急场景优先看这里。',
    sensitive: true,
  },
  {
    key: 'insurance',
    title: '保险',
    subtitle: '旅行保险、理赔电话和保单摘要。',
    executionSubtitle: '风险或紧急场景优先看这里：保单号、热线和覆盖范围。',
    sensitive: true,
  },
  {
    key: 'custom',
    title: '其他',
    subtitle: '自定义旅行文件和补充说明。',
    executionSubtitle: '临时补充、收据、同行说明和其他证明集中放这里。',
    sensitive: true,
  },
];

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'txt',
  'csv',
  'doc',
  'docx',
  'xls',
  'xlsx',
]);

export function buildDocumentVaultGroups({
  documents,
  bookings,
  tasks = [],
  phases = [],
  currentPhaseType,
}: {
  documents: TripDocument[];
  bookings: TripBooking[];
  tasks?: TripTask[];
  phases?: TripPhase[];
  currentPhaseType?: string | null;
}): DocumentVaultGroup[] {
  const activePhaseType = currentPhaseType ?? currentPhaseTypeFromPhases(phases);
  return DOCUMENT_VAULT_CATEGORIES.map((category) => {
    const groupDocuments = documents.filter((document) => normalizeDocumentCategory(document.category) === category.key);
    const groupBookings = bookings.filter((booking) => normalizeBookingCategory(booking.category) === category.key);
    const relatedTasks = tasks.filter((task) => categoryForTask(task) === category.key);
    const linkedTaskIds = unique([
      ...groupDocuments.flatMap((document) => document.task_ids),
      ...groupBookings.flatMap((booking) => booking.task_ids),
    ]);
    const missingProofTasks = relatedTasks.filter((task) => {
      if (task.status === 'completed' || task.status === 'skipped') {
        return false;
      }
      return !linkedTaskIds.includes(task.task_id);
    });
    const items = buildDocumentVaultItems({
      documents: groupDocuments,
      bookings: groupBookings,
      category: category.key,
      documentsInGroup: groupDocuments,
    });
    const readinessStatus = readinessForGroup({
      categorySensitive: category.sensitive,
      documents: groupDocuments,
      bookings: groupBookings,
      missingProofTasks,
      items,
    });
    const privacyStatus: DocumentVaultPrivacyStatus = category.sensitive
      ? 'sensitive'
      : items.some((item) => item.promptPolicy === 'needs_scoped_approval')
        ? 'needs_user_scope'
        : 'prompt_excluded';
    const primaryAction = primaryActionForGroup({
      readinessStatus,
      documents: groupDocuments,
      bookings: groupBookings,
      missingProofTasks,
      sensitive: category.sensitive,
    });
    const localDocumentCount = groupDocuments.filter((document) => Boolean(document.local_reference)).length;
    const remoteDocumentCount = groupDocuments.filter((document) => Boolean(document.storage_ref)).length;
    const offlineAvailability = offlineAvailabilityForGroup({
      documentCount: groupDocuments.length,
      localDocumentCount,
      remoteDocumentCount,
    });
    const readinessLabel = readinessLabelForStatus(readinessStatus);
    const privacyLabel = privacyLabelForStatus(privacyStatus);
    const primaryActionLabel = primaryActionLabelForGroup(primaryAction);
    return {
      ...category,
      privacyCopy: privacyCopyForGroup(category.sensitive, privacyStatus),
      privacyLabel,
      privacyStatus,
      promptExcluded: true,
      documents: groupDocuments,
      bookings: groupBookings,
      items,
      emptyLabel: `暂无${category.title}文件或预订参考。`,
      emptyStateCopy: emptyStateCopyForGroup(category.key),
      readinessStatus,
      readinessLabel,
      documentCount: groupDocuments.length,
      bookingCount: groupBookings.length,
      missingRequiredCount: missingProofTasks.length,
      relatedTaskIds: relatedTasks.map((task) => task.task_id),
      relatedTaskCount: relatedTasks.length,
      missingProofTasks,
      primaryAction,
      primaryActionLabel,
      offlineAvailability,
      accessibilityLabel: `${category.title}，${readinessLabel}，${privacyLabel}，${primaryActionLabel}`,
      priorityRank: priorityRankForGroup(category.key, activePhaseType, missingProofTasks.length),
    };
  }).sort((left, right) => left.priorityRank - right.priorityRank);
}

export function buildDocumentAttachDraft({
  asset,
  category,
  taskId,
}: {
  asset: PickedDocumentAsset;
  category: DocumentVaultCategoryKey;
  taskId?: string | null;
}): TripDocumentCreateRequest {
  const title = asset.name?.trim() || '旅行文件';
  const categoryConfig =
    DOCUMENT_VAULT_CATEGORIES.find((item) => item.key === category) ??
    DOCUMENT_VAULT_CATEGORIES[DOCUMENT_VAULT_CATEGORIES.length - 1];
  return {
    category,
    title,
    file_name: asset.name ?? null,
    content_type: asset.mimeType ?? null,
    local_reference: asset.uri,
    storage_ref: `local-cache:${asset.uri}`,
    task_ids: taskId ? [taskId] : [],
    sensitive: categoryConfig.sensitive,
  };
}

export function validatePickedDocumentAsset(asset: PickedDocumentAsset): string | null {
  const size = asset.size ?? 0;
  if (size > MAX_DOCUMENT_BYTES) {
    return '文件过大，请选择 20MB 以内的文件。';
  }
  const extension = extensionFromName(asset.name);
  if (extension && !SUPPORTED_EXTENSIONS.has(extension)) {
    return `不支持的文件类型：.${extension}`;
  }
  if (!asset.uri) {
    return '缺少本地文件权限或文件引用。';
  }
  return null;
}

export function taskOptionsForDocumentAttach(tasks: TripTask[]): TripTask[] {
  return tasks.filter((task) =>
    ['document', 'booking', 'ticket', 'transport', 'lodging', 'safety'].includes(task.category),
  );
}

export function categoryForTask(task: TripTask): DocumentVaultCategoryKey {
  const haystack = `${task.category} ${task.title} ${task.instruction ?? ''}`.toLowerCase();
  if (task.category === 'transport' || /flight|train|rail|boarding|航班|火车|高铁|登机|车票/.test(haystack)) {
    return 'flight_train';
  }
  if (task.category === 'lodging' || /hotel|lodging|homestay|酒店|住宿|民宿|入住/.test(haystack)) {
    return 'hotel';
  }
  if (task.category === 'ticket' || /ticket|reservation|entry|门票|预约|入场/.test(haystack)) {
    return 'ticket';
  }
  if (/passport|visa|id|identity|护照|签证|身份证|证件/.test(haystack)) {
    return 'id_passport';
  }
  if (task.category === 'safety' || /insurance|policy|claim|保险|保单|理赔|安全/.test(haystack)) {
    return 'insurance';
  }
  return 'custom';
}

export function maskConfirmationCode(code?: string | null): string | null {
  if (!code) {
    return null;
  }
  const trimmed = code.trim();
  if (trimmed.length <= 4) {
    return '••••';
  }
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}••${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-3)}`;
}

export function currentPhaseTypeFromPhases(phases: TripPhase[]): string | null {
  return phases.find((phase) => phase.status === 'current')?.phase_type ?? null;
}

function normalizeDocumentCategory(category: TripDocumentCategory): DocumentVaultCategoryKey {
  if (category === 'visa') {
    return 'id_passport';
  }
  if (DOCUMENT_VAULT_CATEGORIES.some((item) => item.key === category)) {
    return category as DocumentVaultCategoryKey;
  }
  return 'custom';
}

function normalizeBookingCategory(category: TripBookingCategory): DocumentVaultCategoryKey {
  if (category === 'flight' || category === 'train' || category === 'transport') {
    return 'flight_train';
  }
  if (category === 'hotel') {
    return 'hotel';
  }
  if (category === 'ticket') {
    return 'ticket';
  }
  return 'custom';
}

function extensionFromName(name?: string | null): string | null {
  if (!name || !name.includes('.')) {
    return null;
  }
  return name.split('.').pop()?.toLowerCase() ?? null;
}

function buildDocumentVaultItems({
  documents,
  bookings,
  category,
  documentsInGroup,
}: {
  documents: TripDocument[];
  bookings: TripBooking[];
  category: DocumentVaultCategoryKey;
  documentsInGroup: TripDocument[];
}): DocumentVaultItem[] {
  const documentItems = documents.map((document): DocumentVaultItem => {
    const localAvailable = Boolean(document.local_reference);
    const remoteAvailable = Boolean(document.storage_ref);
    return {
      itemId: document.document_id,
      itemType: 'document',
      title: document.title,
      category,
      fileName: document.file_name ?? null,
      contentType: document.content_type ?? null,
      sensitivity: document.sensitive ? 'sensitive' : 'standard',
      promptPolicy: document.prompt_excluded ? 'excluded' : 'needs_scoped_approval',
      localAvailable,
      remoteAvailable,
      linkedTaskIds: document.task_ids,
      displayStatus: localAvailable
        ? 'Saved locally. You can still open it offline.'
        : remoteAvailable
          ? '云端引用已保存，离线前建议保留本地副本。'
          : 'HuaXia cannot access this file anymore.',
      revealRequired: document.sensitive,
      lastVerifiedAt: document.updated_at,
    };
  });
  const bookingItems = bookings.map((booking): DocumentVaultItem => {
    const hasLinkedProof = documentsInGroup.some(
      (document) =>
        booking.source_document_id === document.document_id ||
        booking.task_ids.some((taskId) => document.task_ids.includes(taskId)),
    );
    return {
      itemId: booking.booking_id,
      itemType: 'booking',
      title: booking.title,
      category,
      provider: booking.provider ?? null,
      confirmationCodeMasked: maskConfirmationCode(booking.confirmation_code),
      sensitivity: 'standard',
      promptPolicy: 'excluded',
      localAvailable: false,
      remoteAvailable: Boolean(booking.source_document_id),
      linkedTaskIds: booking.task_ids,
      displayStatus: hasLinkedProof
        ? '预订参考已关联到凭证文件。'
        : DOCUMENT_VAULT_BOOKING_CODE_ONLY_COPY,
      revealRequired: Boolean(booking.confirmation_code),
      lastVerifiedAt: booking.updated_at,
    };
  });
  return [...documentItems, ...bookingItems];
}

function readinessForGroup({
  categorySensitive,
  documents,
  bookings,
  missingProofTasks,
  items,
}: {
  categorySensitive: boolean;
  documents: TripDocument[];
  bookings: TripBooking[];
  missingProofTasks: TripTask[];
  items: DocumentVaultItem[];
}): DocumentVaultReadinessStatus {
  if (items.some((item) => item.displayStatus === 'HuaXia cannot access this file anymore.')) {
    return 'unavailable';
  }
  if (missingProofTasks.length > 0) {
    return 'missing';
  }
  if (
    bookings.some(
      (booking) =>
        !booking.source_document_id &&
        !documents.some((document) => booking.task_ids.some((taskId) => document.task_ids.includes(taskId))),
    )
  ) {
    return 'needs_review';
  }
  if (categorySensitive && documents.length > 0) {
    return 'sensitive';
  }
  if (documents.some((document) => document.local_reference) && !documents.some((document) => document.storage_ref)) {
    return 'saved_locally';
  }
  if (documents.length || bookings.length) {
    return 'ready';
  }
  return 'missing';
}

function readinessLabelForStatus(status: DocumentVaultReadinessStatus): string {
  const labels: Record<DocumentVaultReadinessStatus, string> = {
    ready: '已就绪',
    missing: '缺少凭证',
    needs_review: '需要复核',
    sensitive: '敏感文件',
    saved_locally: '已本地保存',
    unavailable: '不可用',
  };
  return labels[status];
}

function privacyLabelForStatus(status: DocumentVaultPrivacyStatus): string {
  const labels: Record<DocumentVaultPrivacyStatus, string> = {
    standard: '隐私已保护',
    sensitive: '敏感文件',
    prompt_excluded: '默认不进提示词',
    needs_user_scope: '需单独授权',
  };
  return labels[status];
}

function privacyCopyForGroup(sensitive: boolean, status: DocumentVaultPrivacyStatus): string {
  if (sensitive) {
    return '敏感文件默认只保存元数据。HuaXia 不会读取正文，除非你为某一个任务明确授权。';
  }
  if (status === 'needs_user_scope') {
    return '这组文件需要你确认用途后才会进入任何 AI 辅助处理。';
  }
  return '默认保存执行所需元数据；如含隐私内容，同样不会自动进入 LLM 提示词。';
}

function primaryActionForGroup({
  readinessStatus,
  documents,
  bookings,
  missingProofTasks,
  sensitive,
}: {
  readinessStatus: DocumentVaultReadinessStatus;
  documents: TripDocument[];
  bookings: TripBooking[];
  missingProofTasks: TripTask[];
  sensitive: boolean;
}): DocumentVaultPrimaryAction {
  if (readinessStatus === 'unavailable') {
    return 'replace_file';
  }
  if (missingProofTasks.length > 0) {
    return 'attach_to_task';
  }
  if (sensitive && documents.length > 0) {
    return 'review_privacy';
  }
  if (bookings.length > 0 && documents.length === 0) {
    return 'open_booking';
  }
  return 'add_proof';
}

function primaryActionLabelForGroup(action: DocumentVaultPrimaryAction): string {
  const labels: Record<DocumentVaultPrimaryAction, string> = {
    add_proof: '添加凭证',
    attach_to_task: '关联到任务',
    open_booking: '查看预订',
    review_privacy: '查看隐私设置',
    replace_file: '替换文件',
  };
  return labels[action];
}

function emptyStateCopyForGroup(key: DocumentVaultCategoryKey): string {
  const copies: Record<DocumentVaultCategoryKey, string> = {
    flight_train: '出发前添加机票、车票或登机牌，路线和提醒会更稳。',
    hotel: 'Add your hotel confirmation before check-in.',
    ticket: '添加明天或当天的门票凭证，入场任务会更清楚。',
    id_passport: '证件文件很敏感。只需要保存元数据时，不要上传正文。',
    insurance: '添加保单摘要、理赔电话或紧急热线，风险任务会更好执行。',
    custom: '把临时说明、收据或同行文件放到这里。',
  };
  return copies[key];
}

function offlineAvailabilityForGroup({
  documentCount,
  localDocumentCount,
  remoteDocumentCount,
}: {
  documentCount: number;
  localDocumentCount: number;
  remoteDocumentCount: number;
}): DocumentVaultGroup['offlineAvailability'] {
  if (documentCount === 0) {
    return 'none';
  }
  if (localDocumentCount === documentCount) {
    return 'local_available';
  }
  if (localDocumentCount > 0 && remoteDocumentCount > 0) {
    return 'mixed';
  }
  return 'cloud_only';
}

function priorityRankForGroup(
  key: DocumentVaultCategoryKey,
  currentPhaseType?: string | null,
  missingRequiredCount = 0,
): number {
  const phasePriority: Record<string, DocumentVaultCategoryKey[]> = {
    planning: ['hotel', 'flight_train', 'ticket', 'id_passport', 'insurance', 'custom'],
    booking: ['flight_train', 'hotel', 'ticket', 'id_passport', 'insurance', 'custom'],
    preparation: ['id_passport', 'flight_train', 'hotel', 'ticket', 'insurance', 'custom'],
    departure_day: ['flight_train', 'id_passport', 'insurance', 'hotel', 'ticket', 'custom'],
    airport_or_station: ['flight_train', 'id_passport', 'insurance', 'hotel', 'ticket', 'custom'],
    transit: ['flight_train', 'id_passport', 'insurance', 'hotel', 'ticket', 'custom'],
    arrival: ['hotel', 'id_passport', 'flight_train', 'insurance', 'ticket', 'custom'],
    hotel_checkin: ['hotel', 'id_passport', 'insurance', 'flight_train', 'ticket', 'custom'],
    daily_activities: ['ticket', 'hotel', 'flight_train', 'id_passport', 'insurance', 'custom'],
    return_preparation: ['flight_train', 'hotel', 'insurance', 'id_passport', 'ticket', 'custom'],
    return_transit: ['flight_train', 'id_passport', 'insurance', 'hotel', 'ticket', 'custom'],
  };
  const fallback = DOCUMENT_VAULT_CATEGORIES.map((category) => category.key);
  const priorityList = phasePriority[currentPhaseType ?? ''] ?? fallback;
  const base = priorityList.indexOf(key);
  return (base === -1 ? 99 : base) - missingRequiredCount * 10;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
