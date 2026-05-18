'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Document as Doc, DocStatus, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import { LibraryPicker } from '@/components/LibraryPicker';
import { SavedValue } from '@/lib/document-library-types';

const PROJ_TYPE = 'THAU_SACH';

const statusLabels: Record<DocStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_HEAD: 'Chờ Trưởng phòng',
  PENDING_DIRECTOR: 'Chờ Giám đốc duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Cần làm lại',
};

const statusColors: Record<DocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_HEAD: 'bg-yellow-100 text-yellow-700',
  PENDING_DIRECTOR: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function SachDuToanPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [directors, setDirectors] = useState<User[]>([]);
  const [selectedDirector, setSelectedDirector] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillInfo, setAutoFillInfo] = useState<any>(null);
  const [datSachCompleted, setDatSachCompleted] = useState(false);

  const checkDatSachStatus = useCallback(async (projId: string) => {
    if (!projId) { setDatSachCompleted(false); return; }
    try {
      const datSachProjects = await api.getDatSachProjects(projId);
      const completed = datSachProjects.some((d: any) => d.status === 'COMPLETED');
      setDatSachCompleted(completed);
    } catch { setDatSachCompleted(false); }
  }, []);

  // TT form state
  const [ttData, setTtData] = useState({
    SoToTrinh: '', DiaDanh: '', Ngay: '', Thang: '', Nam: '',
    ChuDauTu: '', TenDuAn: '', TenGoiThau: '', DonViTrinh: '', DonViMuaSam: '',
    PhongBanThuocDonViTrinh: '', NguonVon: '', DiaDiemThucHien: '', ThoiGianThucHien: '',
    TenCacVanBanPhapLyLienQuan: '', DuToanBangSo: '', DuToanBangChu: '',
    KyHieuChiPhi1: '', NoiDungChiPhi1: '', GiaTriTruocThue1: '', ThueGTGT1: '', GiaTriSauThue1: '',
  });

  // QD form state
  const [qdData, setQdData] = useState({
    SoQuyetDinh: '', DiaDanh: '', Ngay: '', Thang: '', Nam: '',
    ChuDauTu: '', DaiDienChuDauTu: '', TenGoiThau: '', DonViMuaSam: '',
    PhongBanThuocDonViTrinh: '', NguonVon: '', DiaDiemThucHien: '', ThoiGianThucHien: '',
    DuToanBangSo: '', DuToanBangChu: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, projectList] = await Promise.all([
        api.getDocumentsByType(['TT_DUTOAN', 'QD_DUTOAN'], selectedProject || undefined),
        api.getProjects(),
      ]);
      setDocs(data);
      setProjects(projectList.filter((p: any) => p.procurementType === PROJ_TYPE));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
    api.getUsersByRole('DIRECTOR').then(setDirectors).catch(() => {});
    checkDatSachStatus(selectedProject);
  }, [fetchData, checkDatSachStatus, selectedProject]);

  // Auto-fill from GDN+PCDI data
  const handleAutoFill = async () => {
    if (!selectedProject) { toast.error('Chọn dự án trước'); return; }
    setAutoFilling(true);
    try {
      const data = await api.getAutoFillForDutoan(selectedProject);
      if (!data) {
        toast.error('Cần hoàn thành và duyệt GDN trước');
        return;
      }
      setAutoFillInfo(data);
      // Fill TT form
      setTtData(prev => ({
        ...prev,
        TenDuAn: data.TenDuAn || prev.TenDuAn,
        TenGoiThau: data.TenGoiThau || prev.TenGoiThau,
        ChuDauTu: data.ChuDauTu || prev.ChuDauTu,
        NguonVon: data.NguonVon || prev.NguonVon,
        DiaDiemThucHien: data.DiaDiemThucHien || prev.DiaDiemThucHien,
        // Price info from PCDI
        DuToanBangSo: data.giaTriDuToanDuyet || data.GiaTriHopDong || prev.DuToanBangSo,
      }));
      // Fill QD form
      setQdData(prev => ({
        ...prev,
        TenGoiThau: data.TenGoiThau || prev.TenGoiThau,
        ChuDauTu: data.ChuDauTu || prev.ChuDauTu,
        NguonVon: data.NguonVon || prev.NguonVon,
        DiaDiemThucHien: data.DiaDiemThucHien || prev.DiaDiemThucHien,
        DuToanBangSo: data.giaTriDuToanDuyet || data.GiaTriHopDong || prev.DuToanBangSo,
      }));
      toast.success('Đã auto-fill từ GDN + PCDI! Điều chỉnh nếu cần.');
    } catch (err: any) { toast.error(err.message); }
    finally { setAutoFilling(false); }
  };

  const handleLibraryTT = (val: SavedValue) => {
    setTtData(prev => ({ ...prev, ...val.duLieu }));
  };

  const approvedTTs = docs.filter(d => d.type === 'TT_DUTOAN' && d.status === 'APPROVED');
  const hasApprovedTT = approvedTTs.length > 0;

  const handleCreateTT = async () => {
    if (!selectedDirector) { toast.error('Chọn người duyệt'); return; }
    if (!selectedProject) { toast.error('Chọn dự án'); return; }
    setSubmitting(true);
    try {
      await api.createDocument('TT_DUTOAN', ttData, undefined, selectedDirector, selectedProject);
      toast.success('Đã tạo Tờ trình dự toán');
      setShowForm(false);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleCreateQD = async () => {
    if (!selectedDirector) { toast.error('Chọn người duyệt'); return; }
    if (!selectedProject) { toast.error('Chọn dự án'); return; }
    setSubmitting(true);
    try {
      await api.createDocument('QD_DUTOAN', qdData, undefined, selectedDirector, selectedProject);
      toast.success('Đã tạo Quyết định dự toán');
      setShowForm(false);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try { await api.approveDocument(id); toast.success('Đã phê duyệt'); fetchData(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) { toast.error('Nhập lý do'); return; }
    try { await api.rejectDocument(id, rejectComment); toast.success('Đã từ chối'); setRejectingId(null); setRejectComment(''); fetchData(); }
    catch (err: any) { toast.error(err.message); }
  };

  const canCreate = user?.role === 'INVESTOR' || user?.role === 'ADMIN';
  const canApprove = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';

  const filteredDocs = docs.filter((doc: Doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return [doc.data?.TenDuAn, doc.data?.SoToTrinh, doc.data?.SoQuyetDinh, doc.data?.ChuDauTu, doc.data?.TenGoiThau, doc.creator?.name]
      .filter(Boolean).some((f: any) => String(f).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phê duyệt dự toán</h1>
          <p className="text-gray-500 mt-1 text-sm">Thầu Sách — Dữ liệu từ GDN + PCDI sẽ được auto-fill</p>
        </div>
        {!datSachCompleted && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700">
            <span>🔒</span>
            <span>Hoàn thành <strong>Đặt sách</strong> trước khi làm dự toán</span>
          </div>
        )}
        {canCreate && !showForm && (
          <div className="flex gap-2">
            <button onClick={() => setShowForm(true)}
              disabled={!datSachCompleted}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500">
              {!datSachCompleted ? '🔒 Tạo Dự toán' : '+ Tạo Dự toán'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
        <label className="block text-sm font-medium text-green-900 mb-2">Chọn dự án</label>
        <select
          className="w-full max-w-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
          value={selectedProject}
          onChange={e => { setSelectedProject(e.target.value); setAutoFillInfo(null); checkDatSachStatus(e.target.value); }}
        >
          <option value="">— Tất cả dự án —</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.tenDuAn}</option>
          ))}
        </select>
      </div>

      {/* Auto-fill info banner */}
      {autoFillInfo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-700 text-sm font-semibold">🎯 Auto-fill từ:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {autoFillInfo.gdnId && (
              <div className="bg-white rounded-lg p-2 border">
                <p className="text-gray-500">GDN</p>
                <p className="text-green-700 font-medium">Đã duyệt ✅</p>
                <p className="text-gray-400 mt-1">Sách: {autoFillInfo.TenSach}</p>
              </div>
            )}
            {autoFillInfo.pcdiId && (
              <div className="bg-white rounded-lg p-2 border">
                <p className="text-gray-500">PCDI</p>
                <p className="text-green-700 font-medium">Đã duyệt ✅</p>
                <p className="text-gray-400 mt-1">Giá trị: {autoFillInfo.GiaTriHopDong}</p>
              </div>
            )}
            {autoFillInfo.TenDuAn && (
              <div className="bg-white rounded-lg p-2 border">
                <p className="text-gray-500">Tên dự án</p>
                <p className="text-gray-800 font-medium truncate">{autoFillInfo.TenDuAn}</p>
              </div>
            )}
            {autoFillInfo.TenGoiThau && (
              <div className="bg-white rounded-lg p-2 border">
                <p className="text-gray-500">Gói thầu</p>
                <p className="text-gray-800 font-medium truncate">{autoFillInfo.TenGoiThau}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-green-900">Tạo Dự toán</h3>
            <div className="flex gap-2 items-center">
              <LibraryPicker
                libraryType="THONG_TIN_TO_CHUC" onSelect={handleLibraryTT} onSaveToLibrary={() => {}}
              />
              {selectedProject && (
                <button
                  onClick={handleAutoFill}
                  disabled={autoFilling}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium disabled:opacity-50"
                >
                  {autoFilling ? 'Đang auto-fill...' : 'Auto-fill từ GDN + PCDI'}
                </button>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Số tờ trình" value={ttData.SoToTrinh} onChange={e => setTtData({...ttData, SoToTrinh: e.target.value})} />
              <input className="inp" placeholder="Địa danh" value={ttData.DiaDanh} onChange={e => setTtData({...ttData, DiaDanh: e.target.value})} />
              <input className="inp" placeholder="Chủ đầu tư" value={ttData.ChuDauTu} onChange={e => setTtData({...ttData, ChuDauTu: e.target.value})} />
              <input className="inp" placeholder="Tên dự án" value={ttData.TenDuAn} onChange={e => setTtData({...ttData, TenDuAn: e.target.value})} />
              <input className="inp" placeholder="Tên gói thầu" value={ttData.TenGoiThau} onChange={e => setTtData({...ttData, TenGoiThau: e.target.value})} />
              <input className="inp" placeholder="Đơn vị trình" value={ttData.DonViTrinh} onChange={e => setTtData({...ttData, DonViTrinh: e.target.value})} />
              <input className="inp" placeholder="Đơn vị mua sắm" value={ttData.DonViMuaSam} onChange={e => setTtData({...ttData, DonViMuaSam: e.target.value})} />
              <input className="inp" placeholder="Nguồn vốn" value={ttData.NguonVon} onChange={e => setTtData({...ttData, NguonVon: e.target.value})} />
              <input className="inp" placeholder="Địa điểm thực hiện" value={ttData.DiaDiemThucHien} onChange={e => setTtData({...ttData, DiaDiemThucHien: e.target.value})} />
              <input className="inp" placeholder="Thời gian thực hiện" value={ttData.ThoiGianThucHien} onChange={e => setTtData({...ttData, ThoiGianThucHien: e.target.value})} />
              <input className="inp" placeholder="Dự toán bằng số (auto-fill)" value={ttData.DuToanBangSo} onChange={e => setTtData({...ttData, DuToanBangSo: e.target.value})} style={{backgroundColor: ttData.DuToanBangSo ? '#f0fdf4' : undefined}} />
              <input className="inp" placeholder="Dự toán bằng chữ" value={ttData.DuToanBangChu} onChange={e => setTtData({...ttData, DuToanBangChu: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Người duyệt</label>
              <select className="inp w-full max-w-xs" value={selectedDirector} onChange={e => setSelectedDirector(e.target.value)}>
                <option value="">-- Chọn --</option>
                {directors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Hủy</button>
              <button onClick={handleCreateTT} disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                {submitting ? '...' : 'Tạo & Gửi duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="Tìm kiếm..."
          className="w-full px-4 py-2.5 pl-10 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 border">
          {selectedProject ? 'Dự án này chưa có dữ liệu dự toán.' : 'Chưa có tài liệu nào.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông tin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocs.map((doc: Doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${doc.type === 'TT_DUTOAN' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {doc.type === 'TT_DUTOAN' ? 'Tờ trình' : 'QĐ Dự toán'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{doc.data?.TenGoiThau || doc.data?.SoToTrinh || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.creator.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[doc.status]}`}>{statusLabels[doc.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}</td>
                  <td className="px-4 py-3">
                    {canApprove && doc.status === 'PENDING_DIRECTOR' && (
                      <>
                        <button onClick={() => handleApprove(doc.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 mr-1">✅</button>
                        <button onClick={() => setRejectingId(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🔄</button>
                        {rejectingId === doc.id && (
                          <div className="flex gap-1 mt-1">
                            <input className="text-xs border rounded px-2 py-1 w-32" placeholder="Lý do..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
                            <button onClick={() => handleReject(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Gửi</button>
                            <button onClick={() => setRejectingId(null)} className="text-xs px-2 py-1 bg-gray-100 rounded">Hủy</button>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .inp {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .inp:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
      `}</style>
    </div>
  );
}
