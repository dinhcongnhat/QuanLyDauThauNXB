'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { loadOnlyOfficeApi } from '@/lib/onlyoffice-loader';

interface Props {
  objectPath?: string;
  attachmentId?: string;
  onClose: () => void;
}

const OnlyOfficeContainer = React.memo(({ containerId }: { containerId: string }) => {
  return <div id={containerId} className="w-full h-full" />;
}, () => true);
OnlyOfficeContainer.displayName = 'OnlyOfficeContainer';

export function OnlyOfficeFilePreview({ objectPath, attachmentId, onClose }: Props) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<string>('oo-editor-' + Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let destroyed = false;
    const init = async () => {
      try {
        const { onlyofficeUrl, editorConfig } = attachmentId
          ? await api.getChatOnlyofficeConfig(attachmentId)
          : await api.getLCNTOnlyofficeConfig(objectPath || '');
        if (destroyed) return;
        await loadOnlyOfficeApi(onlyofficeUrl);
        if (destroyed) return;
        editorRef.current = new window.DocsAPI.DocEditor(containerRef.current, {
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
            onError: (e: any) => {
              if (!destroyed) {
                setError(e?.data?.message || 'Lỗi OnlyOffice');
                setLoading(false);
              }
            },
          },
        });
      } catch (err: any) {
        if (!destroyed) { setError(err.message || 'Lỗi tải cấu hình'); setLoading(false); }
      }
    };
    const slowTimer = window.setTimeout(() => {
      if (!destroyed) setSlow(true);
    }, 8_000);
    init();
    return () => {
      destroyed = true;
      window.clearTimeout(slowTimer);
      if (editorRef.current?.destroyEditor) {
        try { editorRef.current.destroyEditor(); } catch {}
      }
    };
  }, [attachmentId, objectPath]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <h3 className="text-lg font-semibold">Xem trước tài liệu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 relative">
          {loading && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
              <p className="mt-4 text-sm font-medium text-slate-700">Đang mở tài liệu Word…</p>
              {slow && (
                <p className="mt-2 max-w-md text-center text-xs leading-5 text-amber-700">
                  OnlyOffice đang phản hồi chậm. Bạn có thể đóng cửa sổ này và tải file về để làm việc ngay.
                </p>
              )}
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          <div style={{ display: error ? 'none' : 'block' }} className="w-full h-full">
            <OnlyOfficeContainer containerId={containerRef.current} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
