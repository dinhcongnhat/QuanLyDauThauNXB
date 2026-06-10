'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

interface Props {
  objectPath: string;
  onClose: () => void;
}

const OnlyOfficeContainer = React.memo(({ containerId }: { containerId: string }) => {
  return <div id={containerId} className="w-full h-full" />;
}, () => true);
OnlyOfficeContainer.displayName = 'OnlyOfficeContainer';

export function OnlyOfficeFilePreview({ objectPath, onClose }: Props) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<string>('oo-editor-' + Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let destroyed = false;
    const init = async () => {
      try {
        const { onlyofficeUrl, editorConfig } = await api.getLCNTOnlyofficeConfig(objectPath);
        if (destroyed) return;
        if (!window.DocsAPI) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = onlyofficeUrl + '/web-apps/apps/api/documents/api.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Không thể tải OnlyOffice'));
            document.head.appendChild(script);
          });
        }
        if (destroyed) return;
        editorRef.current = new window.DocsAPI.DocEditor(containerRef.current, {
          ...editorConfig,
          height: '100%',
          width: '100%',
          events: {
            onAppReady: () => { if (!destroyed) setLoading(false); },
            onError: (e: any) => { if (!destroyed) setError(e?.data?.message || 'Lỗi OnlyOffice'); },
          },
        });
      } catch (err: any) {
        if (!destroyed) { setError(err.message || 'Lỗi tải cấu hình'); setLoading(false); }
      }
    };
    init();
    return () => {
      destroyed = true;
      if (editorRef.current?.destroyEditor) {
        try { editorRef.current.destroyEditor(); } catch {}
      }
    };
  }, [objectPath]);

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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
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
