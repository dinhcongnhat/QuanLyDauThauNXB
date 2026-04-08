'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

interface Props {
  documentId: string;
  onClose: () => void;
}

declare global {
  interface Window {
    DocsAPI?: any;
  }
}

export function OnlyOfficePreview({ documentId, onClose }: Props) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<string>(`oo-editor-${Date.now()}`);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      try {
        const { onlyofficeUrl, editorConfig } = await api.getOnlyofficeConfig(documentId);

        if (destroyed) return;

        // Load OnlyOffice API script if not already loaded
        if (!window.DocsAPI) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
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
        editorRef.current.destroyEditor();
      }
    };
  }, [documentId]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <h3 className="text-lg font-semibold">Xem trước tài liệu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Đóng</button>
              </div>
            </div>
          )}
          <div id={containerRef.current} className="w-full h-full" />
        </div>
      </div>
    </motion.div>
  );
}
