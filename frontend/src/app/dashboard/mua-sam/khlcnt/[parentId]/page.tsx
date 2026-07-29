'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Document as Doc,
  DocStatus,
  LegalBasisSelectionValue,
  ProcurementPackage,
  User,
} from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import { HistoryModal } from '@/components/HistoryModal';
import { ProjectChat } from '@/components/ProjectChat';
import {
  LegalBasisField,
  LegalBasisSelection,
} from '@/components/LegalBasisField';
import {
  WorkflowFormSection,
  WorkflowStageStepper,
} from '@/components/WorkflowDocumentUI';
import {
  WorkflowDocxPreview,
  type WorkflowDocxPreviewDocument,
} from '@/components/WorkflowDocxPreview';
import {
  formatMoney,
  numberToVietnameseWords,
} from '@/lib/format-utils';

const statusLabels: Record<DocStatus, string> = {
  DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt', REJECTED: 'Cần làm lại',
};
const statusColors: Record<DocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};
const typeLabels: Record<string, string> = {
  TT_KHLCNT: 'Tờ trình KHLCNT', QD_KHLCNT: 'Quyết định KHLCNT',
};

type FormType = 'TT_KHLCNT' | 'QD_KHLCNT';
type KhlcntDraftStep = 'COVER' | 'DOCUMENT';

function LegacyKHLCNTDetailPageInner() {
  const params = useParams();
  const parentId = params.parentId as string;
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') || undefined;
  const { user } = useAuthStore();
  const [parent, setParent] = useState<Doc | null>(null);
  const [children, setChildren] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<FormType | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [delegateUserId, setDelegateUserId] = useState('');
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [selectedTTRef, setSelectedTTRef] = useState('');
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // TT KHLCNT form
  const [ttData, setTtData] = useState({
    donViTrinh: '', soToTrinh: '', diaDanh: '', ngayLap: new Date().toISOString().slice(0, 10),
    kinhGui: '', tenDuAn: '', tongMucDauTu: 0, chuDauTu: '', nguonVon: '',
    thoiGianThucHien: '', diaDiem: '', quyMo: '',
    canCuPhapLy: [''],
    congViecDaThucHien: [{ noiDung: '', donViThucHien: '', giaTri: 0, vanBanPheDuyet: '' }],
    congViecKhongApDung: [{ noiDung: '', donViThucHien: '', giaTri: 0 }],
    goiThau: [{
      tenGoiThau: '', tomTatCongViec: '', giaGoiThau: 0, nguonVon: '',
      hinhThucLuaChon: '', phuongThucLuaChon: '', loaiHopDong: '',
      thoiGianToChuc: '', thoiGianBatDau: '', thoiGianThucHien: '',
      tuyChonMuaThem: '', giamSatDauThau: '', tenChuDauTu: '',
    }],
    giaiTrinh: '',
    congViecChuaDuDK: [{ noiDung: '', giaTri: 0 }],
  });

  // QD KHLCNT form
  const [qdData, setQdData] = useState({
    coQuanPheDuyet: '', soQuyetDinh: '', diaDanh: '', ngayBanHanh: new Date().toISOString().slice(0, 10),
    tenDuAn: '', nguoiPheDuyet: '', canCuPhapLy: [''],
    ngayBaoCaoThamDinh: '', donViThamDinh: '', donViTrinh: '',
    soHieuToTrinh: '', ngayToTrinh: '',
    chuDauTu: '', donViGiamSat: '',
    goiThau: [{
      tenGoiThau: '', tomTatCongViec: '', giaGoiThau: 0, nguonVon: '',
      hinhThucLuaChon: '', phuongThucLuaChon: '', loaiHopDong: '',
      thoiGianToChuc: '', thoiGianBatDau: '', thoiGianThucHien: '',
      tuyChonMuaThem: '', giamSatDauThau: '', tenChuDauTu: '',
    }],
  });

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([
        api.getDocument(parentId),
        api.getDocumentsByParent(parentId),
      ]);
      setParent(p);
      setChildren(c);
      // Auto-populate forms from parent QD_DUTOAN data
      const pd = p?.data;
      if (pd) {
        setTtData(prev => ({
          ...prev,
          tenDuAn: pd.tenDuAn || prev.tenDuAn,
          chuDauTu: pd.tenChuDauTu || prev.chuDauTu,
          tongMucDauTu: pd.giaTriDuToanDuyet || prev.tongMucDauTu,
          donViTrinh: pd.tenDonViDeNghi || pd.tenBQLDA || prev.donViTrinh,
          nguonVon: (pd.nguonVon && Array.isArray(pd.nguonVon) ? pd.nguonVon[0] : pd.nguonVon) || prev.nguonVon,
          kinhGui: pd.tenCoQuanDuyet || prev.kinhGui,
          canCuPhapLy: pd.canCuPhapLy?.length ? [...pd.canCuPhapLy] : prev.canCuPhapLy,
          diaDanh: pd.diaDanh || prev.diaDanh,
          diaDiem: pd.diaDiem || prev.diaDiem,
          quyMo: pd.quyMo || prev.quyMo,
          thoiGianThucHien: pd.thoiGianThucHien || prev.thoiGianThucHien,
        }));
        setQdData(prev => ({
          ...prev,
          tenDuAn: pd.tenDuAn || prev.tenDuAn,
          chuDauTu: pd.tenChuDauTu || prev.chuDauTu,
          coQuanPheDuyet: pd.tenCoQuanDuyet || prev.coQuanPheDuyet,
          donViTrinh: pd.tenDonViDeNghi || pd.tenBQLDA || prev.donViTrinh,
          canCuPhapLy: pd.canCuPhapLy?.length ? [...pd.canCuPhapLy] : prev.canCuPhapLy,
          donViGiamSat: pd.tenBQLDA || prev.donViGiamSat,
        }));
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    api.getUsers().then((res: any) => setUsers(Array.isArray(res) ? res : (res?.users || []))).catch(() => {});
  }, [parentId]);

  const ttApproved = children.some(d => d.type === 'TT_KHLCNT' && d.status === 'APPROVED');
  const canCreateQD = ttApproved;
  const hasTT = children.some(d => d.type === 'TT_KHLCNT' && d.status !== 'REJECTED');
  const hasQD = children.some(d => d.type === 'QD_KHLCNT');
  const canApprove = user?.role === 'ADMIN' || user?.canApprove === true;

  // Approved children for linking
  const approvedTTs = children.filter(d => d.type === 'TT_KHLCNT' && d.status === 'APPROVED');

  // When user selects approved TT to link into QD form
  const handleSelectTTForQD = (ttId: string) => {
    setSelectedTTRef(ttId);
    const tt = approvedTTs.find(d => d.id === ttId);
    if (tt?.data) {
      const td = tt.data;
      setQdData(prev => ({
        ...prev,
        tenDuAn: td.tenDuAn || prev.tenDuAn,
        chuDauTu: td.chuDauTu || prev.chuDauTu,
        donViTrinh: td.donViTrinh || prev.donViTrinh,
        soHieuToTrinh: td.soToTrinh || prev.soHieuToTrinh,
        ngayToTrinh: td.ngayLap || prev.ngayToTrinh,
        coQuanPheDuyet: td.kinhGui || prev.coQuanPheDuyet,
        canCuPhapLy: td.canCuPhapLy?.length ? [...td.canCuPhapLy] : prev.canCuPhapLy,
        goiThau: td.goiThau?.length ? td.goiThau : prev.goiThau,
      }));
    }
  };

  // When user selects approved BC to link into QD form
  // Check if delegation exists
  const delegationReview = children.flatMap(d => d.reviews || []).find(r => r.action === 'DELEGATE');

  const handleCreate = async (type: FormType) => {
    const dataMap = { TT_KHLCNT: ttData, QD_KHLCNT: qdData };
    try {
      await api.createDocument(type, dataMap[type], parentId, undefined, projectId);
      toast.success(`Tạo ${typeLabels[type]} thành công`);
      setShowForm(null);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveDocument(id);
      toast.success('Đã phê duyệt');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) { toast.error('Vui lòng nhập lý do'); return; }
    try {
      await api.rejectDocument(id, rejectComment);
      toast.success('Đã yêu cầu làm lại');
      setRejectingId(null); setRejectComment('');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResubmit = async (doc: Doc) => {
    try {
      const updatedData = editingDoc?.id === doc.id ? editingDoc.data : undefined;
      await api.resubmitDocument(doc.id, updatedData);
      toast.success(
        doc.status === 'REJECTED'
          ? 'Đã lưu và gửi lại hồ sơ'
          : 'Đã lưu chỉnh sửa hồ sơ đang chờ duyệt',
      );
      setEditingDoc(null);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const startEditing = (doc: Doc) => {
    setEditingDoc({ ...doc, data: { ...doc.data } });
  };

  const handleDelegate = async () => {
    if (!delegateUserId) { toast.error('Chọn nhân viên'); return; }
    try {
      await api.delegateQDKHLCNT(parentId, delegateUserId);
      toast.success('Đã ủy quyền tạo QĐ KHLCNT');
      setDelegateUserId('');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await api.downloadDocument(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'document.docx';
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  const activeProjectId = projectId || parent?.projectId;

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 2xl:space-y-6">
      {/* Parent info */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">QĐ dự toán gốc</p>
            <h1 className="text-xl font-bold text-gray-900">
              {parent?.data?.soQuyetDinh || 'QĐ dự toán'} – {parent?.data?.tenChuDauTu || ''}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Giá trị: {parent?.data?.giaTriDuToanDuyet?.toLocaleString('vi-VN')} đồng
            </p>
          </div>
          {activeProjectId && (
            <button
              onClick={() => setShowHistory(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lịch sử
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!hasTT && (
          <button onClick={() => setShowForm('TT_KHLCNT')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + Tờ trình KHLCNT
          </button>
        )}
        {canCreateQD && !hasQD && canApprove && (
          <button onClick={() => setShowForm('QD_KHLCNT')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
            + Quyết định KHLCNT
          </button>
        )}
        {!canCreateQD && !hasQD && (
          <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed">
            🔒 QĐ KHLCNT (cần duyệt TT trước)
          </span>
        )}
      </div>

      {/* Delegate section */}
      {canApprove && canCreateQD && !hasQD && (
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm font-medium text-yellow-800 mb-2">Ủy quyền tạo QĐ KHLCNT cho nhân viên</p>
          <div className="flex gap-2 items-center">
            <select value={delegateUserId} onChange={e => setDelegateUserId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1">
              <option value="">-- Chọn nhân viên --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            <button onClick={handleDelegate} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm">
              Ủy quyền
            </button>
          </div>
          {delegationReview && (
            <p className="text-xs text-yellow-600 mt-2">
              ✅ Đã ủy quyền cho nhân viên ID: {delegationReview.comment}
            </p>
          )}
        </div>
      )}

      {/* Create forms */}
      {showForm === 'TT_KHLCNT' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tạo Tờ trình phê duyệt KHLCNT (Mẫu 02A)</h3>
          </div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Thông tin chung</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className="inp" placeholder="Đơn vị trình" value={ttData.donViTrinh} onChange={e => setTtData({...ttData, donViTrinh: e.target.value})} />
            <input className="inp" placeholder="Số tờ trình" value={ttData.soToTrinh} onChange={e => setTtData({...ttData, soToTrinh: e.target.value})} />
            <input className="inp" placeholder="Địa danh" value={ttData.diaDanh} onChange={e => setTtData({...ttData, diaDanh: e.target.value})} />
            <input className="inp" type="date" value={ttData.ngayLap} onChange={e => setTtData({...ttData, ngayLap: e.target.value})} />
            <input className="inp col-span-2" placeholder="Kính gửi (người phê duyệt KHLCNT)" value={ttData.kinhGui} onChange={e => setTtData({...ttData, kinhGui: e.target.value})} />
          </div>
          <h4 className="text-sm font-medium text-gray-600 mt-4 mb-2">I. Mô tả tóm tắt dự án</h4>
          <div className="grid grid-cols-2 gap-4">
            <input className="inp col-span-2" placeholder="Tên dự án / dự toán mua sắm" value={ttData.tenDuAn} onChange={e => setTtData({...ttData, tenDuAn: e.target.value})} />
            <input className="inp" type="number" placeholder="Tổng mức đầu tư" value={ttData.tongMucDauTu || ''} onChange={e => setTtData({...ttData, tongMucDauTu: Number(e.target.value)})} />
            <input className="inp" placeholder="Chủ đầu tư" value={ttData.chuDauTu} onChange={e => setTtData({...ttData, chuDauTu: e.target.value})} />
            <input className="inp" placeholder="Nguồn vốn" value={ttData.nguonVon} onChange={e => setTtData({...ttData, nguonVon: e.target.value})} />
            <input className="inp" placeholder="Thời gian thực hiện" value={ttData.thoiGianThucHien} onChange={e => setTtData({...ttData, thoiGianThucHien: e.target.value})} />
            <input className="inp" placeholder="Địa điểm" value={ttData.diaDiem} onChange={e => setTtData({...ttData, diaDiem: e.target.value})} />
            <input className="inp" placeholder="Quy mô" value={ttData.quyMo} onChange={e => setTtData({...ttData, quyMo: e.target.value})} />
          </div>
          <h4 className="text-sm font-medium text-gray-600 mt-4 mb-2">II. Căn cứ pháp lý</h4>
          {ttData.canCuPhapLy.map((cc, i) => (
            <div key={i} className="flex gap-2 mt-1">
              <input className="inp flex-1" placeholder="Căn cứ pháp lý" value={cc} onChange={e => { const a = [...ttData.canCuPhapLy]; a[i] = e.target.value; setTtData({...ttData, canCuPhapLy: a}); }} />
              <button onClick={() => { const a = ttData.canCuPhapLy.filter((_, j) => j !== i); setTtData({...ttData, canCuPhapLy: a.length ? a : ['']}); }} className="text-red-500 text-sm">Xóa</button>
            </div>
          ))}
          <button onClick={() => setTtData({...ttData, canCuPhapLy: [...ttData.canCuPhapLy, '']})} className="text-sm text-primary-600 mt-1">+ Thêm căn cứ</button>

          <h4 className="text-sm font-medium text-gray-600 mt-4 mb-2">V. Gói thầu (Bảng số 3)</h4>
          {ttData.goiThau.map((gt, i) => (
            <div key={i} className="border rounded-lg p-3 mb-2 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">Gói thầu {i + 1}</span>
                <button onClick={() => { const a = ttData.goiThau.filter((_, j) => j !== i); setTtData({...ttData, goiThau: a.length ? a : [{ tenGoiThau: '', tomTatCongViec: '', giaGoiThau: 0, nguonVon: '', hinhThucLuaChon: '', phuongThucLuaChon: '', loaiHopDong: '', thoiGianToChuc: '', thoiGianBatDau: '', thoiGianThucHien: '', tuyChonMuaThem: '', giamSatDauThau: '', tenChuDauTu: '' }]}); }} className="text-red-500 text-xs">Xóa</button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                <input className="inp" placeholder="Tên gói thầu" value={gt.tenGoiThau} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, tenGoiThau: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="Tóm tắt công việc" value={gt.tomTatCongViec} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, tomTatCongViec: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" type="number" placeholder="Giá gói thầu" value={gt.giaGoiThau || ''} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, giaGoiThau: Number(e.target.value)}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="Nguồn vốn" value={gt.nguonVon} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, nguonVon: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="Hình thức lựa chọn" value={gt.hinhThucLuaChon} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, hinhThucLuaChon: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="Phương thức lựa chọn" value={gt.phuongThucLuaChon} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, phuongThucLuaChon: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="Loại hợp đồng" value={gt.loaiHopDong} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, loaiHopDong: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="TG tổ chức lựa chọn" value={gt.thoiGianToChuc} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, thoiGianToChuc: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
                <input className="inp" placeholder="TG thực hiện gói thầu" value={gt.thoiGianThucHien} onChange={e => { const a = [...ttData.goiThau]; a[i] = {...gt, thoiGianThucHien: e.target.value}; setTtData({...ttData, goiThau: a}); }} />
              </div>
            </div>
          ))}
          <button onClick={() => setTtData({...ttData, goiThau: [...ttData.goiThau, { tenGoiThau: '', tomTatCongViec: '', giaGoiThau: 0, nguonVon: '', hinhThucLuaChon: '', phuongThucLuaChon: '', loaiHopDong: '', thoiGianToChuc: '', thoiGianBatDau: '', thoiGianThucHien: '', tuyChonMuaThem: '', giamSatDauThau: '', tenChuDauTu: '' }]})} className="text-sm text-primary-600 mt-1">+ Thêm gói thầu</button>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-600">Giải trình nội dung KHLCNT</label>
            <textarea className="inp w-full mt-1" rows={3} placeholder="Giải trình cơ sở phân chia gói thầu, giá, nguồn vốn, hình thức, thời gian..." value={ttData.giaiTrinh} onChange={e => setTtData({...ttData, giaiTrinh: e.target.value})} />
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={() => handleCreate('TT_KHLCNT')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Tạo & Gửi</button>
            <button onClick={() => setShowForm(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg">Hủy</button>
          </div>
        </div>
      )}



      {showForm === 'QD_KHLCNT' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tạo Quyết định phê duyệt KHLCNT (Mẫu 02C)</h3>
          </div>

          {/* Link from approved TT */}
          <div className="mb-6">
            {approvedTTs.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-800 mb-2">Liên kết từ Tờ trình KHLCNT đã duyệt</label>
                <select className="inp w-full" value={selectedTTRef} onChange={e => handleSelectTTForQD(e.target.value)}>
                  <option value="">-- Chọn Tờ trình đã duyệt --</option>
                  {approvedTTs.map(tt => (
                    <option key={tt.id} value={tt.id}>
                      {tt.data?.soToTrinh ? `${tt.data.soToTrinh} - ` : ''}{tt.data?.tenDuAn || 'Tờ trình KHLCNT'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-600 mt-1">Tự động điền: tên dự án, chủ đầu tư, đơn vị trình, gói thầu, căn cứ pháp lý</p>
              </div>
            )}
          </div>

          <h4 className="text-sm font-medium text-gray-600 mb-2">Thông tin chung</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className="inp" placeholder="Cơ quan phê duyệt" value={qdData.coQuanPheDuyet} onChange={e => setQdData({...qdData, coQuanPheDuyet: e.target.value})} />
            <input className="inp" placeholder="Số quyết định" value={qdData.soQuyetDinh} onChange={e => setQdData({...qdData, soQuyetDinh: e.target.value})} />
            <input className="inp" placeholder="Địa danh" value={qdData.diaDanh} onChange={e => setQdData({...qdData, diaDanh: e.target.value})} />
            <input className="inp" type="date" value={qdData.ngayBanHanh} onChange={e => setQdData({...qdData, ngayBanHanh: e.target.value})} />
            <input className="inp" placeholder="Tên dự án / dự toán mua sắm" value={qdData.tenDuAn} onChange={e => setQdData({...qdData, tenDuAn: e.target.value})} />
            <input className="inp" placeholder="Người phê duyệt KHLCNT" value={qdData.nguoiPheDuyet} onChange={e => setQdData({...qdData, nguoiPheDuyet: e.target.value})} />
          </div>

          <h4 className="text-sm font-medium text-gray-600 mt-4 mb-2">Căn cứ pháp lý bổ sung</h4>
          {qdData.canCuPhapLy.map((cc, i) => (
            <div key={i} className="flex gap-2 mt-1">
              <input className="inp flex-1" placeholder="Căn cứ pháp lý" value={cc} onChange={e => { const a = [...qdData.canCuPhapLy]; a[i] = e.target.value; setQdData({...qdData, canCuPhapLy: a}); }} />
              <button onClick={() => { const a = qdData.canCuPhapLy.filter((_, j) => j !== i); setQdData({...qdData, canCuPhapLy: a.length ? a : ['']}); }} className="text-red-500 text-sm">Xóa</button>
            </div>
          ))}
          <button onClick={() => setQdData({...qdData, canCuPhapLy: [...qdData.canCuPhapLy, '']})} className="text-sm text-primary-600 mt-1">+ Thêm căn cứ</button>

          <h4 className="text-sm font-medium text-gray-600 mt-4 mb-2">Thông tin liên quan</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className="inp" placeholder="Ngày báo cáo thẩm định (dd/mm/yyyy)" value={qdData.ngayBaoCaoThamDinh} onChange={e => setQdData({...qdData, ngayBaoCaoThamDinh: e.target.value})} />
            <input className="inp" placeholder="Đơn vị thẩm định" value={qdData.donViThamDinh} onChange={e => setQdData({...qdData, donViThamDinh: e.target.value})} />
            <input className="inp" placeholder="Đơn vị trình" value={qdData.donViTrinh} onChange={e => setQdData({...qdData, donViTrinh: e.target.value})} />
            <input className="inp" placeholder="Số hiệu tờ trình" value={qdData.soHieuToTrinh} onChange={e => setQdData({...qdData, soHieuToTrinh: e.target.value})} />
            <input className="inp" placeholder="Ngày tờ trình (dd/mm/yyyy)" value={qdData.ngayToTrinh} onChange={e => setQdData({...qdData, ngayToTrinh: e.target.value})} />
            <input className="inp" placeholder="Chủ đầu tư (Điều 2)" value={qdData.chuDauTu} onChange={e => setQdData({...qdData, chuDauTu: e.target.value})} />
            <input className="inp" placeholder="Đơn vị giám sát đấu thầu (nếu có)" value={qdData.donViGiamSat} onChange={e => setQdData({...qdData, donViGiamSat: e.target.value})} />
          </div>

          <h4 className="text-sm font-medium text-gray-600 mt-4 mb-2">Phụ lục - Gói thầu</h4>
          {qdData.goiThau.map((gt, i) => (
            <div key={i} className="border rounded-lg p-3 mb-2 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">Gói thầu {i + 1}</span>
                <button onClick={() => { const a = qdData.goiThau.filter((_, j) => j !== i); setQdData({...qdData, goiThau: a.length ? a : [{ tenGoiThau: '', tomTatCongViec: '', giaGoiThau: 0, nguonVon: '', hinhThucLuaChon: '', phuongThucLuaChon: '', loaiHopDong: '', thoiGianToChuc: '', thoiGianBatDau: '', thoiGianThucHien: '', tuyChonMuaThem: '', giamSatDauThau: '', tenChuDauTu: '' }]}); }} className="text-red-500 text-xs">Xóa</button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                <input className="inp" placeholder="Tên gói thầu" value={gt.tenGoiThau} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, tenGoiThau: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="Tóm tắt công việc" value={gt.tomTatCongViec} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, tomTatCongViec: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" type="number" placeholder="Giá gói thầu" value={gt.giaGoiThau || ''} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, giaGoiThau: Number(e.target.value)}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="Nguồn vốn" value={gt.nguonVon} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, nguonVon: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="Hình thức lựa chọn" value={gt.hinhThucLuaChon} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, hinhThucLuaChon: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="Phương thức lựa chọn" value={gt.phuongThucLuaChon} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, phuongThucLuaChon: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="Loại hợp đồng" value={gt.loaiHopDong} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, loaiHopDong: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="TG tổ chức" value={gt.thoiGianToChuc} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, thoiGianToChuc: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
                <input className="inp" placeholder="TG thực hiện" value={gt.thoiGianThucHien} onChange={e => { const a = [...qdData.goiThau]; a[i] = {...gt, thoiGianThucHien: e.target.value}; setQdData({...qdData, goiThau: a}); }} />
              </div>
            </div>
          ))}
          <button onClick={() => setQdData({...qdData, goiThau: [...qdData.goiThau, { tenGoiThau: '', tomTatCongViec: '', giaGoiThau: 0, nguonVon: '', hinhThucLuaChon: '', phuongThucLuaChon: '', loaiHopDong: '', thoiGianToChuc: '', thoiGianBatDau: '', thoiGianThucHien: '', tuyChonMuaThem: '', giamSatDauThau: '', tenChuDauTu: '' }]})} className="text-sm text-primary-600 mt-1">+ Thêm gói thầu</button>

          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={() => handleCreate('QD_KHLCNT')} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Tạo & Gửi</button>
            <button onClick={() => setShowForm(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg">Hủy</button>
          </div>
        </div>
      )}

      {/* Children documents list */}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">Hồ sơ KHLCNT</h3>
        </div>
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông tin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {children.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có hồ sơ nào</td></tr>
            )}
            {children.map(doc => {
              const canApproveThis = doc.status === 'PENDING_APPROVAL' && canApprove;
              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      doc.type === 'TT_KHLCNT' ? 'bg-blue-50 text-blue-700' :
                      doc.type === 'BC_KHLCNT' ? 'bg-teal-50 text-teal-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {typeLabels[doc.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {doc.data?.tenDuAn || doc.data?.soToTrinh || doc.data?.soVanBan || doc.data?.soQuyetDinh || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.creator.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[doc.status]}`}>
                      {statusLabels[doc.status]}
                    </span>
                    {doc.reviews?.find(r => r.action === 'REJECT')?.comment && (
                      <p className="text-xs text-red-500 mt-1">💬 {doc.reviews.find(r => r.action === 'REJECT')?.comment}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => handleDownload(doc.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥 DOCX</button>
                      <button onClick={() => setPreviewDocId(doc.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem</button>
                      {canApproveThis && (
                        <>
                          <button onClick={() => handleApprove(doc.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">✅ Duyệt</button>
                          {rejectingId === doc.id ? (
                            <div className="flex gap-1 items-center">
                              <input className="text-xs border rounded px-2 py-1 w-32" placeholder="Lý do..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
                              <button onClick={() => handleReject(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Gửi</button>
                              <button onClick={() => setRejectingId(null)} className="text-xs px-2 py-1 bg-gray-100 rounded">Hủy</button>
                            </div>
                          ) : (
                            <button onClick={() => setRejectingId(doc.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">🔄 Làm lại</button>
                          )}
                        </>
                      )}
                      {doc.status !== 'APPROVED' &&
                        (doc.createdBy === user?.id || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => startEditing(doc)}
                            className="min-h-8 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200"
                          >
                            {doc.status === 'REJECTED' ? '✏️ Sửa & gửi lại' : '✏️ Chỉnh sửa'}
                          </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Review history */}
      {children.some(d => d.reviews && d.reviews.length > 0) && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3">Lịch sử duyệt</h3>
          <div className="space-y-2">
            {children.flatMap(d => (d.reviews || []).map(r => ({ ...r, docType: d.type }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  r.action.includes('APPROVE') ? 'bg-green-50 text-green-700' :
                  r.action === 'REJECT' ? 'bg-red-50 text-red-700' :
                  r.action === 'DELEGATE' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-gray-50 text-gray-700'
                }`}>
                  {r.action === 'SUBMIT' ? 'Gửi' : r.action.includes('APPROVE') ? 'Duyệt' : r.action === 'REJECT' ? 'Từ chối' : r.action === 'DELEGATE' ? 'Ủy quyền' : r.action === 'RESUBMIT' ? 'Gửi lại' : r.action}
                </span>
                <span className="text-gray-600">{r.user.name}</span>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-400">{typeLabels[r.docType]}</span>
                {r.comment && r.action !== 'DELEGATE' && <span className="text-gray-500 italic">"{r.comment}"</span>}
                <span className="text-xs text-gray-400 ml-auto">{format(new Date(r.createdAt), 'dd/MM HH:mm', { locale: vi })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .inp { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; min-width: 0; overflow-wrap: break-word; }
        .inp:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
      `}</style>

      {/* Edit submitted/rejected document modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingDoc(null)}>
          <div className="mx-3 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:mx-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                ✏️ {editingDoc.status === 'REJECTED' ? 'Sửa và gửi lại' : 'Chỉnh sửa'} {typeLabels[editingDoc.type] || editingDoc.type}
              </h3>
              <button onClick={() => setEditingDoc(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              {Object.entries(editingDoc.data || {}).map(([key, val]) => {
                if (key === 'canCuPhapLy' || key === 'goiThau' || key === 'congViecDaThucHien' || key === 'congViecKhongApDung' || key === 'congViecChuaDuDK') return null;
                if (typeof val === 'object') return null;
                const labels: Record<string, string> = {
                  donViTrinh: 'Đơn vị trình', soToTrinh: 'Số tờ trình', diaDanh: 'Địa danh', ngayLap: 'Ngày lập',
                  kinhGui: 'Kính gửi', tenDuAn: 'Tên dự án', tongMucDauTu: 'Tổng mức đầu tư', chuDauTu: 'Chủ đầu tư',
                  nguonVon: 'Nguồn vốn', thoiGianThucHien: 'Thời gian thực hiện', diaDiem: 'Địa điểm', quyMo: 'Quy mô',
                  giaiTrinh: 'Giải trình', donViThamDinh: 'Đơn vị thẩm định', soVanBan: 'Số văn bản',
                  ngayNhanHoSo: 'Ngày nhận hồ sơ', tenDonViThamDinh: 'Tên đơn vị thẩm định',
                  cachThucThamDinh: 'Cách thức thẩm định', ketQuaThamDinh: 'Kết quả thẩm định', deXuat: 'Đề xuất',
                  coQuanPheDuyet: 'Cơ quan phê duyệt', soQuyetDinh: 'Số quyết định', ngayBanHanh: 'Ngày ban hành',
                  nguoiPheDuyet: 'Người phê duyệt', donViThamDinh2: 'Đơn vị thẩm định',
                  soHieuToTrinh: 'Số hiệu tờ trình', ngayToTrinh: 'Ngày tờ trình',
                  donViGiamSat: 'Đơn vị giám sát', ngayBaoCaoThamDinh: 'Ngày báo cáo thẩm định',
                  tongMucDauTuDuAn: 'Tổng mức đầu tư dự án', giaTriDaThucHien: 'Giá trị đã thực hiện',
                  giaTriKhongApDung: 'Giá trị không áp dụng', giaTriKHLCNT: 'Giá trị KHLCNT',
                  giaTriChuaDuDK: 'Giá trị chưa đủ ĐK',
                };
                return (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{labels[key] || key}</label>
                    {typeof val === 'number' ? (
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" type="number"
                        value={editingDoc.data[key] || ''} onChange={e => setEditingDoc({...editingDoc, data: {...editingDoc.data, [key]: Number(e.target.value)}})} />
                    ) : (
                      <input className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={editingDoc.data[key] || ''} onChange={e => setEditingDoc({...editingDoc, data: {...editingDoc.data, [key]: e.target.value}})} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="sticky bottom-0 mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white py-3 sm:flex-row sm:justify-end">
              <button onClick={() => setEditingDoc(null)} className="min-h-10 rounded-xl bg-gray-200 px-4 py-2 text-gray-700">Hủy</button>
              <button onClick={() => { const doc = children.find(d => d.id === editingDoc.id); if (doc) handleResubmit(doc); }}
                className="min-h-10 rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700">
                {editingDoc.status === 'REJECTED' ? '💾 Lưu & gửi lại duyệt' : '💾 Lưu chỉnh sửa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDocId && (
        <OnlyOfficePreview documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={activeProjectId}
        stepKey="khlcnt"
        title="Lịch sử Kế hoạch lựa chọn nhà thầu"
      />

      {(parent?.projectId || projectId) && (
        <ProjectChat
          projectId={parent?.projectId || projectId!}
          module="KHLCNT"
          projectName={parent?.data?.tenDuAn || (parent as any)?.tenDuAn}
        />
      )}
    </div>
  );
}

const WORKFLOW_TODAY = new Date().toISOString().slice(0, 10);
const WORKFLOW_INPUT_CLASS =
  'w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

interface EquipmentKhlcntData {
  SoVanBan: string;
  NgayBanHanh: string;
  TenDuAn: string;
  NguoiSoanVanBan: string;
  ThuTruongDonVi: string;
  TongMucDauTu: string;
  TongMucDauTuBangChu: string;
  NguonVon: string;
  NamThucHien: string;
  DiaDiemDauTu: string;
  canCu: LegalBasisSelectionValue[];
  packages: ProcurementPackage[];
}

function workflowPackageId() {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `package-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function workflowFirstValue(
  data: Record<string, any>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

function emptyWorkflowPackage(
  id = 'package-1',
): ProcurementPackage {
  return {
    id,
    tenGoiThau: '',
    giaDuToanGoiThau: '',
    ghiChu: '',
    congViec: '',
    nguonVon: '',
    hinhThucLuaChonNhaThau: '',
    phuongThucLuaChonNhaThau: '',
    thoiGianToChucLuaChonNhaThau: '',
    thoiGianBatDauToChucLuaChonNhaThau: '',
    loaiHopDong: '',
    thoiGianThucHienGoiThau: '',
    tuyChonMuaThem: '',
  };
}

function normalizeWorkflowPackage(
  raw: Record<string, any>,
  index: number,
): ProcurementPackage {
  return {
    id:
      workflowFirstValue(raw, 'id') ||
      `legacy-package-${index + 1}`,
    tenGoiThau: workflowFirstValue(raw, 'tenGoiThau', 'TenGoiThau'),
    giaDuToanGoiThau: formatMoney(
      workflowFirstValue(
        raw,
        'giaDuToanGoiThau',
        'GiaDuToanGoiThau',
        'giaGoiThau',
        'GiaGoiThau',
      ),
    ),
    ghiChu: workflowFirstValue(raw, 'ghiChu', 'GhiChu'),
    congViec: workflowFirstValue(
      raw,
      'congViec',
      'CongViec',
      'tomTatCongViec',
    ),
    nguonVon: workflowFirstValue(raw, 'nguonVon', 'NguonVon'),
    hinhThucLuaChonNhaThau: workflowFirstValue(
      raw,
      'hinhThucLuaChonNhaThau',
      'HinhThucLuaChonNhaThau',
      'hinhThucLuaChon',
    ),
    phuongThucLuaChonNhaThau: workflowFirstValue(
      raw,
      'phuongThucLuaChonNhaThau',
      'PhuongThucLuaChonNhaThau',
      'phuongThucLuaChon',
    ),
    thoiGianToChucLuaChonNhaThau: workflowFirstValue(
      raw,
      'thoiGianToChucLuaChonNhaThau',
      'ThoiGianToChucLuaChonNhaThau',
      'thoiGianLuaChonNhaThau',
      'thoiGianToChuc',
    ),
    thoiGianBatDauToChucLuaChonNhaThau: workflowFirstValue(
      raw,
      'thoiGianBatDauToChucLuaChonNhaThau',
      'ThoiGianBatDauToChucLuaChonNhaThau',
      'thoiGianBatDauLuaChonNhaThau',
      'thoiGianBatDau',
    ),
    loaiHopDong: workflowFirstValue(raw, 'loaiHopDong', 'LoaiHopDong'),
    thoiGianThucHienGoiThau: workflowFirstValue(
      raw,
      'thoiGianThucHienGoiThau',
      'ThoiGianThucHienGoiThau',
      'thoiGianThucHienHopDong',
      'thoiGianThucHien',
    ),
    tuyChonMuaThem: workflowFirstValue(
      raw,
      'tuyChonMuaThem',
      'TuyChonMuaThem',
    ),
  };
}

function normalizeWorkflowPackages(
  data: Record<string, any>,
): ProcurementPackage[] {
  const raw =
    data?.packages ??
    data?.goiThau ??
    data?.GoiThau ??
    data?.cacGoiThau ??
    data?.CacGoiThau;
  let packages: ProcurementPackage[];
  if (Array.isArray(raw) && raw.length > 0) {
    packages = raw.map((item, index) =>
      normalizeWorkflowPackage(item || {}, index),
    );
  } else if (
    workflowFirstValue(data, 'tenGoiThau', 'TenGoiThau')
  ) {
    packages = [normalizeWorkflowPackage(data, 0)];
  } else {
    packages = [emptyWorkflowPackage()];
  }

  const commonNguonVon = workflowFirstValue(
    data,
    'NguonVon',
    'nguonVon',
  );
  return packages.map((item) => ({
    ...item,
    nguonVon: item.nguonVon || commonNguonVon,
  }));
}

function normalizeWorkflowLegalBases(
  data: Record<string, any>,
): LegalBasisSelectionValue[] {
  const raw =
    data?.canCu ??
    data?.CanCu ??
    data?.canCuPhapLy ??
    data?.CanCuVanBanPhapLy ??
    data?.TenCacVanBanPhapLyLienQuan ??
    [];
  const values = Array.isArray(raw) ? raw : [raw];

  return values
    .flatMap((item: any) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof item.citationSnapshot === 'string'
      ) {
        return [
          {
            legalDocumentId: item.legalDocumentId ?? null,
            source: item.source === 'LIBRARY' ? 'LIBRARY' : 'MANUAL',
            citationSnapshot: item.citationSnapshot,
          } as LegalBasisSelectionValue,
        ];
      }
      if (typeof item !== 'string') return [];
      return item
        .split(/\r?\n/)
        .map((citationSnapshot) => citationSnapshot.trim())
        .filter(Boolean)
        .map(
          (citationSnapshot): LegalBasisSelectionValue => ({
            legalDocumentId: null,
            source: 'MANUAL',
            citationSnapshot,
          }),
        );
    })
    .filter((item) => item.citationSnapshot.trim());
}

function normalizeEquipmentKhlcntData(
  data: Record<string, any>,
): EquipmentKhlcntData {
  const total = workflowFirstValue(
    data,
    'TongGiaDuToanGoiThau',
    'tongGiaDuToanGoiThau',
    'DuToanBangSo',
    'giaTriDuToanDuyet',
  );
  const totalInvestment = formatMoney(
    workflowFirstValue(data, 'TongMucDauTu', 'tongMucDauTu') ||
      total,
  );

  return {
    SoVanBan: workflowFirstValue(
      data,
      'SoVanBan',
      'soVanBan',
      'SoToTrinh',
      'soToTrinh',
      'SoQuyetDinh',
      'soQuyetDinh',
    ),
    NgayBanHanh:
      workflowFirstValue(
        data,
        'NgayBanHanh',
        'ngayBanHanh',
        'ngayLap',
      ).slice(0, 10) || WORKFLOW_TODAY,
    TenDuAn: workflowFirstValue(data, 'TenDuAn', 'tenDuAn'),
    NguoiSoanVanBan: workflowFirstValue(
      data,
      'NguoiSoanVanBan',
      'nguoiSoanVanBan',
    ),
    ThuTruongDonVi: workflowFirstValue(
      data,
      'ThuTruongDonVi',
      'thuTruongDonVi',
    ),
    TongMucDauTu: totalInvestment,
    TongMucDauTuBangChu: totalInvestment
      ? numberToVietnameseWords(totalInvestment)
      : '',
    NguonVon: workflowFirstValue(data, 'NguonVon', 'nguonVon'),
    NamThucHien:
      workflowFirstValue(data, 'NamThucHien', 'namThucHien') ||
      String(new Date().getFullYear()),
    DiaDiemDauTu: workflowFirstValue(
      data,
      'DiaDiemDauTu',
      'diaDiemDauTu',
      'diaDiem',
      'DiaDiemThucHien',
    ),
    canCu: normalizeWorkflowLegalBases(data),
    packages: normalizeWorkflowPackages(data),
  };
}

function workflowPackageNames(data: Record<string, any>): string {
  const derived = workflowFirstValue(
    data,
    'TenCacGoiThau',
    'tenCacGoiThau',
  );
  if (derived) return derived;
  return normalizeWorkflowPackages(data)
    .map((item) => item.tenGoiThau.trim())
    .filter(Boolean)
    .join(', ');
}

function cleanEquipmentKhlcntData(
  data: EquipmentKhlcntData,
): EquipmentKhlcntData {
  return {
    ...data,
    TongMucDauTu: formatMoney(data.TongMucDauTu),
    TongMucDauTuBangChu: data.TongMucDauTu
      ? numberToVietnameseWords(data.TongMucDauTu)
      : '',
    canCu: data.canCu.filter((item) => item.citationSnapshot.trim()),
    packages: data.packages.map((item) => ({
      ...item,
      tenGoiThau: item.tenGoiThau.trim(),
    })),
  };
}

function khlcntDocxPreviewDocuments(
  type: FormType,
  data: EquipmentKhlcntData,
  step: KhlcntDraftStep,
): WorkflowDocxPreviewDocument[] {
  const payload = cleanEquipmentKhlcntData(data);
  const cover: WorkflowDocxPreviewDocument = {
    id: 'cover',
    label: '1. Phiếu trình ký',
    type: 'COVER_KHLCNT',
    data: payload,
  };
  if (type === 'TT_KHLCNT' && step === 'COVER') return [cover];

  const mainDocument: WorkflowDocxPreviewDocument = {
    id: type === 'TT_KHLCNT' ? 'proposal' : 'decision',
    label: type === 'TT_KHLCNT' ? '2. Tờ trình' : '3. Quyết định',
    type,
    data: payload,
  };

  return [cover, mainDocument];
}

function EquipmentKHLCNTDetail({
  initialParent,
}: {
  initialParent: Doc;
}) {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const projectId =
    initialParent.projectId ||
    initialParent.project?.id ||
    searchParams.get('project') ||
    undefined;
  const projectName =
    initialParent.project?.tenDuAn ||
    workflowFirstValue(initialParent.data || {}, 'TenDuAn', 'tenDuAn');
  const [children, setChildren] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<FormType | null>(null);
  const [draftStep, setDraftStep] =
    useState<KhlcntDraftStep>('COVER');
  const [ttData, setTtData] = useState<EquipmentKhlcntData>(() =>
    normalizeEquipmentKhlcntData(initialParent.data || {}),
  );
  const [qdData, setQdData] = useState<EquipmentKhlcntData>(() =>
    normalizeEquipmentKhlcntData(initialParent.data || {}),
  );
  const [selectedTTRef, setSelectedTTRef] = useState('');
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [delegateUserId, setDelegateUserId] = useState('');

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      setChildren(
        await api.getDocumentsByParent(initialParent.id),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải hồ sơ KHLCNT',
      );
    } finally {
      setLoading(false);
    }
  }, [initialParent.id]);

  useEffect(() => {
    fetchChildren();
    api
      .getUsers()
      .then((response: any) =>
        setUsers(
          Array.isArray(response) ? response : response?.users || [],
        ),
      )
      .catch(() => undefined);
  }, [fetchChildren]);

  const approvedTTs = children.filter(
    (document) =>
      document.type === 'TT_KHLCNT' &&
      document.status === 'APPROVED',
  );
  const hasActiveTT = children.some(
    (document) =>
      document.type === 'TT_KHLCNT' &&
      document.status !== 'REJECTED',
  );
  const hasQD = children.some(
    (document) => document.type === 'QD_KHLCNT',
  );
  const canApprove = user?.role === 'ADMIN' || user?.canApprove === true;

  const resetForms = () => {
    const inherited = normalizeEquipmentKhlcntData(
      initialParent.data || {},
    );
    inherited.TenDuAn = projectName || inherited.TenDuAn;
    setShowForm(null);
    setDraftStep('COVER');
    setEditingDoc(null);
    setSelectedTTRef('');
    setTtData(inherited);
    setQdData(inherited);
  };

  const openCreate = (type: FormType) => {
    resetForms();
    setDraftStep(type === 'TT_KHLCNT' ? 'COVER' : 'DOCUMENT');
    setShowForm(type);
  };

  const selectTTForDecision = (id: string) => {
    setSelectedTTRef(id);
    const proposal = approvedTTs.find((item) => item.id === id);
    if (!proposal?.data) return;

    const inherited = normalizeEquipmentKhlcntData(proposal.data);
    setQdData((current) => ({
      ...inherited,
      SoVanBan: current.SoVanBan,
      NgayBanHanh: current.NgayBanHanh || WORKFLOW_TODAY,
    }));
  };

  const startEditing = (document: Doc) => {
    const normalized = normalizeEquipmentKhlcntData(
      document.data || {},
    );
    setEditingDoc(document);
    setShowForm(document.type as FormType);
    setDraftStep('DOCUMENT');
    setSelectedTTRef(document.sourceDocumentId || '');
    if (document.type === 'TT_KHLCNT') setTtData(normalized);
    if (document.type === 'QD_KHLCNT') setQdData(normalized);
  };

  const validate = (
    type: FormType,
    data: EquipmentKhlcntData,
  ) => {
    if (!data.TenDuAn.trim()) {
      toast.error('Vui lòng nhập tên dự án');
      return false;
    }
    if (
      data.packages.length === 0 ||
      data.packages.some((item) => !item.tenGoiThau.trim())
    ) {
      toast.error('Vui lòng nhập tên cho tất cả gói thầu');
      return false;
    }
    if (type === 'QD_KHLCNT' && !selectedTTRef && !editingDoc) {
      toast.error('Vui lòng chọn Tờ trình KHLCNT đã duyệt');
      return false;
    }
    if (type === 'QD_KHLCNT' && !data.SoVanBan.trim()) {
      toast.error('Vui lòng nhập số Quyết định');
      return false;
    }
    return true;
  };

  const continueFromCover = () => {
    if (!projectName.trim()) {
      toast.error('Không tìm thấy tên dự án từ Quản lý dự án');
      return;
    }
    if (!ttData.NguoiSoanVanBan.trim()) {
      toast.error('Vui lòng nhập Người soạn văn bản');
      return;
    }
    if (!ttData.ThuTruongDonVi.trim()) {
      toast.error('Vui lòng nhập Thủ trưởng đơn vị');
      return;
    }
    if (
      ttData.packages.length === 0 ||
      ttData.packages.some((item) => !item.tenGoiThau.trim())
    ) {
      toast.error('Vui lòng nhập tên cho tất cả gói thầu');
      return;
    }
    setTtData((current) => ({ ...current, TenDuAn: projectName }));
    setDraftStep('DOCUMENT');
  };

  const saveDocument = async (type: FormType) => {
    const data = type === 'TT_KHLCNT' ? ttData : qdData;
    if (!validate(type, data)) return;

    setSubmitting(true);
    try {
      const payload = cleanEquipmentKhlcntData(data);
      if (editingDoc) {
        await api.resubmitDocument(editingDoc.id, payload);
        toast.success(
          editingDoc.status === 'REJECTED'
            ? 'Đã lưu và gửi lại văn bản'
            : 'Đã cập nhật văn bản đang chờ duyệt',
        );
      } else {
        await api.createDocument(
          type,
          payload,
          initialParent.id,
          undefined,
          projectId || undefined,
          type === 'QD_KHLCNT' ? selectedTTRef : undefined,
        );
        toast.success(`Đã tạo ${typeLabels[type]}`);
      }
      resetForms();
      await fetchChildren();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể lưu văn bản',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadBundle = async (id: string) => {
    try {
      const response = await api.downloadDocumentBundle(id);
      if (!response.ok) throw new Error('Không thể tải bộ hồ sơ');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'bo-ho-so-khlcnt.zip';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải bộ hồ sơ',
      );
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveDocument(id);
      toast.success('Đã phê duyệt');
      fetchChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể duyệt');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    try {
      await api.rejectDocument(id, rejectComment);
      toast.success('Đã yêu cầu làm lại');
      setRejectingId(null);
      setRejectComment('');
      fetchChildren();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể từ chối',
      );
    }
  };

  const handleDelegate = async () => {
    if (!delegateUserId) {
      toast.error('Vui lòng chọn nhân viên');
      return;
    }
    try {
      await api.delegateQDKHLCNT(initialParent.id, delegateUserId);
      toast.success('Đã ủy quyền tạo Quyết định KHLCNT');
      setDelegateUserId('');
      fetchChildren();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể ủy quyền',
      );
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await api.downloadDocument(id);
      if (!response.ok) throw new Error('Không thể tải văn bản');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'van-ban-khlcnt.docx';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải file');
    }
  };

  const handleDownloadCover = async (id: string) => {
    try {
      const response = await api.downloadDocumentCover(id);
      if (!response.ok) {
        throw new Error('Không thể tải Phiếu trình ký');
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'phieu-trinh-ky-khlcnt.docx';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải Phiếu trình ký',
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-4 2xl:space-y-6">
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs text-gray-400">
          Quyết định dự toán nguồn
        </p>
        <div className="mt-1 flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {workflowFirstValue(
                initialParent.data,
                'SoVanBan',
                'soVanBan',
                'SoQuyetDinh',
                'soQuyetDinh',
              ) || 'Quyết định dự toán'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {workflowFirstValue(
                initialParent.data,
                'TenDuAn',
                'tenDuAn',
              )}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Gói thầu:{' '}
              {workflowPackageNames(initialParent.data || {}) || '—'}
            </p>
          </div>
          {projectId && (
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Lịch sử
            </button>
          )}
        </div>
      </div>

      <WorkflowStageStepper
        stages={[
          {
            number: 1,
            label: 'Mẫu phiếu trình ký phê duyệt KHGDCBDT',
            description:
              'Nhập người soạn, thủ trưởng; kế thừa dự án và các gói thầu.',
            status:
              hasActiveTT ||
              (showForm === 'TT_KHLCNT' && draftStep === 'DOCUMENT')
                ? 'completed'
                : showForm === 'TT_KHLCNT' && draftStep === 'COVER'
                  ? 'active'
                  : 'pending',
          },
          {
            number: 2,
            label: 'Tờ trình KHLCNT',
            description: 'Nhập nội dung, căn cứ và các gói thầu.',
            status:
              approvedTTs.length > 0
                ? 'completed'
                : (showForm === 'TT_KHLCNT' &&
                      draftStep === 'DOCUMENT') ||
                    hasActiveTT
                  ? 'active'
                  : 'pending',
          },
          {
            number: 3,
            label: 'Quyết định KHLCNT',
            description: 'Kế thừa Tờ trình KHLCNT đã được duyệt.',
            status: hasQD
              ? 'completed'
              : showForm === 'QD_KHLCNT' || approvedTTs.length > 0
                ? 'active'
                : 'pending',
          },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {!hasActiveTT && !showForm && (
          <button
            type="button"
            onClick={() => openCreate('TT_KHLCNT')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Bắt đầu hồ sơ KHLCNT
          </button>
        )}
        {approvedTTs.length > 0 && !hasQD && !showForm && (
          <button
            type="button"
            onClick={() => openCreate('QD_KHLCNT')}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            + Quyết định KHLCNT
          </button>
        )}
        {approvedTTs.length === 0 && !hasQD && (
          <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-400">
            Quyết định KHLCNT cần Tờ trình đã duyệt
          </span>
        )}
      </div>

      {user?.role === 'ADMIN' && approvedTTs.length > 0 && !hasQD && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <label className="mb-2 block text-sm font-medium text-yellow-900">
            Ủy quyền tạo Quyết định KHLCNT
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={delegateUserId}
              onChange={(event) => setDelegateUserId(event.target.value)}
              className={`${WORKFLOW_INPUT_CLASS} flex-1 bg-white`}
            >
              <option value="">— Chọn nhân viên —</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.email})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDelegate}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
            >
              Ủy quyền
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div
            className={`rounded-t-2xl border-b px-4 py-4 sm:px-6 ${
              showForm === 'TT_KHLCNT' ? 'bg-blue-50' : 'bg-purple-50'
            }`}
          >
            <h2 className="font-semibold text-gray-900">
              {showForm === 'TT_KHLCNT' && draftStep === 'COVER'
                ? '1. Mẫu phiếu trình ký phê duyệt KHGDCBDT'
                : `${
                    editingDoc
                      ? editingDoc.status === 'REJECTED'
                        ? 'Sửa và gửi lại '
                        : 'Chỉnh sửa '
                      : 'Tạo '
                  }${
                    typeLabels[showForm]
                  }`}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {showForm === 'TT_KHLCNT' && draftStep === 'COVER'
                ? 'Hoàn thành đúng các trường của mẫu số 1 trước khi sang Tờ trình.'
                : 'Khung bên phải hiển thị PDF được chuyển trực tiếp từ DOCX mẫu.'}
            </p>
          </div>
          <div className="grid items-start gap-5 p-3 sm:p-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] 2xl:gap-6 2xl:p-6 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
            <div className="space-y-6">
              {showForm === 'QD_KHLCNT' && !editingDoc && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-blue-900">
                    Tờ trình KHLCNT đã duyệt
                  </label>
                  <select
                    value={selectedTTRef}
                    onChange={(event) =>
                      selectTTForDecision(event.target.value)
                    }
                    className={WORKFLOW_INPUT_CLASS}
                  >
                    <option value="">— Chọn văn bản nguồn —</option>
                    {approvedTTs.map((proposal) => (
                      <option key={proposal.id} value={proposal.id}>
                        {workflowFirstValue(
                          proposal.data,
                          'SoVanBan',
                          'SoToTrinh',
                          'soToTrinh',
                        ) || 'Tờ trình KHLCNT'}{' '}
                        — {workflowPackageNames(proposal.data || {})}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-blue-700">
                    Quyết định sẽ lưu liên kết chính xác tới Tờ trình này.
                  </p>
                </div>
              )}

              {showForm === 'TT_KHLCNT' && draftStep === 'COVER' ? (
                <KhlcntCoverForm
                  value={ttData}
                  onChange={setTtData}
                  projectName={projectName}
                />
              ) : (
                <EquipmentKhlcntForm
                  value={showForm === 'TT_KHLCNT' ? ttData : qdData}
                  onChange={
                    showForm === 'TT_KHLCNT' ? setTtData : setQdData
                  }
                  packagesReadOnly={showForm === 'QD_KHLCNT'}
                  projectName={projectName}
                />
              )}

              <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
                {showForm === 'TT_KHLCNT' &&
                  draftStep === 'DOCUMENT' &&
                  !editingDoc && (
                    <button
                      type="button"
                      onClick={() => setDraftStep('COVER')}
                      disabled={submitting}
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:mr-auto"
                    >
                      ← Quay lại mẫu số 1
                    </button>
                  )}
                <button
                  type="button"
                  onClick={resetForms}
                  disabled={submitting}
                  className="min-h-10 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    showForm === 'TT_KHLCNT' &&
                    draftStep === 'COVER'
                      ? continueFromCover()
                      : saveDocument(showForm)
                  }
                  disabled={submitting}
                  className={`min-h-10 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
                    showForm === 'TT_KHLCNT'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {showForm === 'TT_KHLCNT' &&
                  draftStep === 'COVER'
                    ? 'Tiếp tục: 2. Tờ trình KHLCNT'
                    : submitting
                    ? 'Đang lưu...'
                    : editingDoc
                      ? editingDoc.status === 'REJECTED'
                        ? 'Lưu và gửi lại'
                        : 'Lưu chỉnh sửa'
                      : 'Tạo và gửi duyệt'}
                </button>
              </div>
            </div>
            <WorkflowDocxPreview
              documents={khlcntDocxPreviewDocuments(
                showForm,
                showForm === 'TT_KHLCNT' ? ttData : qdData,
                draftStep,
              )}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <div className="border-b bg-gray-50 px-4 py-3">
          <h3 className="font-semibold text-gray-700">Hồ sơ KHLCNT</h3>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <table className="min-w-[900px] w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Số văn bản
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Các gói thầu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {children.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    Chưa có hồ sơ nào.
                  </td>
                </tr>
              )}
              {children.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {typeLabels[document.type] || document.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {workflowFirstValue(
                      document.data,
                      'SoVanBan',
                      'soVanBan',
                      'SoToTrinh',
                      'soToTrinh',
                      'SoQuyetDinh',
                      'soQuyetDinh',
                    ) || '—'}
                  </td>
                  <td className="max-w-[360px] px-4 py-3 text-sm text-gray-700">
                    {workflowPackageNames(document.data || {}) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        statusColors[document.status] ||
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {statusLabels[document.status] || document.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewDocId(document.id)}
                        className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700"
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(document.id)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                      >
                        DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCover(document.id)}
                        className="rounded bg-cyan-50 px-2 py-1 text-xs text-cyan-700"
                      >
                        Phiếu trình ký
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadBundle(document.id)
                        }
                        className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700"
                      >
                        Tải bộ hồ sơ
                      </button>
                      {canApprove &&
                        document.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(document.id)}
                              className="rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                            >
                              Duyệt
                            </button>
                            {rejectingId === document.id ? (
                              <span className="flex gap-1">
                                <input
                                  value={rejectComment}
                                  onChange={(event) =>
                                    setRejectComment(event.target.value)
                                  }
                                  placeholder="Lý do..."
                                  className="w-32 rounded border px-2 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleReject(document.id)}
                                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                                >
                                  Gửi
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRejectingId(document.id)}
                                className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                              >
                                Làm lại
                              </button>
                            )}
                          </>
                        )}
                      {document.status !== 'APPROVED' &&
                        (document.createdBy === user?.id ||
                          user?.role === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => startEditing(document)}
                            className="min-h-8 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200"
                          >
                            {document.status === 'REJECTED'
                              ? 'Sửa & gửi lại'
                              : 'Chỉnh sửa'}
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewDocId && (
        <OnlyOfficePreview
          documentId={previewDocId}
          onClose={() => setPreviewDocId(null)}
        />
      )}

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={projectId}
        stepKey="khlcnt"
        title="Lịch sử Kế hoạch lựa chọn nhà thầu"
      />

      {projectId && (
        <ProjectChat
          projectId={projectId}
          module="KHLCNT"
          projectName={workflowFirstValue(
            initialParent.data,
            'TenDuAn',
            'tenDuAn',
          )}
        />
      )}
    </div>
  );
}

function KhlcntCoverForm({
  value,
  onChange,
  projectName,
}: {
  value: EquipmentKhlcntData;
  onChange: (value: EquipmentKhlcntData) => void;
  projectName: string;
}) {
  return (
    <WorkflowFormSection
      title="1. Mẫu phiếu trình ký phê duyệt KHGDCBDT"
      description="Màn hình khớp đúng bốn placeholder của mẫu Word: TenDuAn, TenCacGoiThau, NguoiSoanVanBan và ThuTruongDonVi."
    >
      <div className="space-y-5">
        <WorkflowField label="Tên dự án (kế thừa từ Quản lý dự án)">
          <input
            value={projectName || value.TenDuAn}
            readOnly
            className={`${WORKFLOW_INPUT_CLASS} cursor-not-allowed bg-slate-100 font-medium text-slate-700`}
          />
        </WorkflowField>

        <div className="grid gap-4 md:grid-cols-2">
          <WorkflowField label="Người soạn văn bản">
            <input
              value={value.NguoiSoanVanBan}
              onChange={(event) =>
                onChange({
                  ...value,
                  TenDuAn: projectName || value.TenDuAn,
                  NguoiSoanVanBan: event.target.value,
                })
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <WorkflowField label="Thủ trưởng đơn vị">
            <input
              value={value.ThuTruongDonVi}
              onChange={(event) =>
                onChange({
                  ...value,
                  TenDuAn: projectName || value.TenDuAn,
                  ThuTruongDonVi: event.target.value,
                })
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Các gói thầu kế thừa từ Quyết định dự toán
          </p>
          <div className="mt-3 space-y-2">
            {value.packages.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {item.tenGoiThau || 'Chưa có tên gói thầu'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
          Các thông tin tại mẫu số 1 được giữ nguyên khi chuyển sang Tờ trình
          KHLCNT; tên dự án và tên gói thầu không phải nhập lại.
        </div>
      </div>
    </WorkflowFormSection>
  );
}

function EquipmentKhlcntForm({
  value,
  onChange,
  packagesReadOnly,
  projectName,
}: {
  value: EquipmentKhlcntData;
  onChange: (value: EquipmentKhlcntData) => void;
  packagesReadOnly: boolean;
  projectName: string;
}) {
  const setField = (
    key: Exclude<keyof EquipmentKhlcntData, 'canCu' | 'packages'>,
    fieldValue: string,
  ) => onChange({ ...value, [key]: fieldValue });

  const updatePackage = (
    index: number,
    patch: Partial<ProcurementPackage>,
  ) => {
    if (packagesReadOnly) return;
    onChange({
      ...value,
      packages: value.packages.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  };

  const removePackage = (index: number) => {
    if (packagesReadOnly) return;
    const next = value.packages.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    onChange({
      ...value,
      packages: next.length
        ? next
        : [emptyWorkflowPackage(workflowPackageId())],
    });
  };

  return (
    <>
      <WorkflowFormSection
        title="I. Mô tả tóm tắt dự án/Kế hoạch lựa chọn nhà thầu"
        description="Các trường dùng chung cho Phiếu trình ký, Tờ trình và Quyết định KHLCNT."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WorkflowField label="Số văn bản">
            <input
              value={value.SoVanBan}
              onChange={(event) =>
                setField('SoVanBan', event.target.value)
              }
              placeholder="Số tờ trình / số quyết định"
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <WorkflowField label="Ngày ban hành">
            <input
              type="date"
              value={value.NgayBanHanh}
              onChange={(event) =>
                setField('NgayBanHanh', event.target.value)
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <div className="md:col-span-2">
            <WorkflowField label="Tên dự án (liên kết từ Quản lý dự án)">
              <input
                value={projectName || value.TenDuAn}
                readOnly
                className={`${WORKFLOW_INPUT_CLASS} cursor-not-allowed bg-slate-100 font-medium text-slate-700`}
              />
            </WorkflowField>
          </div>
          <WorkflowField label="Người soạn văn bản">
            <input
              value={value.NguoiSoanVanBan}
              onChange={(event) =>
                setField('NguoiSoanVanBan', event.target.value)
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <WorkflowField label="Thủ trưởng đơn vị">
            <input
              value={value.ThuTruongDonVi}
              onChange={(event) =>
                setField('ThuTruongDonVi', event.target.value)
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <WorkflowField label="Tổng mức đầu tư">
            <input
              inputMode="decimal"
              value={value.TongMucDauTu}
              onChange={(event) => {
                const formatted = formatMoney(event.target.value);
                onChange({
                  ...value,
                  TongMucDauTu: formatted,
                  TongMucDauTuBangChu: formatted
                    ? numberToVietnameseWords(formatted)
                    : '',
                });
              }}
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <WorkflowField label="Tổng mức đầu tư bằng chữ (tự động)">
            <input
              value={value.TongMucDauTuBangChu}
              readOnly
              className={`${WORKFLOW_INPUT_CLASS} cursor-not-allowed bg-slate-100 text-slate-700`}
            />
          </WorkflowField>
          <WorkflowField label="Nguồn vốn">
            <input
              value={value.NguonVon}
              onChange={(event) =>
                setField('NguonVon', event.target.value)
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <WorkflowField label="Năm thực hiện">
            <input
              value={value.NamThucHien}
              onChange={(event) =>
                setField('NamThucHien', event.target.value)
              }
              className={WORKFLOW_INPUT_CLASS}
            />
          </WorkflowField>
          <div className="md:col-span-2">
            <WorkflowField label="Địa điểm đầu tư">
              <input
                value={value.DiaDiemDauTu}
                onChange={(event) =>
                  setField('DiaDiemDauTu', event.target.value)
                }
                className={WORKFLOW_INPUT_CLASS}
              />
            </WorkflowField>
          </div>
        </div>
      </WorkflowFormSection>

      <WorkflowFormSection
        title="II. Căn cứ pháp lý"
        description="Mỗi căn cứ sẽ được xuất thành một paragraph riêng tại {{CanCu}}."
      >
        <LegalBasisField
          label="Danh sách căn cứ"
          value={value.canCu as LegalBasisSelection[]}
          onChange={(canCu) => onChange({ ...value, canCu })}
        />
      </WorkflowFormSection>

      <WorkflowFormSection
        title="III. Nội dung kế hoạch lựa chọn nhà thầu"
        description="Mỗi gói thầu tương ứng một dòng trong bảng phụ lục của mẫu Word."
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Phụ lục các gói thầu
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {packagesReadOnly
                ? 'Dữ liệu được khóa theo Tờ trình KHLCNT đã duyệt.'
                : 'Điền đủ các cột của mẫu KHLCNT; tiền được giữ ở dạng chuỗi.'}
            </p>
          </div>
          {!packagesReadOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  packages: [
                    ...value.packages,
                    emptyWorkflowPackage(workflowPackageId()),
                  ],
                })
              }
              className="rounded-lg border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              + Thêm gói
            </button>
          )}
        </div>
        <div className="space-y-4">
          {value.packages.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Gói thầu {index + 1}
                </span>
                {!packagesReadOnly && (
                  <button
                    type="button"
                    onClick={() => removePackage(index)}
                    className="text-xs font-medium text-red-600"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <PackageInput
                  label="Tên gói thầu"
                  value={item.tenGoiThau}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, { tenGoiThau: fieldValue })
                  }
                />
                <PackageInput
                  label="Giá dự toán gói thầu"
                  value={item.giaDuToanGoiThau}
                  disabled={packagesReadOnly}
                  inputMode="decimal"
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      giaDuToanGoiThau: formatMoney(fieldValue),
                    })
                  }
                />
                <PackageInput
                  label="Nguồn vốn"
                  value={item.nguonVon}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, { nguonVon: fieldValue })
                  }
                />
                <PackageInput
                  label="Công việc"
                  value={item.congViec}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, { congViec: fieldValue })
                  }
                />
                <PackageInput
                  label="Hình thức lựa chọn nhà thầu"
                  value={item.hinhThucLuaChonNhaThau}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      hinhThucLuaChonNhaThau: fieldValue,
                    })
                  }
                />
                <PackageInput
                  label="Phương thức lựa chọn"
                  value={item.phuongThucLuaChonNhaThau}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      phuongThucLuaChonNhaThau: fieldValue,
                    })
                  }
                />
                <PackageInput
                  label="Thời gian tổ chức lựa chọn"
                  value={item.thoiGianToChucLuaChonNhaThau}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      thoiGianToChucLuaChonNhaThau: fieldValue,
                    })
                  }
                />
                <PackageInput
                  label="Thời gian bắt đầu tổ chức"
                  value={item.thoiGianBatDauToChucLuaChonNhaThau}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      thoiGianBatDauToChucLuaChonNhaThau: fieldValue,
                    })
                  }
                />
                <PackageInput
                  label="Loại hợp đồng"
                  value={item.loaiHopDong}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, { loaiHopDong: fieldValue })
                  }
                />
                <PackageInput
                  label="Thời gian thực hiện gói thầu"
                  value={item.thoiGianThucHienGoiThau}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      thoiGianThucHienGoiThau: fieldValue,
                    })
                  }
                />
                <PackageInput
                  label="Tùy chọn mua thêm"
                  value={item.tuyChonMuaThem}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, {
                      tuyChonMuaThem: fieldValue,
                    })
                  }
                />
                <PackageInput
                  label="Ghi chú"
                  value={item.ghiChu}
                  disabled={packagesReadOnly}
                  onChange={(fieldValue) =>
                    updatePackage(index, { ghiChu: fieldValue })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </WorkflowFormSection>
    </>
  );
}

function PackageInput({
  label,
  value,
  onChange,
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  inputMode?: 'decimal';
}) {
  return (
    <WorkflowField label={label}>
      <input
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className={`${WORKFLOW_INPUT_CLASS} disabled:bg-gray-100 disabled:text-gray-600`}
      />
    </WorkflowField>
  );
}

function WorkflowField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function KHLCNTDetailPageInner() {
  const params = useParams();
  const parentId = params.parentId as string;
  const [parent, setParent] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getDocument(parentId)
      .then((document) => {
        if (!cancelled) setParent(document);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Không thể tải Quyết định dự toán',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (!parent || error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || 'Không tìm thấy Quyết định dự toán'}
      </div>
    );
  }

  const procurementType =
    parent.procurementType || parent.project?.procurementType;
  if (procurementType === 'THAU_THIET_BI') {
    return <EquipmentKHLCNTDetail initialParent={parent} />;
  }

  return <LegacyKHLCNTDetailPageInner />;
}

export default function KHLCNTDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <KHLCNTDetailPageInner />
    </Suspense>
  );
}
