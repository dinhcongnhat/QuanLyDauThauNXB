'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Document as Doc, DocStatus, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import { HistoryModal } from '@/components/HistoryModal';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import { ApproverSelect } from '@/components/ApproverSelect';

const PROJ_TYPE = 'THAU_SACH';

const statusLabels: Record<DocStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ phê duyệt',
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Cần làm lại',
};

const statusColors: Record<DocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function SachDuToanPageInner() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillInfo, setAutoFillInfo] = useState<any>(null);
  const [datSachCompleted, setDatSachCompleted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState('');

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
        api.getDocumentsByType(
          ['TT_DUTOAN', 'QD_DUTOAN'],
          selectedProject || undefined,
          1,
          100,
          PROJ_TYPE,
        ),
        api.getProjects(),
      ]);
      const documentsList = Array.isArray(data) ? data : ((data as any)?.documents || []);
      setDocs(documentsList);
      setProjects((projectList.projects || []).filter((p: any) => p.procurementType === PROJ_TYPE));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
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

  const approvedTTs = docs.filter(
    d => d.type === 'TT_DUTOAN' && ['COMPLETED', 'APPROVED'].includes(d.status),
  );
  const hasApprovedTT = approvedTTs.length > 0;
  const hasQD = docs.some(d => d.type === 'QD_DUTOAN');
  const isDecisionForm = editingDoc
    ? editingDoc.type === 'QD_DUTOAN'
    : hasApprovedTT;

  const closeForm = () => {
    setShowForm(false);
    setEditingDoc(null);
    setSelectedApproverId('');
  };

  const startEditing = (doc: Doc) => {
    setEditingDoc(doc);
    if (doc.projectId) setSelectedProject(doc.projectId);
    if (doc.type === 'QD_DUTOAN') {
      setQdData(current => ({ ...current, ...(doc.data || {}) }));
    } else {
      setTtData(current => ({ ...current, ...(doc.data || {}) }));
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateTT = async () => {
    if (!selectedProject) { toast.error('Chọn dự án'); return; }
    setSubmitting(true);
    try {
      if (editingDoc) {
        await api.resubmitDocument(editingDoc.id, ttData);
        toast.success(
          editingDoc.status === 'REJECTED'
            ? 'Đã sửa và gửi lại Tờ trình dự toán'
            : 'Đã lưu chỉnh sửa Tờ trình dự toán',
        );
      } else {
        await api.createDocument('TT_DUTOAN', ttData, undefined, undefined, selectedProject);
        toast.success('Đã tạo Tờ trình dự toán');
      }
      closeForm();
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleCreateQD = async () => {
    if (!selectedProject) { toast.error('Chọn dự án'); return; }
    if (!selectedApproverId) {
      toast.error('Vui lòng chọn người phê duyệt');
      return;
    }
    setSubmitting(true);
    try {
      if (editingDoc) {
        const saved = await api.resubmitDocument(editingDoc.id, qdData);
        await api.submitApproval({
          targetType: 'DOCUMENT',
          targetId: saved.id,
          approverId: selectedApproverId,
        });
        toast.success(
          editingDoc.status === 'REJECTED'
            ? 'Đã sửa và gửi lại Quyết định dự toán'
            : 'Đã lưu chỉnh sửa Quyết định dự toán',
        );
      } else {
        await api.createDocument(
          'QD_DUTOAN',
          qdData,
          undefined,
          selectedApproverId,
          selectedProject,
          approvedTTs[0]?.id,
        );
        toast.success('Đã tạo Quyết định dự toán');
      }
      closeForm();
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDownloadDocx = async (docId: string) => {
    try {
      const res = await api.downloadDocument(docId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DuToan_${docId.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Tải file thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tải file');
    }
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

  const canCreate = user?.role === 'ADMIN' || user?.role === 'USER';
  const canApprove = user?.role === 'ADMIN' || user?.canApprove === true;

  const filteredDocs = docs.filter((doc: Doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return [doc.data?.TenDuAn, doc.data?.SoToTrinh, doc.data?.SoQuyetDinh, doc.data?.ChuDauTu, doc.data?.TenGoiThau, doc.creator?.name]
      .filter(Boolean).some((f: any) => String(f).toLowerCase().includes(q));
  });

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 2xl:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phê duyệt dự toán</h1>
          <p className="text-gray-500 mt-1 text-sm">Thầu Sách — Dữ liệu từ GDN + PCDI sẽ được auto-fill</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {!datSachCompleted && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700">
              <span>🔒</span>
              <span>Hoàn thành <strong>Đặt sách</strong> trước khi làm dự toán</span>
            </div>
          )}
          {canCreate && !showForm && !hasQD && (
            <button onClick={() => { setEditingDoc(null); setShowForm(true); }}
              disabled={!datSachCompleted}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500">
              {!datSachCompleted ? '🔒 Tạo Dự toán' : hasApprovedTT ? '+ Tạo Quyết định Dự toán' : '+ Tạo Tờ trình Dự toán'}
            </button>
          )}
        </div>
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
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 rounded-t-2xl border-b bg-green-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <h3 className="text-lg font-semibold text-green-900">
              {editingDoc
                ? `${editingDoc.status === 'REJECTED' ? 'Sửa và gửi lại' : 'Chỉnh sửa'} ${isDecisionForm ? 'Quyết định Dự toán' : 'Tờ trình Dự toán'}`
                : isDecisionForm
                  ? 'Tạo Quyết định Dự toán'
                  : 'Tạo Tờ trình Dự toán'}
            </h3>
            <div className="flex gap-2 items-center">
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
          <div className="space-y-4 p-4 lg:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isDecisionForm ? (
                <input className="inp" placeholder="Số quyết định" value={qdData.SoQuyetDinh} onChange={e => setQdData({...qdData, SoQuyetDinh: e.target.value})} />
              ) : (
                <input className="inp" placeholder="Số tờ trình" value={ttData.SoToTrinh} onChange={e => setTtData({...ttData, SoToTrinh: e.target.value})} />
              )}
              <input className="inp" placeholder="Địa danh" value={isDecisionForm ? qdData.DiaDanh : ttData.DiaDanh} onChange={e => isDecisionForm ? setQdData({...qdData, DiaDanh: e.target.value}) : setTtData({...ttData, DiaDanh: e.target.value})} />
              <input className="inp" placeholder="Chủ đầu tư" value={isDecisionForm ? qdData.ChuDauTu : ttData.ChuDauTu} onChange={e => isDecisionForm ? setQdData({...qdData, ChuDauTu: e.target.value}) : setTtData({...ttData, ChuDauTu: e.target.value})} />
              {!isDecisionForm && (
                <input className="inp" placeholder="Tên dự án" value={ttData.TenDuAn} onChange={e => setTtData({...ttData, TenDuAn: e.target.value})} />
              )}
              <input className="inp" placeholder="Tên gói thầu" value={isDecisionForm ? qdData.TenGoiThau : ttData.TenGoiThau} onChange={e => isDecisionForm ? setQdData({...qdData, TenGoiThau: e.target.value}) : setTtData({...ttData, TenGoiThau: e.target.value})} />
              {!isDecisionForm && (
                <input className="inp" placeholder="Đơn vị trình" value={ttData.DonViTrinh} onChange={e => setTtData({...ttData, DonViTrinh: e.target.value})} />
              )}
              <input className="inp" placeholder="Đơn vị mua sắm" value={isDecisionForm ? qdData.DonViMuaSam : ttData.DonViMuaSam} onChange={e => isDecisionForm ? setQdData({...qdData, DonViMuaSam: e.target.value}) : setTtData({...ttData, DonViMuaSam: e.target.value})} />
              <input className="inp" placeholder="Nguồn vốn" value={isDecisionForm ? qdData.NguonVon : ttData.NguonVon} onChange={e => isDecisionForm ? setQdData({...qdData, NguonVon: e.target.value}) : setTtData({...ttData, NguonVon: e.target.value})} />
              <input className="inp" placeholder="Địa điểm thực hiện" value={isDecisionForm ? qdData.DiaDiemThucHien : ttData.DiaDiemThucHien} onChange={e => isDecisionForm ? setQdData({...qdData, DiaDiemThucHien: e.target.value}) : setTtData({...ttData, DiaDiemThucHien: e.target.value})} />
              <input className="inp" placeholder="Thời gian thực hiện" value={isDecisionForm ? qdData.ThoiGianThucHien : ttData.ThoiGianThucHien} onChange={e => isDecisionForm ? setQdData({...qdData, ThoiGianThucHien: e.target.value}) : setTtData({...ttData, ThoiGianThucHien: e.target.value})} />
              <input className="inp" placeholder="Dự toán bằng số (auto-fill)" value={isDecisionForm ? qdData.DuToanBangSo : ttData.DuToanBangSo} onChange={e => isDecisionForm ? setQdData({...qdData, DuToanBangSo: e.target.value}) : setTtData({...ttData, DuToanBangSo: e.target.value})} style={{backgroundColor: (isDecisionForm ? qdData.DuToanBangSo : ttData.DuToanBangSo) ? '#f0fdf4' : undefined}} />
              <input className="inp" placeholder="Dự toán bằng chữ" value={isDecisionForm ? qdData.DuToanBangChu : ttData.DuToanBangChu} onChange={e => isDecisionForm ? setQdData({...qdData, DuToanBangChu: e.target.value}) : setTtData({...ttData, DuToanBangChu: e.target.value})} />
            </div>
            {isDecisionForm && (
              <ApproverSelect
                value={selectedApproverId}
                onChange={setSelectedApproverId}
                disabled={submitting}
              />
            )}
            <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
              <button onClick={closeForm} className="min-h-10 rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold">Hủy</button>
              <button onClick={isDecisionForm ? handleCreateQD : handleCreateTT} disabled={submitting}
                className="min-h-10 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {submitting
                  ? 'Đang lưu...'
                  : editingDoc
                    ? editingDoc.status === 'REJECTED'
                      ? 'Lưu và gửi lại'
                      : 'Lưu chỉnh sửa'
                    : 'Tạo & Gửi duyệt'}
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
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
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
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailDoc(doc)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem</button>
                      <button onClick={() => handleDownloadDocx(doc.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥 Tải</button>
                      {doc.status !== 'APPROVED' &&
                        (doc.createdBy === user?.id || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => startEditing(doc)}
                            className="min-h-8 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200"
                          >
                            {doc.status === 'REJECTED' ? 'Sửa & gửi lại' : 'Chỉnh sửa'}
                          </button>
                        )}
                      {canApprove && doc.status === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => handleApprove(doc.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">✅</button>
                          <button onClick={() => setRejectingId(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🔄</button>
                        </>
                      )}
                    </div>
                    {rejectingId === doc.id && (
                      <div className="flex gap-1 mt-1">
                        <input className="text-xs border rounded px-2 py-1 w-32" placeholder="Lý do..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
                        <button onClick={() => handleReject(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Gửi</button>
                        <button onClick={() => setRejectingId(null)} className="text-xs px-2 py-1 bg-gray-100 rounded">Hủy</button>
                      </div>
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

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={selectedProject}
        stepKey="phe_duyet_du_toan"
        title="Lịch sử Phê duyệt Dự toán"
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

export default function SachDuToanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <SachDuToanPageInner />
    </Suspense>
  );
}
