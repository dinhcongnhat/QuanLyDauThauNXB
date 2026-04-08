'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Document as Doc } from '@/lib/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function KHLCNTListPage() {
  const [approvedDuToan, setApprovedDuToan] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const all = await api.getDocumentsByType(['QD_DUTOAN']);
        setApprovedDuToan(all.filter(d => d.status === 'APPROVED'));
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phê duyệt KH LCNT</h1>
        <p className="text-gray-500 mt-1">Chọn Quyết định dự toán đã được phê duyệt để tạo hồ sơ KHLCNT</p>
      </div>

      {approvedDuToan.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
          Chưa có Quyết định dự toán nào được phê duyệt.
          <br />Vui lòng phê duyệt dự toán trước.
        </div>
      ) : (
        <>
          <div className="relative">
            <input type="text" placeholder="Tìm kiếm theo số QĐ, tên chủ đầu tư, dự án, người tạo..."
              className="w-full px-4 py-2.5 pl-10 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="grid gap-4">
            {approvedDuToan.filter(doc => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const fields = [
                doc.data?.soQuyetDinh, doc.data?.tenChuDauTu, doc.data?.tenDuAn,
                doc.data?.tenCoQuanDuyet, doc.creator?.name,
              ].filter(Boolean);
              return fields.some(f => String(f).toLowerCase().includes(q));
            }).length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
                Không tìm thấy kết quả phù hợp
              </div>
            ) : approvedDuToan.filter(doc => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const fields = [
                doc.data?.soQuyetDinh, doc.data?.tenChuDauTu, doc.data?.tenDuAn,
                doc.data?.tenCoQuanDuyet, doc.creator?.name,
              ].filter(Boolean);
              return fields.some(f => String(f).toLowerCase().includes(q));
            }).map(doc => (
            <Link key={doc.id} href={`/dashboard/mua-sam/khlcnt/${doc.id}`}
              className="bg-white rounded-xl p-5 shadow-sm border hover:border-primary-300 hover:shadow-md transition-all block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">
                      ✅ Đã duyệt
                    </span>
                    <span className="text-xs text-gray-400">
                      {doc.data?.soQuyetDinh}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2">
                    QĐ dự toán: {doc.data?.tenChuDauTu || doc.data?.soQuyetDinh || doc.id.slice(0, 8)}
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
