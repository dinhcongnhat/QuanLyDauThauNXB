'use client';

import { AlertCircle, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface WorkflowDocxPreviewDocument {
  id: string;
  label: string;
  type?: string;
  data?: Record<string, any>;
  loadPreview?: () => Promise<Blob>;
  /** Dữ liệu dùng để tạo preview; đồng thời là khóa làm mới sau debounce. */
  previewData?: Record<string, any>;
}

export function WorkflowDocxPreview({
  documents,
  debounceMs = 550,
  activeDocumentId,
}: {
  documents: WorkflowDocxPreviewDocument[];
  debounceMs?: number;
  activeDocumentId?: string;
}) {
  const [selectedId, setSelectedId] = useState(documents[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const lastActiveDocumentId = useRef<string>();
  const selectedRef = useRef<WorkflowDocxPreviewDocument>();

  useEffect(() => {
    if (!documents.some((document) => document.id === selectedId)) {
      setSelectedId(documents[0]?.id || '');
    }
  }, [documents, selectedId]);

  useEffect(() => {
    if (activeDocumentId === lastActiveDocumentId.current) return;
    lastActiveDocumentId.current = activeDocumentId;
    if (
      activeDocumentId
      && documents.some((document) => document.id === activeDocumentId)
    ) {
      setSelectedId(activeDocumentId);
    }
  }, [activeDocumentId, documents]);

  const selected = useMemo(
    () =>
      documents.find((document) => document.id === selectedId) ||
      documents[0],
    [documents, selectedId],
  );
  selectedRef.current = selected;
  const previewDataKey = useMemo(
    () => JSON.stringify(selected?.previewData ?? selected?.data ?? null),
    [selected?.previewData, selected?.data],
  );

  useEffect(() => {
    if (!selectedRef.current) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const current = selectedRef.current;
      if (!current) return;
      setLoading(true);
      setError('');
      try {
        const blob = current.loadPreview
          ? await current.loadPreview()
          : await api.previewDocumentPdf(
              current.type || '',
              current.data || {},
            );
        const nextUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        setPreviewUrl(nextUrl);
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không thể tạo bản xem trước từ file Word',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selected?.id, previewDataKey, debounceMs, reloadKey]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  if (!selected) return null;

  return (
    <aside className="self-start xl:sticky xl:top-3 xl:h-[calc(100dvh-1.5rem)]">
      <div className="flex h-[min(76vh,760px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm xl:h-full xl:min-h-0">
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Xem trước từ mẫu Word
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              title="Tạo lại bản xem trước"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {documents.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setSelectedId(document.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    document.id === selected.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {document.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {previewUrl && (
            <iframe
              key={previewUrl}
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
              title={`Xem trước ${selected.label}`}
              className="h-full min-h-[480px] w-full border-0 bg-slate-200 xl:min-h-0"
            />
          )}

          {loading && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 border-b border-blue-100 bg-blue-50/95 px-4 py-2 text-xs font-medium text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang điền dữ liệu vào file Word…
            </div>
          )}

          {error && (
            <div className="m-4 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-sm">
              <div className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Chưa thể xem trước DOCX</p>
                  <p className="mt-1 text-xs leading-5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !previewUrl && (
            <div className="flex h-full min-h-[480px] flex-col items-center justify-center text-slate-400 xl:min-h-0">
              <FileText className="h-8 w-8" />
              <p className="mt-2 text-sm">Đang chuẩn bị mẫu Word…</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
