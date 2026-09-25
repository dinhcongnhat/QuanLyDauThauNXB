import type { FieldDef } from '@/components/SmartFormField';

const API_BASE = '/api';

export type WorkflowFormData = Record<string, unknown>;

export type WorkflowAttachment = {
  path: string;
  fileName: string;
  ghiChu?: string;
};

export type LegalBasisSelectionValue = {
  legalDocumentId: string | null;
  source: 'LIBRARY' | 'MANUAL';
  citationSnapshot: string;
};

type TemplateFieldsResponse =
  | string[]
  | {
      fields?: string[];
      stepKey?: string;
      templateName?: string;
    };

const FIELD_ALIASES: Record<string, string> = {
  canCu: 'CanCu',
  canCuPhapLy: 'CanCu',
  CanCuPhapLy: 'CanCu',
  CanCuVanBanPhapLy: 'CanCu',
  TenCacVanBanPhapLyLienQuan: 'CanCu',
  MaSoHD: 'SoHopDong',
  MaSoHopDong: 'SoHopDong',
  soHopDong: 'SoHopDong',
  ThoiGianKyHD: 'NgayBanHanhHopDong',
  ThoiGianKyHĐ: 'NgayBanHanhHopDong',
  ThoiGianKyHopDong: 'NgayBanHanhHopDong',
  NgayKyHopDong: 'NgayBanHanhHopDong',
  NgayBanHanhHopdong: 'NgayBanHanhHopDong',
  NhaThau: 'TenNhaThau',
  MaSoThueNhaThau: 'MSTNhaThau',
  ChucVuDaiDienNhaThau: 'ChucVuNhaThau',
  DienThoaiNhaThau: 'SoDienThoaiNhaThau',
  ThongTinTaiKhoanNhaThau: 'TaiKhoanNhaThau',
  SoTaiKhoanNhaThau: 'TaiKhoanNhaThau',
  GiaHDBangSo: 'GiaGoiThau',
  GiaTriHopDongBangSo: 'GiaGoiThau',
  GiaHDBangChu: 'GiaGoiThauBangChu',
  GiaTriHopDongBangChu: 'GiaGoiThauBangChu',
  'DonViSanPham GoiThau': 'DonViSanPhamGoiThau',
  'HinhThucSanPham GoiThau': 'HinhThucSanPhamGoiThau',
};

const FIELD_LABELS: Record<string, string> = {
  SoVanBan: 'Số văn bản',
  SoHieuVanBan: 'Số hiệu văn bản',
  SoHopDong: 'Số hợp đồng',
  NgayBanHanh: 'Ngày ban hành',
  NgayBanHanhHopDong: 'Ngày ban hành hợp đồng',
  NgayBanHanhBienBanThuongThao: 'Ngày biên bản thương thảo',
  NgayBanHanhBienBanNghiemThu: 'Ngày biên bản nghiệm thu',
  TenGoiThau: 'Tên gói thầu',
  TenDuAn: 'Tên dự án/dự toán mua sắm',
  CanCu: 'Căn cứ',
  TenNhaThau: 'Tên nhà thầu',
  TenNhaThauGoiThau: 'Tên nhà thầu gói thầu',
  DiaChiNhaThau: 'Địa chỉ nhà thầu',
  DaiDienNhaThau: 'Đại diện nhà thầu',
  ChucVuNhaThau: 'Chức vụ đại diện nhà thầu',
  SoDienThoaiNhaThau: 'Số điện thoại nhà thầu',
  MSTNhaThau: 'Mã số thuế nhà thầu',
  TaiKhoanNhaThau: 'Thông tin tài khoản nhà thầu',
  CongViec: 'Công việc',
  SanPhamGoiThau: 'Sản phẩm gói thầu',
  DonViSanPhamGoiThau: 'Đơn vị sản phẩm gói thầu',
  SoLuongSanPhamGoiThau: 'Số lượng sản phẩm gói thầu',
  HinhThucSanPhamGoiThau: 'Hình thức sản phẩm gói thầu',
  ThoiGianThuongThao: 'Thời gian thương thảo',
  ThoiGianThucHienGoiThau: 'Thời gian thực hiện gói thầu',
  ThoiGianLuaChonNhaThauGoiThau: 'Thời gian lựa chọn nhà thầu',
  GiaGoiThau: 'Giá gói thầu',
  GiaGoiThauBangChu: 'Giá gói thầu bằng chữ',
  GiaGoiThauChuaThue: 'Giá gói thầu chưa thuế',
  ThueGoiThau: 'Thuế gói thầu',
  GiaDuToanGoiThau: 'Giá dự toán gói thầu',
  NguonVon: 'Nguồn vốn',
  LoaiHopDong: 'Loại hợp đồng',
  HinhThucLuaChonNhaThau: 'Hình thức lựa chọn nhà thầu',
};

const DATE_FIELDS = new Set([
  'NgayBanHanh',
  'NgayBanHanhHopDong',
  'NgayBanHanhBienBanThuongThao',
  'NgayBanHanhBienBanNghiemThu',
]);

const MONEY_FIELDS = new Set([
  'GiaGoiThau',
  'GiaGoiThauChuaThue',
  'ThueGoiThau',
  'GiaDuToanGoiThau',
]);

const MONEY_WORD_FIELDS: Record<string, string> = {
  GiaGoiThauBangChu: 'GiaGoiThau',
};

async function authenticatedGet<T>(path: string): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: 'Không thể tải dữ liệu' }));
    throw new Error(body.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function extractTemplateFields(payload: TemplateFieldsResponse): string[] {
  const fields = Array.isArray(payload) ? payload : payload.fields;
  if (!Array.isArray(fields)) return [];

  return Array.from(new Set(fields))
    .map((field) => canonicalWorkflowKey(String(field)))
    .filter(Boolean);
}

export async function getLCNTTemplateFieldKeys(
  stepId: string,
): Promise<string[]> {
  const payload = await authenticatedGet<TemplateFieldsResponse>(
    `/contractor-selection/step/${encodeURIComponent(stepId)}/template-fields`,
  );
  return extractTemplateFields(payload);
}

export async function getPaymentTemplateFieldKeys(
  stepId: string,
): Promise<string[]> {
  const payload = await authenticatedGet<TemplateFieldsResponse>(
    `/payment/step/${encodeURIComponent(stepId)}/template-fields`,
  );
  return extractTemplateFields(payload);
}

export function canonicalWorkflowKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  return FIELD_ALIASES[trimmed] || trimmed.replace(/\s+/g, '');
}

export function isBlankWorkflowValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) {
    return (
      value.length === 0 ||
      value.every((item) => {
        if (
          item &&
          typeof item === 'object' &&
          'citationSnapshot' in item
        ) {
          return String(
            (item as { citationSnapshot?: unknown }).citationSnapshot || '',
          ).trim() === '';
        }
        return isBlankWorkflowValue(item);
      })
    );
  }
  return false;
}

export function normalizeLegalBasisValue(
  value: unknown,
): LegalBasisSelectionValue[] {
  if (Array.isArray(value)) {
    return value
      .map((item): LegalBasisSelectionValue | null => {
        if (typeof item === 'string') {
          const citationSnapshot = item.trim();
          return citationSnapshot
            ? {
                legalDocumentId: null,
                source: 'MANUAL',
                citationSnapshot,
              }
            : null;
        }
        if (!item || typeof item !== 'object') return null;

        const record = item as Record<string, unknown>;
        const citationSnapshot = String(
          record.citationSnapshot ?? record.citation ?? '',
        ).trim();
        if (!citationSnapshot) return null;

        return {
          legalDocumentId: record.legalDocumentId
            ? String(record.legalDocumentId)
            : null,
          source:
            record.source === 'LIBRARY' && record.legalDocumentId
              ? 'LIBRARY'
              : 'MANUAL',
          citationSnapshot,
        };
      })
      .filter((item): item is LegalBasisSelectionValue => item !== null);
  }

  if (typeof value !== 'string' || !value.trim()) return [];

  const citations = value
    .replace(/;\s*(?=Căn\s+cứ\b)/gi, ';\n')
    .split(/\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return citations.map((citationSnapshot) => ({
    legalDocumentId: null,
    source: 'MANUAL',
    citationSnapshot,
  }));
}

export function normalizeWorkflowData(
  source: Record<string, unknown> | null | undefined,
): WorkflowFormData {
  const normalized: WorkflowFormData = { ...(source || {}) };
  const hasLegalBasisKey = [
    'CanCu',
    'canCu',
    'canCuPhapLy',
    'CanCuPhapLy',
    'CanCuVanBanPhapLy',
    'TenCacVanBanPhapLyLienQuan',
  ].some((key) => key in normalized);

  for (const [legacyKey, canonicalKey] of Object.entries(FIELD_ALIASES)) {
    const legacyValue = normalized[legacyKey];
    if (
      isBlankWorkflowValue(normalized[canonicalKey]) &&
      !isBlankWorkflowValue(legacyValue)
    ) {
      normalized[canonicalKey] = legacyValue;
    }
  }

  if (hasLegalBasisKey) {
    normalized.CanCu = normalizeLegalBasisValue(normalized.CanCu);
  }
  return normalized;
}

/**
 * Chỉ đưa các placeholder thật sự thuộc mẫu hiện tại vào form. Dữ liệu workflow
 * cũ thường chứa cả snapshot dự án/gói thầu (object, array); ép toàn bộ chúng
 * bằng String() sẽ tạo ra "[object Object]" và ghi ngược giá trị lỗi vào DB.
 */
export function pickWorkflowFormData(
  source: Record<string, unknown> | null | undefined,
  allowedKeys: Iterable<string>,
): WorkflowFormData {
  const normalized = normalizeWorkflowData(source);
  const result: WorkflowFormData = {};

  for (const rawKey of Array.from(allowedKeys)) {
    const key = canonicalWorkflowKey(String(rawKey));
    if (!key || !(key in normalized)) continue;
    const value = normalized[key];

    if (key === 'CanCu') {
      result[key] = normalizeLegalBasisValue(value);
      continue;
    }
    if (
      value === null
      || value === undefined
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    ) {
      result[key] = value == null ? '' : String(value);
    }
  }

  return result;
}

export function formatWorkflowDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return /\[object Object\]/i.test(value) ? '' : value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatWorkflowDisplayValue(item))
      .filter(Boolean)
      .join('; ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of [
      'citationSnapshot',
      'fileName',
      'originalName',
      'label',
      'title',
      'name',
      'tenGoiThau',
      'tenDuAn',
      'value',
    ]) {
      const formatted = formatWorkflowDisplayValue(record[key]);
      if (formatted) return formatted;
    }

    return Object.entries(record)
      .map(([key, item]) => {
        const formatted = formatWorkflowDisplayValue(item);
        return formatted ? `${humanizeTemplateKey(key)}: ${formatted}` : '';
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(' · ');
  }
  return '';
}

export function getWorkflowDisplayEntries(
  source: Record<string, unknown> | null | undefined,
  allowedKeys?: Iterable<string>,
): Array<{ key: string; label: string; value: string }> {
  const normalized = normalizeWorkflowData(source);
  const keys = allowedKeys
    ? Array.from(allowedKeys, (key) => canonicalWorkflowKey(String(key)))
    : Object.keys(normalized).map(canonicalWorkflowKey);
  const seen = new Set<string>();

  return keys.flatMap((key) => {
    if (!key || key.startsWith('_') || seen.has(key)) return [];
    seen.add(key);
    const value = formatWorkflowDisplayValue(normalized[key]);
    if (!value) return [];
    return [{
      key,
      label: FIELD_LABELS[key] || humanizeTemplateKey(key),
      value,
    }];
  });
}

/**
 * Dữ liệu cũ từng lưu `_attachments` dưới nhiều dạng (mảng, một object hoặc
 * một chuỗi). Luôn chuẩn hóa trước khi render để một bản ghi cũ không thể làm
 * hỏng toàn bộ trang bằng lỗi `.map is not a function`.
 */
export function normalizeWorkflowAttachments(
  value: unknown,
): WorkflowAttachment[] {
  const values = Array.isArray(value)
    ? value
    : value == null || value === ''
      ? []
      : [value];

  return values
    .map((item): WorkflowAttachment | null => {
      if (typeof item === 'string') {
        const path = item.trim();
        if (!path || /\[object Object\]/i.test(path)) return null;
        const rawName = path.split('/').pop() || path;
        let fileName = rawName;
        try {
          fileName = decodeURIComponent(rawName);
        } catch {
          // Tên tệp cũ có thể không phải URI encoded.
        }
        return { path, fileName };
      }
      if (!item || typeof item !== 'object') return null;

      const record = item as Record<string, unknown>;
      const path = String(record.path || record.objectPath || '').trim();
      if (!path) return null;
      const rawName = path.split('/').pop() || path;
      return {
        path,
        fileName: String(record.fileName || record.originalName || rawName),
        ...(record.ghiChu ? { ghiChu: String(record.ghiChu) } : {}),
      };
    })
    .filter((item): item is WorkflowAttachment => item !== null);
}

function inferGroup(key: string): FieldDef['group'] {
  if (/NhaThau|MSTNhaThau|TaiKhoanNhaThau/i.test(key)) return 'nt';
  if (/ChuDauTu/i.test(key)) return 'cdt';
  return 'chung';
}

export function fieldDefinitionForTemplateKey(rawKey: string): FieldDef {
  const key = canonicalWorkflowKey(rawKey);
  const moneyWordsLinkedTo = MONEY_WORD_FIELDS[key];

  return {
    key,
    label: FIELD_LABELS[key] || humanizeTemplateKey(key),
    type:
      key === 'CanCu'
        ? 'textarea'
        : DATE_FIELDS.has(key)
          ? 'date'
          : MONEY_FIELDS.has(key)
            ? 'money'
            : moneyWordsLinkedTo
              ? 'money-words'
              : undefined,
    linkedTo: moneyWordsLinkedTo,
    group: inferGroup(key),
  };
}

export function mergeTemplateFields(
  configuredFields: FieldDef[],
  templateKeys: string[],
): FieldDef[] {
  // Khi đọc được placeholder từ DOCX, file mẫu là nguồn sự thật: không
  // hiển thị các trường cấu hình cũ (đặc biệt là CanCu) nếu mẫu không có.
  // Chỉ dùng toàn bộ cấu hình tĩnh làm fallback khi endpoint không trả khóa.
  const templateKeySet = new Set(
    templateKeys.map((key) => canonicalWorkflowKey(key)),
  );
  const merged =
    templateKeySet.size > 0
      ? configuredFields.filter((field) =>
          templateKeySet.has(canonicalWorkflowKey(field.key)),
        )
      : [...configuredFields];
  const canonicalKeys = new Set<string>();

  for (const field of merged) {
    canonicalKeys.add(canonicalWorkflowKey(field.key));
  }

  for (const rawKey of templateKeys) {
    const key = canonicalWorkflowKey(rawKey);
    if (!canonicalKeys.has(key)) {
      merged.push(fieldDefinitionForTemplateKey(key));
      canonicalKeys.add(key);
    }
  }

  return merged;
}

export function humanizeTemplateKey(key: string): string {
  return (
    key
      .replace(/([a-zà-ỹ0-9])([A-ZĐ])/g, '$1 $2')
      .replace(/([A-ZĐ]+)([A-ZĐ][a-zà-ỹ])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim() || key
  );
}

export async function getCompletedPaymentContracts(
  query = '',
  projectId?: string,
): Promise<any[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (projectId) params.set('projectId', projectId);

  const suffix = params.toString();
  const contracts = await authenticatedGet<any[]>(
    `/payment/contracts${suffix ? `?${suffix}` : ''}`,
  );

  if (!query.trim()) return contracts;

  const keyword = query.trim().toLocaleLowerCase('vi');
  return contracts.filter((contract) => {
    const hopDongData =
      contract.steps?.find((item: any) => item.stepKey === 'hop_dong')?.data ||
      contract.steps?.[0]?.data ||
      {};
    const searchable = [
      hopDongData.SoHopDong,
      hopDongData.MaSoHD,
      hopDongData.MaSoHopDong,
      contract.tenGoiThau,
      hopDongData.TenNhaThau,
      hopDongData.NhaThau,
      hopDongData.TenDuAn,
      contract.project?.tenDuAn,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi');
    return searchable.includes(keyword);
  });
}
