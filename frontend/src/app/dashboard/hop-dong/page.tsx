'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const METHOD_LABELS: Record<string, string> = {
  CHI_DINH_THAU: 'Chỉ định thầu',
  CHAO_HANG_CANH_TRANH: 'Chào hàng cạnh tranh',
  DAU_THAU_RONG_RAI: 'Đấu thầu rộng rãi',
};

declare global {
  interface Window { DocsAPI?: any; }
}

function HopDongOnlyOfficePreview({ objectPath, onClose }: { objectPath: string; onClose: () => void }) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<string>('oo-hd-' + Date.now());
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
    return () => { destroyed = true; if (editorRef.current?.destroyEditor) editorRef.current.destroyEditor(); };
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          <div id={containerRef.current} className="w-full h-full" />
        </div>
      </div>
    </motion.div>
  );
}

function displayFilename(path: string): string {
  const raw = path.split('/').pop() || path;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default function HopDongPage() {
  const { activeView } = useAuthStore();
  const isNT = activeView === 'nha-thau';
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContracts();
  }, [activeView]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      if (isNT) {
        const data = await api.getMyContracts();
        setContracts(data);
      } else {
        const data = await api.getCompletedContracts();
        setContracts(data);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFile = (objectPath: string) => {
    setPreviewPath(objectPath);
  };

  const handleDownloadFile = async (objectPath: string) => {
    try {
      const { url } = isNT
        ? await api.getBidFileUrl(objectPath)
        : await api.getLCNTFileUrl(objectPath);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDownloadPdf = async (stepId: string) => {
    try {
      const res = await api.downloadLCNTStepPdf(stepId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'hop-dong.pdf';
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = contracts.filter(c => {
    if (!searchTerm) return true;
    if (isNT) {
      const text = (c.tenGoiThau || '') + ' ' + (c.tenChuDauTu || '');
      return text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    const sel = c.contractorSelection || {};
    const text = (sel.tenGoiThau || '') + ' ' + (sel.qdKhlcnt?.data?.tenDuAn || '');
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hợp đồng</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isNT ? 'Danh sách hợp đồng từ các gói thầu đã trúng thầu' : 'Danh sách các hợp đồng đã hoàn thành trong quy trình lựa chọn nhà thầu'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input type="text" placeholder="Tìm kiếm theo tên gói thầu, dự án..."
          className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <span className="text-sm text-gray-500 whitespace-nowrap">{filtered.length} hợp đồng</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-gray-500">{searchTerm ? 'Không tìm thấy hợp đồng phù hợp' : 'Chưa có hợp đồng nào hoàn thành'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            /* Normalize: for CDT item is ProcurementStep, for NT item is BidParticipation */
            if (isNT) {
              const hopDongStep = item.steps?.find((s: any) => s.stepKey === 'HOP_DONG_THUC_HIEN');
              const stepData = (hopDongStep?.data || {}) as Record<string, any>;
              const dataEntries = Object.entries(stepData).filter(([k]) => !k.startsWith('_'));
              const goiThauStep = item.steps?.find((s: any) => s.stepKey === 'THONG_TIN_GOI_THAU');
              const goiThauData = (goiThauStep?.data || {}) as Record<string, any>;
              const attachments: string[] = hopDongStep?.attachments || [];
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{item.tenGoiThau || 'Hợp đồng'}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          <span>🏛 CĐT: {item.tenChuDauTu || '—'}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Trúng thầu</span>
                          {item.createdAt && (
                            <span>📅 Ngày tạo: {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: vi })}</span>
                          )}
                        </div>
                        {goiThauData.giaGoiThau && (
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                            <span>💰 {goiThauData.giaGoiThau}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-gray-400 shrink-0 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                          {dataEntries.length > 0 && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Thông tin hợp đồng</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                {dataEntries.map(([k, v]) => (
                                  <div key={k} className="flex text-sm">
                                    <span className="text-gray-500 shrink-0 w-44 truncate">{k}:</span>
                                    <span className="text-gray-900 font-medium truncate">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {attachments.length > 0 && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">📎 File đính kèm</p>
                              <div className="space-y-1.5">
                                {attachments.map((att: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600 truncate flex-1">{displayFilename(att)}</span>
                                    <button onClick={() => handlePreviewFile(att)}
                                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 rounded">
                                      👁 Xem
                                    </button>
                                    <button onClick={() => handleDownloadFile(att)}
                                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 rounded">
                                      📥 Tải
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {dataEntries.length === 0 && attachments.length === 0 && (
                            <p className="text-sm text-gray-400 italic">Chưa có dữ liệu hợp đồng</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            /* CDT view (original) */
            const step = item;
            const sel = step.contractorSelection || {};
            const qdData = sel.qdKhlcnt?.data || {};
            const stepData = (step.data || {}) as Record<string, any>;
            const dataEntries = Object.entries(stepData).filter(([k]) => !k.startsWith('_'));
            const attachments: string[] = stepData._attachments || [];
            const isExpanded = expandedId === step.id;

            return (
              <div key={step.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(prev => prev === step.id ? null : step.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{sel.tenGoiThau || 'Hợp đồng'}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                        <span>📋 {qdData.tenDuAn || '—'}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {METHOD_LABELS[sel.procurementMethod] || sel.procurementMethod}
                        </span>
                        {step.completedAt && (
                          <span>✅ Hoàn thành: {format(new Date(step.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                        )}
                      </div>
                      {(stepData.nhaThau || stepData.giaTriHopDong) && (
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                          {stepData.nhaThau && <span>🏢 NT: {stepData.nhaThau}</span>}
                          {stepData.giaTriHopDong && <span>💰 {stepData.giaTriHopDong}</span>}
                        </div>
                      )}
                    </div>
                    <span className={`text-gray-400 shrink-0 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                        {/* Contract data */}
                        {dataEntries.length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Thông tin hợp đồng</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                              {dataEntries.map(([k, v]) => (
                                <div key={k} className="flex text-sm">
                                  <span className="text-gray-500 shrink-0 w-44 truncate">{k}:</span>
                                  <span className="text-gray-900 font-medium truncate">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        {attachments.length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">📎 File đính kèm</p>
                            <div className="space-y-1.5">
                              {attachments.map((att, i) => {
                                return (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600 truncate flex-1">{displayFilename(att)}</span>
                                    <button onClick={() => handlePreviewFile(att)}
                                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 rounded">
                                      👁 Xem
                                    </button>
                                    <button onClick={() => handleDownloadFile(att)}
                                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 rounded">
                                      📥 Tải
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Generated PDF */}
                        {step.attachmentPath && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">📄 File hợp đồng</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 flex-1 truncate">{displayFilename(step.attachmentPath)}</span>
                              <button onClick={() => handlePreviewFile(step.attachmentPath)}
                                className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 rounded">
                                👁 Xem
                              </button>
                              <button onClick={() => handleDownloadPdf(step.id)}
                                className="text-xs text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 rounded">
                                📥 Tải PDF
                              </button>
                            </div>
                          </div>
                        )}

                        {dataEntries.length === 0 && attachments.length === 0 && !step.attachmentPath && (
                          <p className="text-sm text-gray-400 italic">Không có dữ liệu chi tiết</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* File preview */}
      <AnimatePresence>
        {previewPath && (
          <HopDongOnlyOfficePreview objectPath={previewPath} onClose={() => setPreviewPath(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
