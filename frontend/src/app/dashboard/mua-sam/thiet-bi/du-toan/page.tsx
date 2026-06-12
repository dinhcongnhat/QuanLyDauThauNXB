'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Document as Doc, DocType, DocStatus, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { LibraryPicker, SaveToLibraryModal } from '@/components/LibraryPicker';
import { LibraryType, SavedValue } from '@/lib/document-library-types';
import { HistoryModal } from '@/components/HistoryModal';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';

const statusLabels: Record<DocStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Cần làm lại',
};

const statusColors: Record<DocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const typeLabels: Record<string, string> = {
  TT_DUTOAN: 'Tờ trình phê duyệt dự toán',
  QD_DUTOAN: 'Quyết định phê duyệt dự toán',
};

const PROJ_TYPE = 'THAU_THIET_BI';

type FormType = 'TT_DUTOAN' | 'QD_DUTOAN';

function ThietBiDuToanPageInner() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<FormType | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTTId, setSelectedTTId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [saveTTOpen, setSaveTTOpen] = useState(false);
  const [saveQDOpen, setSaveQDOpen] = useState(false);

  const [ttData, setTtData] = useState({
    SoToTrinh: '', DiaDanh: '', Ngay: '', Thang: '', Nam: '',
    ChuDauTu: '', TenDuAn: '', TenGoiThau: '', DonViTrinh: '', DonViMuaSam: '',
    PhongBanThuocDonViTrinh: '', VietTatPhongBanThuocDonViTrinh: '',
    TenCacVanBanPhapLyLienQuan: '', NguonVon: '', DiaDiemThucHien: '', ThoiGianThucHien: '',
    KyHieuChiPhi1: '', NoiDungChiPhi1: '', GiaTriTruocThue1: '', ThueGTGT1: '', GiaTriSauThue1: '', GhiChu1: '',
    NoiDungChiPhi2: '', GiaTriTruocThue2: '', ThueGTGT2: '', GiaTriSauThue2: '', GhiChu2: '',
    DuToanBangSo: '', DuToanBangChu: '',
    CacPhongBanLienQuan: '', CacNoiDungKhac: '',
    ChiPhi1BangSo: '', ChiPhi1BangChu: '', ChiPhi2BangSo: '', ChiPhi2BangChu: '',
  });

  const [qdData, setQdData] = useState({
    SoQuyetDinh: '', SoToTrinh: '', DiaDanh: '', Ngay: '', Thang: '', Nam: '',
    ChuDauTu: '', VietTatChuDauTu: '', DaiDienChuDauTu: '', TenGoiThau: '', DonViMuaSam: '',
    PhongBanThuocDonViTrinh: '', VietTatPhongBanThuocDonViTrinh: '',
    PhongBanChuTriThuocDonViTrinh: '', DaiDienCacPhongBanLienQuan: '',
    TenCacVanBanPhapLyLienQuan: '', NguonVon: '', DiaDiemThucHien: '', ThoiGianThucHien: '',
    KyHieuChiPhi1: '', NoiDungChiPhi1: '', GiaTriTruocThue1: '', ThueGTGT1: '', GiaTriSauThue1: '', GhiChu1: '',
    NoiDungChiPhi2: '', GiaTriTruocThue2: '', ThueGTGT2: '', GiaTriSauThue2: '', GhiChu2: '',
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
      setProjects((projectList.projects || []).filter((p: any) => p.procurementType === PROJ_TYPE));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const approvedTTs = docs.filter(d => d.type === 'TT_DUTOAN' && d.status === 'APPROVED');
  const hasApprovedTT = approvedTTs.length > 0;

  const handleSelectTT = (ttId: string) => {
    setSelectedTTId(ttId);
    const tt = approvedTTs.find(d => d.id === ttId);
    if (tt?.data) {
      const td = tt.data;
      setQdData(prev => ({
        ...prev,
        SoToTrinh: td.SoToTrinh || prev.SoToTrinh,
        DiaDanh: td.DiaDanh || prev.DiaDanh,
        ChuDauTu: td.ChuDauTu || prev.ChuDauTu,
        TenGoiThau: td.TenGoiThau || prev.TenGoiThau,
        DonViMuaSam: td.DonViMuaSam || prev.DonViMuaSam,
        PhongBanThuocDonViTrinh: td.PhongBanThuocDonViTrinh || prev.PhongBanThuocDonViTrinh,
        VietTatPhongBanThuocDonViTrinh: td.VietTatPhongBanThuocDonViTrinh || prev.VietTatPhongBanThuocDonViTrinh,
        TenCacVanBanPhapLyLienQuan: td.TenCacVanBanPhapLyLienQuan || prev.TenCacVanBanPhapLyLienQuan,
        NguonVon: td.NguonVon || prev.NguonVon,
        DiaDiemThucHien: td.DiaDiemThucHien || prev.DiaDiemThucHien,
        ThoiGianThucHien: td.ThoiGianThucHien || prev.ThoiGianThucHien,
        KyHieuChiPhi1: td.KyHieuChiPhi1 || prev.KyHieuChiPhi1,
        NoiDungChiPhi1: td.NoiDungChiPhi1 || prev.NoiDungChiPhi1,
        GiaTriTruocThue1: td.GiaTriTruocThue1 || prev.GiaTriTruocThue1,
        ThueGTGT1: td.ThueGTGT1 || prev.ThueGTGT1,
        GiaTriSauThue1: td.GiaTriSauThue1 || prev.GiaTriSauThue1,
        GhiChu1: td.GhiChu1 || prev.GhiChu1,
        NoiDungChiPhi2: td.NoiDungChiPhi2 || prev.NoiDungChiPhi2,
        GiaTriTruocThue2: td.GiaTriTruocThue2 || prev.GiaTriTruocThue2,
        ThueGTGT2: td.ThueGTGT2 || prev.ThueGTGT2,
        GiaTriSauThue2: td.GiaTriSauThue2 || prev.GiaTriSauThue2,
        GhiChu2: td.GhiChu2 || prev.GhiChu2,
        DuToanBangSo: td.DuToanBangSo || prev.DuToanBangSo,
        DuToanBangChu: td.DuToanBangChu || prev.DuToanBangChu,
      }));
    }
  };

  const handleLibraryTT = (val: SavedValue) => {
    setTtData(prev => ({ ...prev, ...val.duLieu }));
  };

  const handleLibraryQD = (val: SavedValue) => {
    setQdData(prev => ({ ...prev, ...val.duLieu }));
  };

  const resetForm = () => {
    setShowForm(null);
    setSelectedTTId('');
    setTtData({
      SoToTrinh: '', DiaDanh: '', Ngay: '', Thang: '', Nam: '',
      ChuDauTu: '', TenDuAn: '', TenGoiThau: '', DonViTrinh: '', DonViMuaSam: '',
      PhongBanThuocDonViTrinh: '', VietTatPhongBanThuocDonViTrinh: '',
      TenCacVanBanPhapLyLienQuan: '', NguonVon: '', DiaDiemThucHien: '', ThoiGianThucHien: '',
      KyHieuChiPhi1: '', NoiDungChiPhi1: '', GiaTriTruocThue1: '', ThueGTGT1: '', GiaTriSauThue1: '', GhiChu1: '',
      NoiDungChiPhi2: '', GiaTriTruocThue2: '', ThueGTGT2: '', GiaTriSauThue2: '', GhiChu2: '',
      DuToanBangSo: '', DuToanBangChu: '',
      CacPhongBanLienQuan: '', CacNoiDungKhac: '',
      ChiPhi1BangSo: '', ChiPhi1BangChu: '', ChiPhi2BangSo: '', ChiPhi2BangChu: '',
    });
    setQdData({
      SoQuyetDinh: '', SoToTrinh: '', DiaDanh: '', Ngay: '', Thang: '', Nam: '',
      ChuDauTu: '', VietTatChuDauTu: '', DaiDienChuDauTu: '', TenGoiThau: '', DonViMuaSam: '',
      PhongBanThuocDonViTrinh: '', VietTatPhongBanThuocDonViTrinh: '',
      PhongBanChuTriThuocDonViTrinh: '', DaiDienCacPhongBanLienQuan: '',
      TenCacVanBanPhapLyLienQuan: '', NguonVon: '', DiaDiemThucHien: '', ThoiGianThucHien: '',
      KyHieuChiPhi1: '', NoiDungChiPhi1: '', GiaTriTruocThue1: '', ThueGTGT1: '', GiaTriSauThue1: '', GhiChu1: '',
      NoiDungChiPhi2: '', GiaTriTruocThue2: '', ThueGTGT2: '', GiaTriSauThue2: '', GhiChu2: '',
      DuToanBangSo: '', DuToanBangChu: '',
    });
  };

  const handleCreateTT = async () => {
    if (!ttData.TenGoiThau.trim()) { toast.error('Vui lòng nhập tên gói thầu'); return; }
    setSubmitting(true);
    try {
      await api.createDocument('TT_DUTOAN', ttData, undefined, undefined, selectedProject || undefined);
      toast.success('Đã tạo Tờ trình dự toán');
      resetForm();
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleCreateQD = async () => {
    if (!selectedTTId) { toast.error('Vui lòng chọn Tờ trình dự toán'); return; }
    setSubmitting(true);
    try {
      await api.createDocument('QD_DUTOAN', qdData, undefined, undefined, selectedProject || undefined);
      toast.success('Đã tạo Quyết định dự toán');
      resetForm();
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try { await api.approveDocument(id); toast.success('Đã phê duyệt'); fetchData(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) { toast.error('Vui lòng nhập bình luận'); return; }
    try { await api.rejectDocument(id, rejectComment); toast.success('Đã yêu cầu làm lại'); setRejectingId(null); setRejectComment(''); fetchData(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleResubmit = async (doc: Doc) => {
    try { await api.resubmitDocument(doc.id, editingDoc?.data || doc.data); toast.success('Đã gửi lại'); setEditingDoc(null); fetchData(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await api.downloadDocument(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  const canApprove = user?.role === 'ADMIN' || user?.canApprove === true;
  const canCreate = user?.role === 'ADMIN' || user?.role === 'USER';

  const filteredDocs = docs.filter(doc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fields = [
      doc.data?.TenDuAn, doc.data?.SoToTrinh, doc.data?.SoQuyetDinh,
      doc.data?.ChuDauTu, doc.data?.TenGoiThau, doc.data?.DonViMuaSam,
      doc.creator?.name,
    ].filter(Boolean);
    return fields.some(f => String(f).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phê duyệt dự toán</h1>
          <p className="text-gray-500 mt-1 text-sm">Thầu Thiết Bị — Chọn dự án để xem và tạo tài liệu</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProject && (
            <button
              onClick={() => setShowHistory(true)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lịch sử
            </button>
          )}
          {canCreate && !showForm && (
            <>
              <button onClick={() => setShowForm('TT_DUTOAN')}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                + Tờ trình dự toán
              </button>
              {hasApprovedTT ? (
                <button onClick={() => setShowForm('QD_DUTOAN')}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                  + Quyết định dự toán
                </button>
              ) : (
                <span className="px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                  title="Cần có Tờ trình được duyệt">
                  🔒 QĐ dự toán
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Project Selector */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <label className="block text-sm font-medium text-blue-900 mb-2">Chọn dự án</label>
        <select
          className="w-full max-w-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">— Tất cả dự án Thầu Thiết Bị —</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.tenDuAn}</option>
          ))}
        </select>
      </div>

      {/* Forms (simplified, similar to original) */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className={`px-6 py-4 border-b flex items-center justify-between ${showForm === 'TT_DUTOAN' ? 'bg-blue-50' : 'bg-purple-50'}`}>
            <h3 className={`text-lg font-semibold ${showForm === 'TT_DUTOAN' ? 'text-blue-900' : 'text-purple-900'}`}>
              {showForm === 'TT_DUTOAN' ? 'Tạo Tờ trình dự toán' : 'Tạo Quyết định dự toán'}
            </h3>
            <div className="flex gap-2">
              {showForm === 'TT_DUTOAN' && (
                <LibraryPicker
                  libraryType="DUTOAN_TT" onSelect={handleLibraryTT} onSaveToLibrary={() => setSaveTTOpen(true)}
                />
              )}
              {showForm === 'QD_DUTOAN' && (
                <LibraryPicker
                  libraryType="DUTOAN_QD" onSelect={handleLibraryQD} onSaveToLibrary={() => setSaveQDOpen(true)}
                />
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            {showForm === 'TT_DUTOAN' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <input className="inp" placeholder="Số tờ trình" value={ttData.SoToTrinh} onChange={e => setTtData({...ttData, SoToTrinh: e.target.value})} />
                  <input className="inp" placeholder="Địa danh" value={ttData.DiaDanh} onChange={e => setTtData({...ttData, DiaDanh: e.target.value})} />
                  <input className="inp" placeholder="Ngày" value={ttData.Ngay} onChange={e => setTtData({...ttData, Ngay: e.target.value})} />
                  <input className="inp" placeholder="Tháng" value={ttData.Thang} onChange={e => setTtData({...ttData, Thang: e.target.value})} />
                  <input className="inp" placeholder="Năm" value={ttData.Nam} onChange={e => setTtData({...ttData, Nam: e.target.value})} />
                  <input className="inp" placeholder="Chủ đầu tư" value={ttData.ChuDauTu} onChange={e => setTtData({...ttData, ChuDauTu: e.target.value})} />
                  <input className="inp" placeholder="Tên dự án" value={ttData.TenDuAn} onChange={e => setTtData({...ttData, TenDuAn: e.target.value})} />
                  <input className="inp" placeholder="Tên gói thầu *" value={ttData.TenGoiThau} onChange={e => setTtData({...ttData, TenGoiThau: e.target.value})} />
                  <input className="inp" placeholder="Đơn vị trình" value={ttData.DonViTrinh} onChange={e => setTtData({...ttData, DonViTrinh: e.target.value})} />
                  <input className="inp" placeholder="Đơn vị mua sắm" value={ttData.DonViMuaSam} onChange={e => setTtData({...ttData, DonViMuaSam: e.target.value})} />
                  <input className="inp" placeholder="Phòng ban" value={ttData.PhongBanThuocDonViTrinh} onChange={e => setTtData({...ttData, PhongBanThuocDonViTrinh: e.target.value})} />
                  <input className="inp" placeholder="Viết tắt phòng ban" value={ttData.VietTatPhongBanThuocDonViTrinh} onChange={e => setTtData({...ttData, VietTatPhongBanThuocDonViTrinh: e.target.value})} />
                  <input className="inp col-span-2" placeholder="Nguồn vốn" value={ttData.NguonVon} onChange={e => setTtData({...ttData, NguonVon: e.target.value})} />
                  <input className="inp" placeholder="Địa điểm" value={ttData.DiaDiemThucHien} onChange={e => setTtData({...ttData, DiaDiemThucHien: e.target.value})} />
                  <input className="inp" placeholder="Thời gian" value={ttData.ThoiGianThucHien} onChange={e => setTtData({...ttData, ThoiGianThucHien: e.target.value})} />
                  <input className="inp" placeholder="Dự toán bằng số" value={ttData.DuToanBangSo} onChange={e => setTtData({...ttData, DuToanBangSo: e.target.value})} />
                  <input className="inp" placeholder="Dự toán bằng chữ" value={ttData.DuToanBangChu} onChange={e => setTtData({...ttData, DuToanBangChu: e.target.value})} />
                  <textarea className="inp col-span-2 min-h-[60px]" placeholder="Văn bản pháp lý liên quan" value={ttData.TenCacVanBanPhapLyLienQuan} onChange={e => setTtData({...ttData, TenCacVanBanPhapLyLienQuan: e.target.value})} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Hủy</button>
                  <button onClick={handleCreateTT} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                    {submitting ? '...' : 'Tạo & Gửi duyệt'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium mb-2">Liên kết Tờ trình đã duyệt</label>
                  <select className="inp w-full" value={selectedTTId} onChange={e => handleSelectTT(e.target.value)}>
                    <option value="">-- Chọn Tờ trình --</option>
                    {approvedTTs.map(tt => (
                      <option key={tt.id} value={tt.id}>{tt.data?.SoToTrinh || 'Tờ trình dự toán'} — {tt.data?.TenGoiThau}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input className="inp" placeholder="Số quyết định" value={qdData.SoQuyetDinh} onChange={e => setQdData({...qdData, SoQuyetDinh: e.target.value})} />
                  <input className="inp" placeholder="Chủ đầu tư" value={qdData.ChuDauTu} onChange={e => setQdData({...qdData, ChuDauTu: e.target.value})} />
                  <input className="inp" placeholder="Tên gói thầu" value={qdData.TenGoiThau} onChange={e => setQdData({...qdData, TenGoiThau: e.target.value})} />
                  <input className="inp" placeholder="Đơn vị mua sắm" value={qdData.DonViMuaSam} onChange={e => setQdData({...qdData, DonViMuaSam: e.target.value})} />
                  <input className="inp" placeholder="Dự toán bằng số" value={qdData.DuToanBangSo} onChange={e => setQdData({...qdData, DuToanBangSo: e.target.value})} />
                  <input className="inp" placeholder="Dự toán bằng chữ" value={qdData.DuToanBangChu} onChange={e => setQdData({...qdData, DuToanBangChu: e.target.value})} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Hủy</button>
                  <button onClick={handleCreateQD} disabled={submitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
                    {submitting ? '...' : 'Tạo & Gửi duyệt'}
                  </button>
                </div>
              </>
            )}
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
          {selectedProject ? 'Chưa có tài liệu cho dự án này' : 'Chưa có tài liệu nào'}
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
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetailDoc(doc)}>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${doc.type === 'TT_DUTOAN' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {typeLabels[doc.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{doc.data?.TenGoiThau || doc.data?.SoToTrinh || doc.data?.SoQuyetDinh || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.creator.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[doc.status]}`}>
                      {statusLabels[doc.status]}
                    </span>
                    {doc.reviews?.[0]?.action === 'REJECT' && (
                      <p className="text-xs text-red-500 mt-0.5">💬 {doc.reviews[0].comment}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => setDetailDoc(doc)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁</button>
                      <button onClick={() => handleDownload(doc.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥</button>
                      {canApprove && doc.status === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => handleApprove(doc.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">✅</button>
                          {rejectingId === doc.id ? (
                            <div className="flex gap-1 items-center">
                              <input className="text-xs border rounded px-2 py-1 w-32" placeholder="Lý do..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
                              <button onClick={() => handleReject(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Gửi</button>
                              <button onClick={() => setRejectingId(null)} className="text-xs px-2 py-1 bg-gray-100 rounded">Hủy</button>
                            </div>
                          ) : (
                            <button onClick={() => setRejectingId(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🔄</button>
                          )}
                        </>
                      )}
                      {doc.status === 'REJECTED' && doc.createdBy === user?.id && (
                        <button onClick={() => handleResubmit(doc)} className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">📤 Gửi lại</button>
                      )}
                    </div>
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
          transition: border-color 0.2s;
          min-width: 0;
        }
        .inp:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
      `}</style>
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={selectedProject}
        stepKey="phe_duyet_du_toan"
        title="Lịch sử Phê duyệt Dự toán"
      />
      <SaveToLibraryModal
        isOpen={saveTTOpen}
        onClose={() => setSaveTTOpen(false)}
        libraryType="DUTOAN_TT"
        formData={ttData}
        formFieldKeys={['SoToTrinh', 'DiaDanh', 'Ngay', 'Thang', 'Nam', 'ChuDauTu', 'TenDuAn', 'TenGoiThau', 'DonViTrinh', 'DonViMuaSam', 'PhongBanThuocDonViTrinh', 'NguonVon', 'DiaDiemThucHien', 'ThoiGianThucHien', 'DuToanBangSo', 'DuToanBangChu']}
        onSave={() => setSaveTTOpen(false)}
      />
      <SaveToLibraryModal
        isOpen={saveQDOpen}
        onClose={() => setSaveQDOpen(false)}
        libraryType="DUTOAN_QD"
        formData={qdData}
        formFieldKeys={['SoQuyetDinh', 'DiaDanh', 'ChuDauTu', 'TenGoiThau', 'DonViMuaSam', 'PhongBanThuocDonViTrinh', 'NguonVon', 'DiaDiemThucHien', 'ThoiGianThucHien', 'DuToanBangSo', 'DuToanBangChu']}
        onSave={() => setSaveQDOpen(false)}
      />
      {detailDoc && (
        <OnlyOfficePreview
          documentId={detailDoc.id}
          onClose={() => setDetailDoc(null)}
          type="document"
        />
      )}
    </div>
  );
}

export default function ThietBiDuToanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <ThietBiDuToanPageInner />
    </Suspense>
  );
}
