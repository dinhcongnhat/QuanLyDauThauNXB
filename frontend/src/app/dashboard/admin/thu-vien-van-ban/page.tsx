'use client';

import {
  BookOpen,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  formatLegalDocumentCitation,
  LegalDocument,
  LegalDocumentInput,
  legalDocumentApi,
  Pagination,
} from '@/lib/legal-document-api';
import { useAuthStore } from '@/lib/store';
import { LegalDocumentOcrPanel } from '@/components/admin/LegalDocumentOcrPanel';
import { LegalDocumentDetailModal } from '@/components/LegalDocumentDetailModal';
import type { LegalDocumentOcrResult } from '@/lib/vietnamese-legal-document-ocr';

const EMPTY_FORM: LegalDocumentInput = {
  tenCanCu: '',
  soHieu: '',
  coQuanBanHanh: '',
  hinhThucVanBan: '',
  linhVuc: '',
  trichYeuNoiDung: '',
  ngayBanHanh: '',
};

const EMPTY_PAGINATION: Pagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

const FORM_INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function ThuVienVanBanPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [hinhThuc, setHinhThuc] = useState('');
  const [linhVuc, setLinhVuc] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LegalDocument | null>(null);
  const [form, setForm] = useState<LegalDocumentInput>(EMPTY_FORM);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [detailDocumentId, setDetailDocumentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await legalDocumentApi.list({
          q: searchText,
          hinhThuc,
          linhVuc,
          page,
          limit,
        });
        if (!cancelled) {
          setDocuments(response.items);
          setPagination(response.pagination);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Không thể tải thư viện văn bản',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchText, hinhThuc, linhVuc, page, limit, reloadKey]);

  const citationPreview = useMemo(() => {
    const canPreview =
      form.soHieu.trim() &&
      form.coQuanBanHanh.trim() &&
      form.hinhThucVanBan.trim() &&
      form.trichYeuNoiDung.trim() &&
      form.ngayBanHanh;
    return canPreview ? formatLegalDocumentCitation(form) : '';
  }, [form]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSourceFile(null);
    setShowForm(true);
  };

  const openEdit = (document: LegalDocument) => {
    setEditing(document);
    setForm({
      tenCanCu: document.tenCanCu || '',
      soHieu: document.soHieu,
      coQuanBanHanh: document.coQuanBanHanh,
      hinhThucVanBan: document.hinhThucVanBan,
      linhVuc: document.linhVuc,
      trichYeuNoiDung: document.trichYeuNoiDung,
      ngayBanHanh: document.ngayBanHanh.slice(0, 10),
    });
    setSourceFile(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSourceFile(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    try {
      if (editing) {
        await legalDocumentApi.update(editing.id, form, sourceFile);
        toast.success('Đã cập nhật văn bản pháp lý');
      } else {
        await legalDocumentApi.create(form, sourceFile);
        toast.success('Đã thêm văn bản pháp lý');
      }
      closeFormAfterSave();
      setReloadKey((current) => current + 1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể lưu văn bản pháp lý',
      );
    } finally {
      setSaving(false);
    }
  };

  const closeFormAfterSave = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSourceFile(null);
  };

  const handleDelete = async (document: LegalDocument) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        `Xóa văn bản "${document.soHieu}" khỏi thư viện? Thao tác này không làm thay đổi câu viện dẫn đã lưu trong hồ sơ cũ.`,
      )
    ) {
      return;
    }

    try {
      await legalDocumentApi.remove(document.id);
      toast.success('Đã xóa văn bản pháp lý');
      if (documents.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể xóa văn bản pháp lý',
      );
    }
  };

  const updateForm = (
    field: keyof LegalDocumentInput,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const applyOcrResult = (result: LegalDocumentOcrResult) => {
    setForm((current) => ({
      ...current,
      ...result.fields,
    }));
    if (result.matchedFields.length > 0) {
      toast.success(
        `OCR đã điền ${result.matchedFields.length}/7 trường. Vui lòng kiểm tra lại trước khi lưu.`,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Thư viện văn bản pháp lý
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý nguồn căn cứ dùng chung cho các biểu mẫu và văn bản Word.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Thêm văn bản
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Bạn có thể tìm kiếm và sử dụng thư viện. Chỉ quản trị viên được
          thêm, sửa hoặc xóa văn bản.
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,2fr)_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên căn cứ, số hiệu, cơ quan, trích yếu..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <input
            value={hinhThuc}
            onChange={(event) => {
              setHinhThuc(event.target.value);
              setPage(1);
            }}
            placeholder="Lọc hình thức"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <input
            value={linhVuc}
            onChange={(event) => {
              setLinhVuc(event.target.value);
              setPage(1);
            }}
            placeholder="Lọc lĩnh vực"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="button"
            onClick={() => {
              setSearchText('');
              setHinhThuc('');
              setLinhVuc('');
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Số hiệu
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Cơ quan ban hành
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Hình thức văn bản
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Lĩnh vực
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Trích yếu nội dung
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Ngày ban hành
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-4 py-14 text-center"
                  >
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary-600" />
                    <p className="mt-2 text-sm text-gray-500">
                      Đang tải thư viện...
                    </p>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-4 py-14 text-center text-sm text-gray-500"
                  >
                    Không tìm thấy văn bản phù hợp.
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                      {document.soHieu}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-sm text-gray-700">
                      {document.coQuanBanHanh}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {document.hinhThucVanBan}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {document.linhVuc}
                    </td>
                    <td
                      className="max-w-[380px] px-4 py-3 text-sm leading-5 text-gray-700"
                      title={document.citation}
                    >
                      {document.tenCanCu && (
                        <span className="mb-1 block font-medium text-primary-700">
                          {document.tenCanCu}
                        </span>
                      )}
                      {document.trichYeuNoiDung}
                      <button
                        type="button"
                        onClick={() => setDetailDocumentId(document.id)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem chi tiết
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatDisplayDate(document.ngayBanHanh)}
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(document)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          title="Sửa"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(document)}
                          className="ml-1 rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row">
          <p className="text-sm text-gray-600">
            Tổng cộng <span className="font-semibold">{pagination.total}</span>{' '}
            văn bản
          </p>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              aria-label="Số dòng mỗi trang"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span className="min-w-[92px] text-center text-sm text-gray-600">
              Trang {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={
                loading ||
                pagination.totalPages === 0 ||
                page >= pagination.totalPages
              }
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showForm && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={
            editing ? 'Cập nhật văn bản pháp lý' : 'Thêm văn bản pháp lý'
          }
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editing
                    ? 'Cập nhật văn bản pháp lý'
                    : 'Thêm văn bản pháp lý'}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Có thể dùng OCR để tự điền, sau đó kiểm tra đủ sáu trường
                  pháp lý trước khi lưu.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              <LegalDocumentOcrPanel
                onExtract={applyOcrResult}
                onFileSelected={setSourceFile}
                disabled={saving}
              />
              {sourceFile && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  Tệp gốc sẽ được lưu cùng văn bản:{' '}
                  <strong>{sourceFile.name}</strong> (
                  {(sourceFile.size / (1024 * 1024)).toFixed(1)} MB)
                </div>
              )}

              <FormField label="Tên căn cứ" required={false}>
                <input
                  maxLength={500}
                  value={form.tenCanCu}
                  onChange={(event) =>
                    updateForm('tenCanCu', event.target.value)
                  }
                  placeholder="Ví dụ: Nghị định về lựa chọn nhà đầu tư"
                  className={FORM_INPUT_CLASS}
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Tên gợi nhớ do Admin đặt; người dùng có thể tìm theo tên này.
                  Tên không được đưa vào câu viện dẫn Word.
                </span>
              </FormField>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Số hiệu">
                  <input
                    required
                    maxLength={255}
                    value={form.soHieu}
                    onChange={(event) =>
                      updateForm('soHieu', event.target.value)
                    }
                    placeholder="22/2023/QH15"
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Ngày ban hành">
                  <input
                    required
                    type="date"
                    value={form.ngayBanHanh}
                    onChange={(event) =>
                      updateForm('ngayBanHanh', event.target.value)
                    }
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Cơ quan ban hành">
                  <input
                    required
                    maxLength={500}
                    value={form.coQuanBanHanh}
                    onChange={(event) =>
                      updateForm('coQuanBanHanh', event.target.value)
                    }
                    placeholder="Quốc hội khóa XV, Kỳ họp thứ 5"
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Hình thức văn bản">
                  <input
                    required
                    maxLength={255}
                    value={form.hinhThucVanBan}
                    onChange={(event) =>
                      updateForm('hinhThucVanBan', event.target.value)
                    }
                    placeholder="Luật"
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Lĩnh vực">
                  <input
                    required
                    maxLength={255}
                    value={form.linhVuc}
                    onChange={(event) =>
                      updateForm('linhVuc', event.target.value)
                    }
                    placeholder="Đấu thầu"
                    className={FORM_INPUT_CLASS}
                  />
                </FormField>

                <div className="md:col-span-2">
                  <FormField label="Trích yếu nội dung">
                    <textarea
                      required
                      rows={3}
                      maxLength={2000}
                      value={form.trichYeuNoiDung}
                      onChange={(event) =>
                        updateForm('trichYeuNoiDung', event.target.value)
                      }
                      placeholder="Đấu thầu"
                      className={`${FORM_INPUT_CLASS} resize-y`}
                    />
                  </FormField>
                </div>
              </div>

              {citationPreview && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Câu viện dẫn
                  </p>
                  <p className="mt-1 text-sm italic leading-6 text-gray-800">
                    {citationPreview}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Lĩnh vực chỉ dùng để tìm kiếm và không xuất hiện trong
                    câu viện dẫn.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving
                    ? 'Đang lưu...'
                    : editing
                      ? 'Lưu thay đổi'
                      : 'Thêm văn bản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LegalDocumentDetailModal
        documentId={detailDocumentId}
        onClose={() => setDetailDocumentId(null)}
      />

    </div>
  );
}

function FormField({
  label,
  children,
  required = true,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}{' '}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
