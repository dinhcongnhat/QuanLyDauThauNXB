'use client';

import {
  Download,
  FileSearch,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  LegalDocument,
  legalDocumentApi,
} from '@/lib/legal-document-api';

interface LegalDocumentDetailModalProps {
  documentId: string | null;
  onClose: () => void;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatFileSize(size: number | null): string {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function LegalDocumentDetailModal({
  documentId,
  onClose,
}: LegalDocumentDetailModalProps) {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;
    let nextPreviewUrl = '';
    setDocument(null);
    setPreviewUrl('');
    setError('');
    setFileError('');
    setLoading(true);

    void legalDocumentApi
      .get(documentId)
      .then(async (item) => {
        if (cancelled) return;
        setDocument(item);
        if (!item.originalObjectPath) return;

        setFileLoading(true);
        try {
          const blob = await legalDocumentApi.getOriginalFile(item.id);
          if (cancelled) return;
          nextPreviewUrl = URL.createObjectURL(blob);
          setPreviewUrl(nextPreviewUrl);
        } catch (loadError) {
          if (!cancelled) {
            setFileError(
              loadError instanceof Error
                ? loadError.message
                : 'Không thể tải tệp văn bản gốc',
            );
          }
        } finally {
          if (!cancelled) setFileLoading(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải chi tiết văn bản',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (nextPreviewUrl) URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [documentId]);

  if (!documentId) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết văn bản pháp lý"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <FileSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Chi tiết văn bản
              </h2>
              <p className="truncate text-sm text-gray-500">
                {document?.soHieu || 'Đang tải thông tin...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {document && (
            <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(460px,1.5fr)]">
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
                    <Detail label="Số hiệu" value={document.soHieu} />
                    <Detail
                      label="Cơ quan ban hành"
                      value={document.coQuanBanHanh}
                    />
                    <Detail
                      label="Hình thức văn bản"
                      value={document.hinhThucVanBan}
                    />
                    <Detail label="Lĩnh vực" value={document.linhVuc} />
                    <Detail
                      label="Ngày ban hành"
                      value={formatDate(document.ngayBanHanh)}
                    />
                    <Detail
                      label="Trích yếu nội dung"
                      value={document.trichYeuNoiDung}
                    />
                  </dl>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Câu viện dẫn
                  </p>
                  <p className="mt-2 text-sm italic leading-6 text-gray-800">
                    {document.citation}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Văn bản gốc để đối chiếu
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {document.originalName
                        ? `${document.originalName} · ${formatFileSize(document.originalSize)}`
                        : 'Chưa có tệp gốc'}
                    </p>
                  </div>
                  {previewUrl && document.originalName && (
                    <a
                      href={previewUrl}
                      download={document.originalName}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Tải xuống
                    </a>
                  )}
                </div>

                <div className="flex min-h-[55vh] items-center justify-center p-3">
                  {fileLoading && (
                    <div className="text-center text-sm text-gray-500">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary-600" />
                      Đang tải văn bản gốc...
                    </div>
                  )}
                  {!fileLoading && fileError && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                      {fileError}
                    </div>
                  )}
                  {!fileLoading
                    && !fileError
                    && !document.originalObjectPath && (
                      <div className="text-center text-sm text-gray-500">
                        <FileText className="mx-auto mb-2 h-9 w-9 text-gray-300" />
                        Văn bản này được tạo trước khi có chức năng lưu tệp
                        gốc.
                      </div>
                    )}
                  {!fileLoading
                    && previewUrl
                    && document.originalMimeType === 'application/pdf' && (
                      <iframe
                        src={`${previewUrl}#page=1&view=FitH`}
                        title={`Văn bản gốc ${document.soHieu}`}
                        className="h-[65vh] w-full rounded-lg bg-white"
                      />
                    )}
                  {!fileLoading
                    && previewUrl
                    && document.originalMimeType?.startsWith('image/') && (
                      <img
                        src={previewUrl}
                        alt={`Văn bản gốc ${document.soHieu}`}
                        className="max-h-[65vh] max-w-full rounded-lg bg-white object-contain"
                      />
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 leading-5 text-gray-800">{value}</dd>
    </div>
  );
}

export default LegalDocumentDetailModal;
