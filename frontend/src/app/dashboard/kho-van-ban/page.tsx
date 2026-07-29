'use client';

import Link from 'next/link';
import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderKanban,
  Gavel,
  Loader2,
  Search,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  OnlyOfficePreview,
  type PreviewType,
} from '@/components/OnlyOfficePreview';
import { OnlyOfficeFilePreview } from '@/components/OnlyOfficeFilePreview';

type WarehouseTag =
  | 'DAT_SACH'
  | 'DU_TOAN'
  | 'KHLCNT'
  | 'LCNT'
  | 'THANH_TOAN';

type WarehouseSourceType =
  | 'DOCUMENT'
  | 'DOCUMENT_COVER'
  | 'DAT_SACH_GDN'
  | 'DAT_SACH_PCDI'
  | 'DAT_SACH_QD'
  | 'LCNT_STEP'
  | 'PAYMENT_STEP'
  | 'ATTACHMENT';

interface WarehouseItem {
  id: string;
  sourceType: WarehouseSourceType;
  sourceId: string;
  tag: WarehouseTag;
  title: string;
  documentNumber: string;
  projectId: string | null;
  projectName: string;
  packageName: string;
  status: string;
  updatedAt: string;
  openHref: string;
  objectPath?: string;
  fileName?: string;
}

interface WarehouseResponse {
  items: WarehouseItem[];
  stats: Record<WarehouseTag, number>;
  projects: Array<{
    id: string;
    tenDuAn: string;
    procurementType: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const TAGS: Array<{
  key: WarehouseTag;
  label: string;
  icon: typeof FileText;
  activeClass: string;
  badgeClass: string;
}> = [
  {
    key: 'DAT_SACH',
    label: 'Đặt sách',
    icon: BookOpen,
    activeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'DU_TOAN',
    label: 'Dự toán',
    icon: FileCheck2,
    activeClass: 'border-blue-200 bg-blue-50 text-blue-800',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'KHLCNT',
    label: 'Kế hoạch LCNT',
    icon: ClipboardList,
    activeClass: 'border-violet-200 bg-violet-50 text-violet-800',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
  {
    key: 'LCNT',
    label: 'Lựa chọn nhà thầu',
    icon: Gavel,
    activeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'THANH_TOAN',
    label: 'Thanh toán',
    icon: WalletCards,
    activeClass: 'border-rose-200 bg-rose-50 text-rose-800',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
];

const EMPTY_STATS: Record<WarehouseTag, number> = {
  DAT_SACH: 0,
  DU_TOAN: 0,
  KHLCNT: 0,
  LCNT: 0,
  THANH_TOAN: 0,
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  PENDING_APPROVAL: 'Chờ phê duyệt',
  PENDING_REVIEW: 'Chờ rà soát',
  PENDING_HEAD: 'Chờ trưởng đơn vị',
  PENDING_DIRECTOR: 'Chờ giám đốc',
  APPROVED: 'Đã phê duyệt',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Bị từ chối',
  REWORK: 'Cần chỉnh sửa',
};

function statusClass(status: string) {
  if (status === 'APPROVED' || status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
  }
  if (status.startsWith('PENDING')) {
    return 'bg-amber-50 text-amber-700 ring-amber-600/10';
  }
  if (status === 'REJECTED' || status === 'REWORK') {
    return 'bg-rose-50 text-rose-700 ring-rose-600/10';
  }
  return 'bg-slate-100 text-slate-600 ring-slate-500/10';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function onlyOfficeType(item: WarehouseItem): PreviewType | null {
  if (item.sourceType === 'DAT_SACH_GDN') return 'gdn';
  if (item.sourceType === 'DAT_SACH_PCDI') return 'pcdi';
  if (item.sourceType === 'DAT_SACH_QD') return 'qd';
  return null;
}

async function ensureResponse(response: Response, fallback: string) {
  if (response.ok) return response;
  const error = await response
    .json()
    .catch(() => ({ message: fallback }));
  throw new Error(error.message || fallback);
}

function WarehousePdfPreview({
  item,
  onClose,
}: {
  item: WarehouseItem;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    const load = async () => {
      try {
        let response: Response;
        if (item.sourceType === 'DOCUMENT') {
          response = await api.downloadDocumentPdf(item.sourceId);
        } else if (item.sourceType === 'DOCUMENT_COVER') {
          response = await api.previewDocumentCoverPdf(item.sourceId);
        } else if (item.sourceType === 'LCNT_STEP') {
          response = await api.downloadLCNTStepPdf(item.sourceId);
        } else {
          response = await api.downloadPaymentStepPdf(item.sourceId);
        }
        await ensureResponse(response, 'Không thể tạo bản xem trước');
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) setUrl(objectUrl);
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tạo bản xem trước',
          );
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4">
      <div className="flex h-[92vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {item.projectName}
              {item.packageName ? ` · ${item.packageName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex-1 bg-slate-200">
          {!url && !error && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang dựng PDF từ file Word…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="rounded-xl border border-rose-200 bg-white p-5 text-center text-sm text-rose-700">
                {error}
              </div>
            </div>
          )}
          {url && (
            <iframe
              src={`${url}#toolbar=1&navpanes=0&view=FitH`}
              title={item.title}
              className="h-full w-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentWarehousePage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<WarehouseTag | ''>('');
  const [projectId, setProjectId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WarehouseResponse>({
    items: [],
    stats: EMPTY_STATS,
    projects: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<WarehouseItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getDocumentWarehouse({
        q: query,
        tag: tag || undefined,
        projectId: projectId || undefined,
        page,
        limit: 20,
      })
      .then((response: WarehouseResponse) => {
        if (!cancelled) setData(response);
      })
      .catch((reason: any) => {
        if (!cancelled) {
          toast.error(reason?.message || 'Không thể tải kho văn bản');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, tag, projectId, page]);

  const totalAcrossTags = useMemo(
    () => Object.values(data.stats).reduce((sum, count) => sum + count, 0),
    [data.stats],
  );

  const handleDownload = async (item: WarehouseItem) => {
    try {
      if (item.sourceType === 'ATTACHMENT' && item.objectPath) {
        const { url } = await api.getLCNTFileUrl(item.objectPath);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = item.fileName || item.title;
        anchor.target = '_blank';
        anchor.click();
        return;
      }

      let response: Response;
      if (item.sourceType === 'DOCUMENT') {
        response = await api.downloadDocument(item.sourceId);
      } else if (item.sourceType === 'DOCUMENT_COVER') {
        response = await api.downloadDocumentCover(item.sourceId);
      } else if (item.sourceType === 'DAT_SACH_GDN') {
        response = await api.downloadGDNDatSach(item.sourceId);
      } else if (item.sourceType === 'DAT_SACH_PCDI') {
        response = await api.downloadPCDIDatSach(item.sourceId);
      } else if (item.sourceType === 'DAT_SACH_QD') {
        response = await api.downloadQDQuyetDinhDatSach(item.sourceId);
      } else if (item.sourceType === 'LCNT_STEP') {
        response = await api.downloadLCNTStepDocx(item.sourceId);
      } else {
        response = await api.downloadPaymentStepDocx(item.sourceId);
      }
      await ensureResponse(response, 'Không thể tải văn bản');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${item.title.replace(/[\\/:*?"<>|]/g, '-')}.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : 'Không thể tải văn bản',
      );
    }
  };

  const selectedOnlyOfficeType = previewItem
    ? onlyOfficeType(previewItem)
    : null;

  return (
    <div className="min-h-full bg-slate-50/70 px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
              <Archive className="h-4 w-4" />
              Không gian làm việc · Chủ đầu tư
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Kho văn bản
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Tra cứu tập trung toàn bộ văn bản theo dự án, số văn bản, tên
              gói thầu hoặc bất kỳ nội dung đã nhập trong hồ sơ.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Kết quả đang quản lý</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-950">
              {totalAcrossTags.toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm theo keyword, số văn bản, tên gói thầu…"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200"
                  aria-label="Xóa từ khóa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <label className="relative">
              <FolderKanban className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setPage(1);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Tất cả dự án</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.tenDuAn}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {TAGS.map((item) => {
              const Icon = item.icon;
              const active = tag === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTag(active ? '' : item.key);
                    setPage(1);
                  }}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                    active
                      ? item.activeClass
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-semibold">
                      {item.label}
                    </span>
                  </span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${item.badgeClass}`}>
                    {data.stats[item.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Danh sách văn bản</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {data.pagination.total.toLocaleString('vi-VN')} kết quả
                {query ? ` cho “${query}”` : ''}
              </p>
            </div>
            {loading && (
              <span className="flex items-center gap-2 text-xs font-medium text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang cập nhật
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Văn bản</th>
                  <th className="px-4 py-3">Phân loại</th>
                  <th className="px-4 py-3">Dự án / Gói thầu</th>
                  <th className="px-4 py-3">Số văn bản</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Cập nhật</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Archive className="mx-auto h-9 w-9 text-slate-300" />
                      <p className="mt-3 font-semibold text-slate-700">
                        Không tìm thấy văn bản phù hợp
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Thử bỏ bớt bộ lọc hoặc tìm bằng một phần số văn bản.
                      </p>
                    </td>
                  </tr>
                )}
                {data.items.map((item) => {
                  const tagMeta = TAGS.find((entry) => entry.key === item.tag)!;
                  const TagIcon = tagMeta.icon;
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50/80">
                      <td className="max-w-[320px] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                              {item.title}
                            </p>
                            {item.sourceType === 'ATTACHMENT' && (
                              <p className="mt-1 text-xs text-slate-400">Tệp đính kèm</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${tagMeta.badgeClass}`}>
                          <TagIcon className="h-3.5 w-3.5" />
                          {tagMeta.label}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-4 py-4">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {item.projectName}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.packageName || 'Chưa gắn tên gói thầu'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {item.documentNumber || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusClass(item.status)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            title="Xem trước"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Tải văn bản"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <Link
                            href={item.openHref}
                            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Mở hồ sơ
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-xs text-slate-500">
                Trang {data.pagination.page}/{data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewItem && selectedOnlyOfficeType && (
        <OnlyOfficePreview
          documentId={previewItem.sourceId}
          type={selectedOnlyOfficeType}
          onClose={() => setPreviewItem(null)}
        />
      )}
      {previewItem?.sourceType === 'ATTACHMENT' && previewItem.objectPath && (
        <OnlyOfficeFilePreview
          objectPath={previewItem.objectPath}
          onClose={() => setPreviewItem(null)}
        />
      )}
      {previewItem &&
        !selectedOnlyOfficeType &&
        previewItem.sourceType !== 'ATTACHMENT' && (
          <WarehousePdfPreview
            item={previewItem}
            onClose={() => setPreviewItem(null)}
          />
        )}
    </div>
  );
}
