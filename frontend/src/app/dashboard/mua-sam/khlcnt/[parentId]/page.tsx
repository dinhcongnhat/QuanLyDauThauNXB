'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Document as Doc, DocStatus, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import { LibraryPicker } from '@/components/LibraryPicker';
import { SavedValue } from '@/lib/document-library-types';
import { HistoryModal } from '@/components/HistoryModal';

const statusLabels: Record<DocStatus, string> = {
  DRAFT: 'Bản nháp', PENDING_HEAD: 'Chờ Trưởng phòng', PENDING_DIRECTOR: 'Chờ Giám đốc',
  APPROVED: 'Đã phê duyệt', REJECTED: 'Cần làm lại',
};
const statusColors: Record<DocStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PENDING_HEAD: 'bg-yellow-100 text-yellow-700',
  PENDING_DIRECTOR: 'bg-blue-100 text-blue-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};
const typeLabels: Record<string, string> = {
  TT_KHLCNT: 'Tờ trình KHLCNT', QD_KHLCNT: 'Quyết định KHLCNT',
};

type FormType = 'TT_KHLCNT' | 'QD_KHLCNT';

function KHLCNTDetailPageInner() {
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
  const [heads, setHeads] = useState<User[]>([]);
  const [directorsList, setDirectorsList] = useState<User[]>([]);
  const [selectedApprover, setSelectedApprover] = useState('');
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
    api.getUsers().then(setUsers).catch(() => {});
    api.getUsersByRole('HEAD_OF_DEPARTMENT').then(setHeads).catch(() => {});
    api.getUsersByRole('DIRECTOR').then(setDirectorsList).catch(() => {});
  }, [parentId]);

  const ttApproved = children.some(d => d.type === 'TT_KHLCNT' && d.status === 'APPROVED');
  const canCreateQD = ttApproved;
  const hasTT = children.some(d => d.type === 'TT_KHLCNT' && d.status !== 'REJECTED');
  const hasQD = children.some(d => d.type === 'QD_KHLCNT');
  const isHead = user?.role === 'HEAD_OF_DEPARTMENT' || user?.role === 'ADMIN';
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  const isInvestor = user?.role === 'INVESTOR';

  // Approved children for linking
  const approvedTTs = children.filter(d => d.type === 'TT_KHLCNT' && d.status === 'APPROVED');

  const handleLibraryTT = (val: SavedValue) => {
    setTtData(prev => ({ ...prev, ...val.duLieu }));
  };

  const handleLibraryQD = (val: SavedValue) => {
    setQdData(prev => ({ ...prev, ...val.duLieu }));
  };

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
    if (!selectedApprover) { toast.error('Vui lòng chọn người duyệt'); return; }
    const dataMap = { TT_KHLCNT: ttData, QD_KHLCNT: qdData };
    try {
      await api.createDocument(type, dataMap[type], parentId, selectedApprover, projectId);
      toast.success(`Tạo ${typeLabels[type]} thành công`);
      setShowForm(null);
      setSelectedApprover('');
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
      toast.success('Đã gửi lại');
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

  const investors = users.filter(u => u.role === 'INVESTOR');
  const activeProjectId = projectId || parent?.projectId;

  return (
    <div className="space-y-6">
      {/* Parent info */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="flex items-center justify-between">
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
        {(isInvestor || user?.role === 'ADMIN') && !hasTT && (
          <button onClick={() => setShowForm('TT_KHLCNT')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + Tờ trình KHLCNT
          </button>
        )}
        {canCreateQD && !hasQD && (isHead || (isInvestor && delegationReview)) && (
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
      {isHead && canCreateQD && !hasQD && (
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm font-medium text-yellow-800 mb-2">Ủy quyền tạo QĐ KHLCNT cho nhân viên</p>
          <div className="flex gap-2 items-center">
            <select value={delegateUserId} onChange={e => setDelegateUserId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1">
              <option value="">-- Chọn nhân viên --</option>
              {investors.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
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
            <LibraryPicker
              libraryType="THONG_TIN_TO_CHUC" onSelect={handleLibraryTT} onSaveToLibrary={() => {}}
            />
          </div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Thông tin chung</h4>
          <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-3 gap-2">
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
          <div className="flex gap-2 mt-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Chọn người duyệt</label>
              <select className="inp w-full" value={selectedApprover} onChange={e => setSelectedApprover(e.target.value)}>
                <option value="">-- Chọn người duyệt --</option>
                {heads.map(h => <option key={h.id} value={h.id}>{h.name} ({h.email})</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <button onClick={() => handleCreate('TT_KHLCNT')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Tạo & Gửi</button>
              <button onClick={() => setShowForm(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg">Hủy</button>
            </div>
          </div>
        </div>
      )}



      {showForm === 'QD_KHLCNT' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tạo Quyết định phê duyệt KHLCNT (Mẫu 02C)</h3>
            <LibraryPicker
              libraryType="THONG_TIN_TO_CHUC" onSelect={handleLibraryQD} onSaveToLibrary={() => {}}
            />
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-3 gap-2">
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

          <div className="flex gap-2 mt-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Chọn người duyệt (Giám đốc)</label>
              <select className="inp w-full" value={selectedApprover} onChange={e => setSelectedApprover(e.target.value)}>
                <option value="">-- Chọn Giám đốc duyệt --</option>
                {directorsList.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <button onClick={() => handleCreate('QD_KHLCNT')} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Tạo & Gửi</button>
              <button onClick={() => setShowForm(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Children documents list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">Hồ sơ KHLCNT</h3>
        </div>
        <table className="w-full">
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
              const canApproveThis = (
                (doc.status === 'PENDING_HEAD' && isHead) ||
                (doc.status === 'PENDING_DIRECTOR' && isDirector)
              );
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
                      {doc.status === 'REJECTED' && doc.createdBy === user?.id && (
                        <>
                          <button onClick={() => startEditing(doc)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">✏️ Sửa</button>
                          <button onClick={() => handleResubmit(doc)} className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">📤 Gửi lại</button>
                        </>
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

      {/* Edit rejected doc modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingDoc(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">✏️ Sửa {typeLabels[editingDoc.type] || editingDoc.type}</h3>
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
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setEditingDoc(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Hủy</button>
              <button onClick={() => { const doc = children.find(d => d.id === editingDoc.id); if (doc) handleResubmit(doc); }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                💾 Lưu & Gửi lại duyệt
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
    </div>
  );
}

export default function KHLCNTDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <KHLCNTDetailPageInner />
    </Suspense>
  );
}
