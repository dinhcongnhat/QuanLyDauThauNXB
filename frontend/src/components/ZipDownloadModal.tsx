'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ZipFile {
  stepId: string;
  stepTitle: string;
  filename: string;
  type: string;
  source: string;
  objectPath?: string;
}

interface ZipDownloadModalProps {
  open: boolean;
  onClose: () => void;
  loadPreview: () => Promise<{ files: ZipFile[]; zipName: string }>;
  downloadZip: () => Promise<Response>;
}

export function ZipDownloadModal({ open, onClose, loadPreview, downloadZip }: ZipDownloadModalProps) {
  const [files, setFiles] = useState<ZipFile[]>([]);
  const [zipName, setZipName] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadPreview()
      .then(data => { setFiles(data.files); setZipName(data.zipName); })
      .catch(err => { toast.error(err.message || 'Lỗi tải danh sách file'); onClose(); })
      .finally(() => setLoading(false));
  }, [open]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadZip();
      if (!res.ok) { toast.error('Lỗi tải file ZIP'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = zipName || 'download.zip';
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Đã tải file ZIP thành công');
      onClose();
    } catch (err: any) { toast.error(err.message || 'Lỗi tải file'); }
    finally { setDownloading(false); }
  };

  if (!open) return null;

  const docxFiles = files.filter(f => f.type === 'docx');
  const attachmentFiles = files.filter(f => f.type === 'attachment');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">📦 Tải toàn bộ file</h3>
            <p className="text-sm text-gray-500 mt-0.5">{zipName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Không có file nào để tải</p>
          ) : (
            <div className="space-y-4">
              {docxFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📄 File DOCX ({docxFiles.length})</h4>
                  <div className="space-y-1.5">
                    {docxFiles.map((f, idx) => (
                      <div key={`docx-${idx}`} className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-blue-500 text-lg">📄</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{f.filename}</p>
                          <p className="text-xs text-gray-400">{f.stepTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {attachmentFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📎 File đính kèm ({attachmentFiles.length})</h4>
                  <div className="space-y-1.5">
                    {attachmentFiles.map((f, idx) => (
                      <div key={`att-${idx}`} className="flex items-center gap-3 px-3 py-2 bg-orange-50 rounded-lg border border-orange-100">
                        <span className="text-orange-500 text-lg">📎</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{f.filename}</p>
                          <p className="text-xs text-gray-400">{f.stepTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0 bg-gray-50 rounded-b-2xl">
          <p className="text-sm text-gray-500">
            Tổng cộng: <span className="font-semibold text-gray-700">{files.length} file</span>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              Hủy
            </button>
            <button onClick={handleDownload} disabled={downloading || loading || files.length === 0}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {downloading ? '⏳ Đang tạo ZIP...' : '📥 Tải ZIP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
