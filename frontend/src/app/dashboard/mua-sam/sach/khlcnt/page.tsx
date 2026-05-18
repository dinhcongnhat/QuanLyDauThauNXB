'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Document as Doc } from '@/lib/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';

const PROJ_TYPE = 'THAU_SACH';

export default function SachKHLcntPage() {
  const searchParams = useSearchParams();
  const [approvedDuToan, setApprovedDuToan] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, projectList] = await Promise.all([
        api.getDocumentsByType(['QD_DUTOAN'], selectedProject || undefined),
        api.getProjects(),
      ]);
      setApprovedDuToan(data.filter((d: Doc) => d.status === 'APPROVED'));
      setProjects(projectList.filter((p: any) => p.procurementType === PROJ_TYPE));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = approvedDuToan.filter((doc: Doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return [doc.data?.soQuyetDinh, doc.data?.tenChuDauTu, doc.data?.tenDuAn, doc.creator?.name]
      .filter(Boolean).some((f: any) => String(f).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phê duyệt KH LCNT</h1>
        <p className="text-gray-500 mt-1 text-sm">Thầu Sách — Từ dữ liệu dự toán đã duyệt sẽ auto-fill vào KHLCNT</p>
      </div>

      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
        <label className="block text-sm font-medium text-green-900 mb-2">Chọn dự án</label>
        <select
          className="w-full max-w-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">— Tất cả dự án —</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.tenDuAn}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
          {selectedProject ? 'Dự án này chưa có QĐ dự toán nào được duyệt.' : 'Chưa có Quyết định dự toán nào được phê duyệt.'}
          <br /><span className="text-sm">Vui lòng hoàn thành bước Phê duyệt Dự toán trước.</span>
        </div>
      ) : (
        <>
          <div className="relative">
            <input type="text" placeholder="Tìm kiếm..."
              className="w-full px-4 py-2.5 pl-10 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 mb-2">
            💡 <strong>Auto-fill:</strong> Khi tạo KHLCNT từ QĐ dự toán này, các trường trùng (tên dự án, chủ đầu tư, nguồn vốn...) sẽ được tự động điền từ dữ liệu dự toán.
          </div>
          <div className="grid gap-4">
            {filtered.map((doc: Doc) => {
              const qdData = doc.data || {};
              const giaTri = qdData.giaTriDuToanDuyet || qdData.giaTriDuToan || 0;
              return (
                <div key={doc.id} className="bg-white rounded-xl p-5 shadow-sm border hover:border-green-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">✅ Đã duyệt</span>
                        <span className="text-xs text-gray-400">{qdData.soQuyetDinh || qdData.SoQuyetDinh}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {selectedProject ? 'Auto-fill' : '---'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {qdData.tenChuDauTu || qdData.tenDuAn || qdData.TenDuAn || 'Tài liệu dự toán'}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                        {qdData.tenDuAn || qdData.TenDuAn ? (
                          <span>📋 Dự án: <strong>{qdData.tenDuAn || qdData.TenDuAn}</strong></span>
                        ) : null}
                        {giaTri ? (
                          <span>💰 Giá trị: <strong>{Number(giaTri).toLocaleString('vi-VN')} đồng</strong></span>
                        ) : null}
                        {qdData.nguonVon || qdData.NguonVon ? (
                          <span>🏦 Nguồn vốn: {qdData.nguonVon || qdData.NguonVon}</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Người tạo: {doc.creator?.name || '---'} • {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/mua-sam/khlcnt/${doc.id}?project=${selectedProject}`}
                      className="ml-4 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shrink-0"
                    >
                      → Tạo KH LCNT
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
