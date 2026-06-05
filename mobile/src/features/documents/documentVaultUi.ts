import type {
  TripBooking,
  TripBookingCategory,
  TripDocument,
  TripDocumentCategory,
  TripDocumentCreateRequest,
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

export type DocumentVaultGroup = {
  key: DocumentVaultCategoryKey;
  title: string;
  subtitle: string;
  privacyCopy: string;
  sensitive: boolean;
  promptExcluded: boolean;
  documents: TripDocument[];
  bookings: TripBooking[];
  emptyLabel: string;
};

export const DOCUMENT_VAULT_CATEGORIES: Array<{
  key: DocumentVaultCategoryKey;
  title: string;
  subtitle: string;
  sensitive: boolean;
}> = [
  {
    key: 'flight_train',
    title: '机票 / 车票',
    subtitle: '航班、火车票、登机牌和交通订单。',
    sensitive: false,
  },
  {
    key: 'hotel',
    title: '住宿',
    subtitle: '酒店、民宿、入住确认和押金说明。',
    sensitive: false,
  },
  {
    key: 'ticket',
    title: '门票',
    subtitle: '景区、演出、活动和预约凭证。',
    sensitive: false,
  },
  {
    key: 'id_passport',
    title: '证件 / 护照',
    subtitle: '身份证、护照、签证和紧急身份证明。',
    sensitive: true,
  },
  {
    key: 'insurance',
    title: '保险',
    subtitle: '旅行保险、理赔电话和保单摘要。',
    sensitive: true,
  },
  {
    key: 'custom',
    title: '其他',
    subtitle: '自定义旅行文件和补充说明。',
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
}: {
  documents: TripDocument[];
  bookings: TripBooking[];
}): DocumentVaultGroup[] {
  return DOCUMENT_VAULT_CATEGORIES.map((category) => ({
    ...category,
    privacyCopy: category.sensitive
      ? '敏感文件默认只保存元数据，正文默认不进入任何 LLM 提示词。'
      : '默认保存执行所需元数据；如含隐私内容，同样不会自动进入 LLM 提示词。',
    promptExcluded: true,
    documents: documents.filter((document) => normalizeDocumentCategory(document.category) === category.key),
    bookings: bookings.filter((booking) => normalizeBookingCategory(booking.category) === category.key),
    emptyLabel: `暂无${category.title}文件或预订参考。`,
  }));
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
