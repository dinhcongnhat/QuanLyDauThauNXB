'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { api } from '@/lib/api';
import { Document as Doc } from '@/lib/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';

const PROJ_TYPE = 'THAU_THIET_BI';

function ThietBiKHLcntPageInner() {
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
      setProjects((projectList.projects || []).filter((p: any) => p.procurementType === PROJ_TYPE));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = approvedDuToan.filter((doc: Doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fields = [
      doc.data?.soQuyetDinh, doc.data?.tenChuDauTu, doc.data?.tenDuAn,
      doc.data?.tenCoQuanDuyet, doc.creator?.name,
    ].filter(Boolean);
    return fields.some((f: any) => String(f).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phê duyệt KH LCNT</h1>
        <p className="text-gray-500 mt-1 text-sm">Thầu Thiết Bị — Chọn Quyết định dự toán đã duyệt để tạo hồ sơ KHLCNT</p>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <label className="block text-sm font-medium text-blue-900 mb-2">Chọn dự án</label>
        <select
          className="w-full max-w-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
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
          <br /><span className="text-sm">Vui lòng phê duyệt dự toán trước.</span>
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
          <div className="grid gap-4">
            {filtered.map((doc: Doc) => (
              <Link key={doc.id} href={`/dashboard/mua-sam/khlcnt/${doc.id}?project=${selectedProject}`}
                className="bg-white rounded-xl p-5 shadow-sm border hover:border-primary-300 hover:shadow-md transition-all block">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">✅ Đã duyệt</span>
                      <span className="text-xs text-gray-400">{doc.data?.soQuyetDinh}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
                      QĐ dự toán: {doc.data?.tenChuDauTu || doc.data?.soQuyetDinh || 'Tài liệu dự toán'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Giá trị: {doc.data?.giaTriDuToanDuyet?.toLocaleString('vi-VN')} đồng
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Người tạo: {doc.creator.name} • {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                  <div className="text-primary-600 text-2xl">→</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ThietBiKHLcntPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <ThietBiKHLcntPageInner />
    </Suspense>
  );
}
