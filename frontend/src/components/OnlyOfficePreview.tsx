'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

export type PreviewType = 'document' | 'gdn' | 'pcdi' | 'qd';

interface Props {
  documentId: string;
  onClose: () => void;
  type?: PreviewType;
}

declare global {
  interface Window {
    DocsAPI?: any;
  }
}

function getDownloadHandler(type: PreviewType, documentId: string) {
  switch (type) {
    case 'gdn': return () => api.downloadGDNDatSach(documentId);
    case 'pcdi': return () => api.downloadPCDIDatSach(documentId);
    case 'qd': return () => api.downloadQDQuyetDinhDatSach(documentId);
    case 'document': return () => api.downloadDocument(documentId);
    default: return () => Promise.reject(new Error('Không hỗ trợ loại tài liệu này'));
  }
}

function getDownloadFilename(type: PreviewType, documentId: string) {
  const id = documentId.slice(0, 8);
  switch (type) {
    case 'gdn': return `GiayDeNghiIn_${id}.docx`;
    case 'pcdi': return `PhieuChiDinhCoSoIn_${id}.docx`;
    case 'qd': return `QuyetDinhDatSach_${id}.docx`;
    case 'document': return `TaiLieu_${id}.docx`;
    default: return `document_${id}.docx`;
  }
}

import React from 'react';

const OnlyOfficeContainer = React.memo(({ containerId }: { containerId: string }) => {
  return <div id={containerId} className="w-full h-full" />;
}, () => true);
OnlyOfficeContainer.displayName = 'OnlyOfficeContainer';

export function OnlyOfficePreview({ documentId, onClose, type = 'document' }: Props) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<any>(null);
  const containerId = useRef<string>(`oo-editor-${documentId.slice(0, 8)}-${Date.now()}`);
  const scriptLoaded = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyofficeUrl, setOnlyofficeUrl] = useState('');
  const [editorConfig, setEditorConfig] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let destroyed = false;

    const init = async () => {
      try {
        const config = await (async () => {
          switch (type) {
            case 'gdn': return api.getOnlyofficeConfigForGdn(documentId);
            case 'pcdi': return api.getOnlyofficeConfigForPcdi(documentId);
            case 'qd': return api.getOnlyofficeConfigForQD(documentId);
            default: return api.getOnlyofficeConfig(documentId);
          }
        })();

        if (destroyed) return;

        setOnlyofficeUrl(config.onlyofficeUrl);
        setEditorConfig(config.editorConfig);

        // Load OnlyOffice script if not already loaded
        if (!window.DocsAPI && !scriptLoaded.current) {
          scriptLoaded.current = true;
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${config.onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
            script.onload = () => resolve();
            script.onerror = (e) => {
              scriptLoaded.current = false; // allow retry
              const srcUrl = (e as any)?.target?.src || config.onlyofficeUrl;
              reject(new Error(
                `TRÌNH DUYỆT CHẶN Script OnlyOffice hoặc không thể tải được script từ "${srcUrl}". Vui lòng tắt ad-blocker hoặc dùng nút "Tải DOCX" bên dưới để tải file.`
              ));
            };
            document.head.appendChild(script);
          });
        }

        if (destroyed) return;

        if (window.DocsAPI) {
          editorRef.current = new window.DocsAPI.DocEditor(containerId.current, {
            ...config.editorConfig,
            height: '100%',
            width: '100%',
            events: {
              onAppReady: () => { if (!destroyed) setLoading(false); },
              onError: (e: any) => {
                if (!destroyed) setError(e?.data?.message || 'Lỗi bất ngờ từ OnlyOffice');
              },
            },
          });
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        if (!destroyed) {
          setError(err.message || 'Lỗi tải cấu hình');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      destroyed = true;
      if (editorRef.current?.destroyEditor) {
        try { editorRef.current.destroyEditor(); } catch {}
      }
    };
  }, [documentId, type, mounted]);

  const handleDownload = async () => {
    try {
      const downloadFn = getDownloadHandler(type, documentId);
      const res = await downloadFn();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getDownloadFilename(type, documentId);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[OnlyOfficePreview] download error', err);
    }
  };

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
    >
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Xem trước tài liệu</h3>
            {onlyofficeUrl && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {onlyofficeUrl}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 relative">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Đang tải trình soạn thảo OnlyOffice...</p>
                <p className="text-gray-400 text-xs mt-1">
                  Nếu lâu quá, hãy kiểm tra ad-blocker có chặn domain OnlyOffice không.
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center max-w-md px-4">
                <div className="text-red-500 mb-2 text-4xl">⚠️</div>
                <p className="text-red-600 font-medium mb-2">Không thể mở tài liệu trong trình duyệt</p>
                <p className="text-gray-600 text-sm mb-4 whitespace-pre-wrap">{error}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    📥 Tải DOCX
                  </button>
                  <button
                    onClick={() => { setError(''); setLoading(true); scriptLoaded.current = false; }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    🔄 Thử lại
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: error ? 'none' : 'block' }} className="w-full h-full">
            <OnlyOfficeContainer containerId={containerId.current} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
