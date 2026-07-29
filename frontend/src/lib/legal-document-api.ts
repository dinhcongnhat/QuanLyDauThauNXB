const API_BASE = '/api';

export interface LegalDocument {
  id: string;
  tenCanCu: string | null;
  soHieu: string;
  coQuanBanHanh: string;
  hinhThucVanBan: string;
  linhVuc: string;
  trichYeuNoiDung: string;
  ngayBanHanh: string;
  createdAt: string;
  updatedAt: string;
  citation: string;
}

export interface LegalDocumentInput {
  tenCanCu: string;
  soHieu: string;
  coQuanBanHanh: string;
  hinhThucVanBan: string;
  linhVuc: string;
  trichYeuNoiDung: string;
  ngayBanHanh: string;
}

export interface LegalDocumentListParams {
  q?: string;
  page?: number;
  limit?: number;
  hinhThuc?: string;
  linhVuc?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LegalDocumentListResponse {
  items: LegalDocument[];
  pagination: Pagination;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Không thể kết nối đến máy chủ' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message;
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: LegalDocumentListParams): string {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) searchParams.set('q', params.q.trim());
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.hinhThuc?.trim()) {
    searchParams.set('hinhThuc', params.hinhThuc.trim());
  }
  if (params.linhVuc?.trim()) {
    searchParams.set('linhVuc', params.linhVuc.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const legalDocumentApi = {
  list: (params: LegalDocumentListParams = {}) =>
    request<LegalDocumentListResponse>(
      `/legal-documents${buildQuery(params)}`,
    ),

  get: (id: string) =>
    request<LegalDocument>(`/legal-documents/${encodeURIComponent(id)}`),

  create: (data: LegalDocumentInput) =>
    request<LegalDocument>('/legal-documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<LegalDocumentInput>) =>
    request<LegalDocument>(`/legal-documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ message: string }>(
      `/legal-documents/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
};

function stripTrailingPunctuation(value: string): string {
  return value.trim().replace(/[\s,.;:]+$/, '');
}

export function formatLegalDocumentCitation(
  document: Pick<
    LegalDocumentInput,
    | 'soHieu'
    | 'coQuanBanHanh'
    | 'hinhThucVanBan'
    | 'trichYeuNoiDung'
    | 'ngayBanHanh'
  >,
): string {
  const datePart = document.ngayBanHanh.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  const formattedDate =
    year && month && day ? `${day}/${month}/${year}` : datePart;

  return `Căn cứ ${stripTrailingPunctuation(document.hinhThucVanBan)} ${stripTrailingPunctuation(document.trichYeuNoiDung)} số ${stripTrailingPunctuation(document.soHieu)}, ngày ${formattedDate} của ${stripTrailingPunctuation(document.coQuanBanHanh)};`;
}

export function normalizeManualCitation(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const withoutEnd = trimmed.replace(/[\s,.;:]+$/, '');
  const withPrefix = /^căn cứ(?:\s|$)/i.test(withoutEnd)
    ? withoutEnd.replace(/^căn cứ/i, 'Căn cứ')
    : `Căn cứ ${withoutEnd}`;

  return `${withPrefix};`;
}
