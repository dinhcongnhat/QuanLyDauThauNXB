'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Document as Doc } from '@/lib/types';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function DatSachListPage() {
  const [approvedDuToan, setApprovedDuToan] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [tenDuAn, setTenDuAn] = useState('');
  const [procurementType, setProcurementType] = useState('THAU_SACH');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await api.getDocumentsByType(['QD_DUTOAN']);
        setApprovedDuToan(all.filter(d => d.status === 'APPROVED'));
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleCreate = async () => {
    if (!selectedParentId) { toast.error('Chọn QĐ dự toán'); return; }
    if (!tenDuAn.trim()) { toast.error('Nhập tên dự án'); return; }
    setCreating(true);
    try {
      const project = await api.createDatSachProject(selectedParentId, tenDuAn, procurementType);
      toast.success('Tạo dự án Thầu Sách thành công');
      setShowCreateModal(false);
      setTenDuAn('');
      setSelectedParentId('');
      window.location.href = `/dashboard/mua-sam/dat-sach/${project.id}`;
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const filteredDocs = approvedDuToan.filter(doc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return [doc.data?.soQuyetDinh, doc.data?.tenChuDauTu, doc.data?.tenDuAn, doc.creator?.name]
      .filter(Boolean).some(f => String(f).toLowerCase().includes(q));
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thầu Sách - Đặt sách</h1>
        <p className="text-gray-500 mt-1">Tạo và quản lý hồ sơ đặt sách cho Nhà xuất bản</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Tạo dự án Đặt sách
        </button>
      </div>

      {approvedDuToan.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">
          Chưa có Quyết định dự toán nào được phê duyệt.
          <br />Vui lòng phê duyệt dự toán trước.
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
            {filteredDocs.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">Không tìm thấy kết quả</div>
            ) : filteredDocs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl p-5 shadow-sm border hover:border-primary-300 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-50 text-blue-700">
                      QĐ Dự toán
                    </span>
                    <span className="text-xs text-gray-400 ml-2">{doc.data?.soQuyetDinh}</span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
                      {doc.data?.tenChuDauTu || doc.data?.tenDuAn || 'Tài liệu đặt sách'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Giá trị: {doc.data?.giaTriDuToanDuyet?.toLocaleString('vi-VN')} đồng
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Người tạo: {doc.creator?.name} • {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => { setSelectedParentId(doc.id); setShowCreateModal(true); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      + Tạo Đặt sách
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Tạo dự án Thầu Sách</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QĐ Dự toán</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={selectedParentId}
                  onChange={e => setSelectedParentId(e.target.value)}
                >
                  <option value="">-- Chọn QĐ Dự toán --</option>
                  {approvedDuToan.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.data?.soQuyetDinh} - {d.data?.tenChuDauTu || d.data?.tenDuAn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên dự án</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={tenDuAn}
                  onChange={e => setTenDuAn(e.target.value)}
                  placeholder="VD: Dự án xuất bản sách Q2/2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại thầu</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={procurementType}
                  onChange={e => setProcurementType(e.target.value)}
                >
                  <option value="THAU_SACH">Thầu Sách</option>
                  <option value="THAU_THIET_BI">Thầu Thiết Bị</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Hủy</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {creating ? 'Đang tạo...' : 'Tạo dự án'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
