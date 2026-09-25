'use client';

import { api } from '@/lib/api';
import { ApprovalDossier, ApprovalDossierItem } from '@/lib/types';
import {
  Clock3,
  Download,
  Edit3,
  Eye,
  FileText,
  History,
  Lock,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { loadOnlyOfficeApi } from '@/lib/onlyoffice-loader';

export function ApprovalDossierWorkspace({
  dossier,
  onRefresh,
}: {
  dossier: ApprovalDossier;
  onRefresh: () => Promise<void>;
}) {
  const [activeItemId, setActiveItemId] = useState(dossier.items[0]?.id || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<ApprovalDossierItem | null>(null);
  const [formDraft, setFormDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [onlyOfficeItem, setOnlyOfficeItem] = useState<ApprovalDossierItem | null>(null);

  const downloadItem = async (item: ApprovalDossierItem) => {
    try {
      const blob = await api.downloadApprovalDossierItem(dossier.id, item.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${item.label}.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải tài liệu');
    }
  };

  useEffect(() => {
    if (!dossier.items.some(item => item.id === activeItemId)) {
      setActiveItemId(dossier.items[0]?.id || '');
    }
  }, [activeItemId, dossier.items]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const activeItem =
    dossier.items.find(item => item.id === activeItemId) || dossier.items[0];
  const itemRevisions = useMemo(
    () =>
      dossier.revisions.filter(
        revision => !activeItem || !revision.itemId || revision.itemId === activeItem.id,
      ),
    [activeItem, dossier.revisions],
  );

  const openPreview = async (item: ApprovalDossierItem) => {
    setPreviewLoading(true);
    try {
      const blob = await api.fetchApprovalDossierPreview(dossier.id, item.id);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error: any) {
      toast.error(error.message || 'Không thể xem trước tài liệu');
    } finally {
      setPreviewLoading(false);
    }
  };

  const startFormEdit = (item: ApprovalDossierItem) => {
    setEditingItem(item);
    setFormDraft(structuredClone(item.data || {}));
  };

  const saveForm = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await api.updateApprovalDossierItem(
        dossier.id,
        editingItem.id,
        formDraft,
        editingItem.version,
      );
      toast.success('Đã lưu phiên bản biểu mẫu mới');
      setEditingItem(null);
      await onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Không thể lưu biểu mẫu');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (
    item: ApprovalDossierItem,
    file?: File,
  ) => {
    if (!file) return;
    try {
      await api.uploadApprovalDossierItem(
        dossier.id,
        item.id,
        file,
        item.version,
      );
      toast.success('Đã tải lên và ghép tệp DOCX vào bản xem trước');
      await onRefresh();
      await openPreview({ ...item, version: item.version + 1 });
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải tệp DOCX');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Thành phần bộ hồ sơ</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            Phiên bản {dossier.version}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {dossier.items.map(item => {
            const active = item.id === activeItem?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItemId(item.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.editable ? (
                  <FileText className="h-5 w-5 shrink-0 text-blue-600" />
                ) : (
                  <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    v{item.version} · {item.editable ? 'Có thể chỉnh sửa' : 'Chỉ đọc'}
                  </span>
                </span>
                {item.required && (
                  <span className="text-xs font-bold text-red-500">*</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeItem && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{activeItem.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {activeItem.originalName || activeItem.itemKey}
                {activeItem.renderedOverridePath ? ' · Bản Word đã được sửa trực tuyến' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={previewLoading}
                onClick={() => openPreview(activeItem)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                {previewLoading ? 'Đang ghép...' : 'Xem preview'}
              </button>
              <button
                type="button"
                onClick={() => void downloadItem(activeItem)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-4 w-4" />
                Tải DOCX
              </button>
              {dossier.actions.canEdit && activeItem.editable && activeItem.source === 'FORM' && (
                <button
                  type="button"
                  onClick={() => startFormEdit(activeItem)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Sửa biểu mẫu
                </button>
              )}
              {dossier.actions.canEdit && activeItem.editable && (
                <button
                  type="button"
                  onClick={() => setOnlyOfficeItem(activeItem)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                >
                  <FileText className="h-4 w-4" />
                  Sửa Word
                </button>
              )}
              {dossier.actions.canEdit &&
                activeItem.editable &&
                (activeItem.kind === 'ATTACHMENT' || activeItem.source === 'FILE') && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    <Upload className="h-4 w-4" />
                    {activeItem.objectPath ? 'Thay DOCX' : 'Tải DOCX'}
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={event => {
                        void uploadFile(activeItem, event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                )}
            </div>
          </div>
          {activeItem.kind === 'ATTACHMENT' && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
              Phụ lục DOCX được kiểm tra cấu trúc và ghép ngay vào preview Tờ trình/Quyết định.
            </p>
          )}
        </div>
      )}

      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <History className="h-4 w-4 text-slate-500" />
          Lịch sử phiên bản và xử lý
        </h3>
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3">
          {itemRevisions.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có thay đổi.</p>
          ) : (
            itemRevisions.map(revision => (
              <div key={revision.id} className="flex gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    {revision.action.replaceAll('_', ' ')}
                    {revision.item?.label ? ` · ${revision.item.label}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {revision.actor?.name} ·{' '}
                    {new Intl.DateTimeFormat('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(revision.createdAt))}
                  </p>
                  {revision.comment && (
                    <p className="mt-1 text-xs text-slate-600">{revision.comment}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[92vh] w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <p className="font-semibold text-slate-900">{activeItem?.label}</p>
                <p className="text-xs text-slate-500">Bản PDF dùng cùng pipeline với bản tải cuối</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl('');
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe title="Preview bộ hồ sơ" src={previewUrl} className="min-h-0 flex-1" />
          </div>
        </div>
      )}

      {editingItem && (
        <FormItemEditor
          item={editingItem}
          value={formDraft}
          onChange={setFormDraft}
          onClose={() => setEditingItem(null)}
          onSave={saveForm}
          saving={saving}
        />
      )}

      {onlyOfficeItem && (
        <DossierOnlyOfficeEditor
          dossierId={dossier.id}
          item={onlyOfficeItem}
          onPreview={async () => {
            const item = onlyOfficeItem;
            setOnlyOfficeItem(null);
            await openPreview(item);
          }}
          onDownload={() => downloadItem(onlyOfficeItem)}
          onClose={async () => {
            setOnlyOfficeItem(null);
            await onRefresh();
          }}
        />
      )}
    </section>
  );
}

function FormItemEditor({
  item,
  value,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  item: ApprovalDossierItem;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const entries = Object.entries(value);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sửa {item.label}</h3>
            <p className="text-xs text-slate-500">
              Lưu form sẽ sinh lại DOCX và đưa bản Word đang sửa vào lịch sử.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500 sm:col-span-2">
              Biểu mẫu chưa có trường dữ liệu. Hãy lập hồ sơ từ màn hình nghiệp vụ tương ứng.
            </p>
          ) : (
            entries.map(([key, fieldValue]) => {
              const complex =
                typeof fieldValue === 'object' && fieldValue !== null;
              return (
                <label key={key} className={complex ? 'sm:col-span-2' : ''}>
                  <span className="mb-1 block text-xs font-semibold text-slate-600">{key}</span>
                  {complex ? (
                    <textarea
                      rows={5}
                      value={JSON.stringify(fieldValue, null, 2)}
                      onChange={event => {
                        try {
                          onChange({ ...value, [key]: JSON.parse(event.target.value) });
                        } catch {
                          // Keep the last valid structured value.
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-blue-400"
                    />
                  ) : (
                    <input
                      value={fieldValue == null ? '' : String(fieldValue)}
                      onChange={event => onChange({ ...value, [key]: event.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                  )}
                </label>
              );
            })
          )}
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Hủy
          </button>
          <button type="button" disabled={saving} onClick={onSave} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu phiên bản'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DossierOnlyOfficeEditor({
  dossierId,
  item,
  onPreview,
  onDownload,
  onClose,
}: {
  dossierId: string;
  item: ApprovalDossierItem;
  onPreview: () => Promise<void>;
  onDownload: () => Promise<void>;
  onClose: () => void;
}) {
  const editorRef = useRef<any>(null);
  const containerId = useRef(`dossier-editor-${item.id}-${Date.now()}`);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let destroyed = false;
    const initialize = async () => {
      try {
        const { onlyofficeUrl, editorConfig } =
          await api.getApprovalDossierOnlyOfficeConfig(dossierId, item.id);
        await loadOnlyOfficeApi(onlyofficeUrl);
        if (destroyed) return;
        editorRef.current = new window.DocsAPI.DocEditor(containerId.current, {
          ...editorConfig,
          height: '100%',
          width: '100%',
          events: {
            onAppReady: () => {
              if (!destroyed) {
                setLoading(false);
                setSlow(false);
              }
            },
            onDocumentReady: () => {
              if (!destroyed) {
                setLoading(false);
                setSlow(false);
              }
            },
            onError: (event: any) =>
              setError(event?.data?.message || 'OnlyOffice gặp lỗi'),
          },
        });
      } catch (exception: any) {
        if (!destroyed) {
          setError(exception.message || 'Không thể mở OnlyOffice');
          setLoading(false);
        }
      }
    };
    setError('');
    setLoading(true);
    setSlow(false);
    const slowTimer = window.setTimeout(() => {
      if (!destroyed) setSlow(true);
    }, 8_000);
    void initialize();
    return () => {
      destroyed = true;
      window.clearTimeout(slowTimer);
      try {
        editorRef.current?.destroyEditor?.();
      } catch {}
    };
  }, [dossierId, item.id, retryKey]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3">
      <div className="flex h-[94vh] w-[97vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <p className="font-semibold text-slate-900">Sửa Word · {item.label}</p>
            <p className="text-xs text-slate-500">OnlyOffice lưu bằng callback có chữ ký và tạo revision mới.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
              <p className="font-semibold text-red-600">{error}</p>
              <p className="mt-2 max-w-lg text-sm text-slate-500">
                File vẫn có thể xem bằng PDF hoặc tải DOCX; việc phê duyệt không phụ thuộc vào tốc độ OnlyOffice.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setRetryKey(value => value + 1)} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
                  Thử lại OnlyOffice
                </button>
                <button type="button" onClick={() => void onPreview()} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700">
                  Xem PDF
                </button>
                <button type="button" onClick={() => void onDownload()} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  Tải DOCX
                </button>
              </div>
            </div>
          ) : (
            <div id={containerId.current} className="h-full w-full" />
          )}
          {loading && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/95">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
              <p className="mt-4 text-sm font-semibold text-slate-700">Đang khởi động OnlyOffice…</p>
              {slow && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-amber-700">Máy chủ soạn thảo đang phản hồi chậm.</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => void onPreview()} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                      Xem PDF ngay
                    </button>
                    <button type="button" onClick={() => void onDownload()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      Tải DOCX
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
