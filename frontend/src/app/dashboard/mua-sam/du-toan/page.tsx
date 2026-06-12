'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Document as Doc, DocType, DocStatus, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import { SmartFormField, FieldDef } from '@/components/SmartFormField';

// ===== TT_DUTOAN Field Definitions =====
const TT_CHUNG: FieldDef[] = [
  { key: 'SoToTrinh', label: 'Số tờ trình' },
  { key: 'DiaDanh', label: 'Địa danh' },
  { key: 'Ngay', label: 'Ngày', type: 'date' },
  { key: 'Thang', label: 'Tháng' },
  { key: 'Nam', label: 'Năm' },
  { key: 'ChuDauTu', label: 'Chủ đầu tư' },
  { key: 'TenDuAn', label: 'Tên dự án' },
  { key: 'TenGoiThau', label: 'Tên gói thầu *' },
  { key: 'DonViTrinh', label: 'Đơn vị trình' },
  { key: 'DonViMuaSam', label: 'Đơn vị mua sắm' },
  { key: 'PhongBanThuocDonViTrinh', label: 'Phòng ban thuộc đơn vị trình' },
  { key: 'VietTatPhongBanThuocDonViTrinh', label: 'Viết tắt phòng ban' },
  { key: 'NguonVon', label: 'Nguồn vốn' },
  { key: 'DiaDiemThucHien', label: 'Địa điểm thực hiện' },
  { key: 'ThoiGianThucHien', label: 'Thời gian thực hiện' },
  { key: 'TenCacVanBanPhapLyLienQuan', label: 'Tên các văn bản pháp lý liên quan', type: 'textarea' },
];
const TT_CP1: FieldDef[] = [
  { key: 'KyHieuChiPhi1', label: 'Ký hiệu chi phí 1' },
  { key: 'NoiDungChiPhi1', label: 'Nội dung chi phí 1' },
  { key: 'GiaTriTruocThue1', label: 'Giá trị trước thuế 1', type: 'money' },
  { key: 'ThueGTGT1', label: 'Thuế GTGT 1', type: 'money' },
  { key: 'GiaTriSauThue1', label: 'Giá trị sau thuế 1', type: 'money' },
  { key: 'GhiChu1', label: 'Ghi chú 1' },
  { key: 'ChiPhi1BangSo', label: 'Chi phí 1 bằng số', type: 'money' },
  { key: 'ChiPhi1BangChu', label: 'Chi phí 1 bằng chữ', type: 'money-words' },
];
const TT_CP2: FieldDef[] = [
  { key: 'NoiDungChiPhi2', label: 'Nội dung chi phí 2' },
  { key: 'GiaTriTruocThue2', label: 'Giá trị trước thuế 2', type: 'money' },
  { key: 'ThueGTGT2', label: 'Thuế GTGT 2', type: 'money' },
  { key: 'GiaTriSauThue2', label: 'Giá trị sau thuế 2', type: 'money' },
  { key: 'GhiChu2', label: 'Ghi chú 2' },
  { key: 'ChiPhi2BangSo', label: 'Chi phí 2 bằng số', type: 'money' },
  { key: 'ChiPhi2BangChu', label: 'Chi phí 2 bằng chữ', type: 'money-words' },
];
const TT_TONGHOP: FieldDef[] = [
  { key: 'DuToanBangSo', label: 'Dự toán bằng số', type: 'money' },
  { key: 'DuToanBangChu', label: 'Dự toán bằng chữ', type: 'money-words' },
  { key: 'CacPhongBanLienQuan', label: 'Các phòng ban liên quan' },
  { key: 'CacNoiDungKhac', label: 'Các nội dung khác', type: 'textarea' },
];

// ===== QD_DUTOAN Field Definitions =====
const QD_CHUNG: FieldDef[] = [
  { key: 'SoQuyetDinh', label: 'Số quyết định' },
  { key: 'SoToTrinh', label: 'Số tờ trình liên kết' },
  { key: 'DiaDanh', label: 'Địa danh' },
  { key: 'Ngay', label: 'Ngày', type: 'date' },
  { key: 'Thang', label: 'Tháng' },
  { key: 'Nam', label: 'Năm' },
  { key: 'ChuDauTu', label: 'Chủ đầu tư' },
  { key: 'VietTatChuDauTu', label: 'Viết tắt chủ đầu tư' },
  { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
  { key: 'TenGoiThau', label: 'Tên gói thầu' },
  { key: 'DonViMuaSam', label: 'Đơn vị mua sắm' },
  { key: 'PhongBanThuocDonViTrinh', label: 'Phòng ban thuộc đơn vị trình' },
  { key: 'VietTatPhongBanThuocDonViTrinh', label: 'Viết tắt phòng ban' },
  { key: 'PhongBanChuTriThuocDonViTrinh', label: 'Phòng ban chủ trì thuộc đơn vị trình' },
  { key: 'DaiDienCacPhongBanLienQuan', label: 'Đại diện các phòng ban liên quan' },
  { key: 'NguonVon', label: 'Nguồn vốn' },
  { key: 'DiaDiemThucHien', label: 'Địa điểm thực hiện' },
  { key: 'ThoiGianThucHien', label: 'Thời gian thực hiện' },
  { key: 'TenCacVanBanPhapLyLienQuan', label: 'Tên các văn bản pháp lý liên quan', type: 'textarea' },
];
const QD_CP1: FieldDef[] = [
  { key: 'KyHieuChiPhi1', label: 'Ký hiệu chi phí 1' },
  { key: 'NoiDungChiPhi1', label: 'Nội dung chi phí 1' },
  { key: 'GiaTriTruocThue1', label: 'Giá trị trước thuế 1', type: 'money' },
  { key: 'ThueGTGT1', label: 'Thuế GTGT 1', type: 'money' },
  { key: 'GiaTriSauThue1', label: 'Giá trị sau thuế 1', type: 'money' },
  { key: 'GhiChu1', label: 'Ghi chú 1' },
];
const QD_CP2: FieldDef[] = [
  { key: 'NoiDungChiPhi2', label: 'Nội dung chi phí 2' },
  { key: 'GiaTriTruocThue2', label: 'Giá trị trước thuế 2', type: 'money' },
  { key: 'ThueGTGT2', label: 'Thuế GTGT 2', type: 'money' },
  { key: 'GiaTriSauThue2', label: 'Giá trị sau thuế 2', type: 'money' },
  { key: 'GhiChu2', label: 'Ghi chú 2' },
];
const QD_TONGHOP: FieldDef[] = [
  { key: 'DuToanBangSo', label: 'Dự toán bằng số', type: 'money' },
  { key: 'DuToanBangChu', label: 'Dự toán bằng chữ', type: 'money-words' },
];

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

type FormType = 'TT_DUTOAN' | 'QD_DUTOAN';

export default function DuToanPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<FormType | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // For QD: select which approved TT to link from
  const [selectedTTId, setSelectedTTId] = useState('');

  // TT form state – matches FileMau/DuToan/Tờ trình placeholders
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

  // QD form state – matches FileMau/DuToan/Quyết định placeholders
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

  const fetchDocs = async () => {
    try {
      const data = await api.getDocumentsByType(['TT_DUTOAN', 'QD_DUTOAN']);
      setDocs(Array.isArray(data) ? data : ((data as any)?.documents || []));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Approved TT docs available for QD linking
  const approvedTTs = docs.filter(d => d.type === 'TT_DUTOAN' && d.status === 'APPROVED');
  const hasApprovedTT = approvedTTs.length > 0;

  // When user selects a TT to link, auto-populate QD fields
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
      await api.createDocument('TT_DUTOAN', ttData, undefined, undefined);
      toast.success('Đã tạo Tờ trình dự toán và gửi duyệt');
      resetForm();
      fetchDocs();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleCreateQD = async () => {
    if (!selectedTTId) { toast.error('Vui lòng chọn Tờ trình dự toán để liên kết'); return; }
    setSubmitting(true);
    try {
      await api.createDocument('QD_DUTOAN', qdData, undefined, undefined);
      toast.success('Đã tạo Quyết định dự toán và gửi duyệt');
      resetForm();
      fetchDocs();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveDocument(id);
      toast.success('Đã phê duyệt');
      fetchDocs();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) { toast.error('Vui lòng nhập bình luận'); return; }
    try {
      await api.rejectDocument(id, rejectComment);
      toast.success('Đã yêu cầu làm lại');
      setRejectingId(null);
      setRejectComment('');
      fetchDocs();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResubmit = async (doc: Doc) => {
    try {
      await api.resubmitDocument(doc.id, editingDoc?.data || doc.data);
      toast.success('Đã gửi lại');
      setEditingDoc(null);
      fetchDocs();
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

  const canApprove = user?.role === 'ADMIN' || user?.canApprove === true;
  const canCreate = user?.role === 'ADMIN' || user?.role === 'USER';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phê duyệt dự toán</h1>
          <p className="text-gray-500 mt-1">Tạo và quản lý Tờ trình & Quyết định phê duyệt dự toán</p>
        </div>
        {canCreate && !showForm && (
          <div className="flex gap-2">
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
                title="Cần có Tờ trình dự toán được duyệt trước">
                🔒 Quyết định dự toán
              </span>
            )}
          </div>
        )}
      </div>

      {/* ===== TT_DUTOAN FORM ===== */}
      {showForm === 'TT_DUTOAN' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b">
            <h3 className="text-lg font-semibold text-blue-900">Tạo Tờ trình phê duyệt dự toán</h3>
          </div>
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Thông tin chung</h4>
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
              <input className="inp" placeholder="Phòng ban thuộc đơn vị trình" value={ttData.PhongBanThuocDonViTrinh} onChange={e => setTtData({...ttData, PhongBanThuocDonViTrinh: e.target.value})} />
              <input className="inp" placeholder="Viết tắt phòng ban" value={ttData.VietTatPhongBanThuocDonViTrinh} onChange={e => setTtData({...ttData, VietTatPhongBanThuocDonViTrinh: e.target.value})} />
              <input className="inp col-span-2" placeholder="Nguồn vốn" value={ttData.NguonVon} onChange={e => setTtData({...ttData, NguonVon: e.target.value})} />
              <input className="inp" placeholder="Địa điểm thực hiện" value={ttData.DiaDiemThucHien} onChange={e => setTtData({...ttData, DiaDiemThucHien: e.target.value})} />
              <input className="inp" placeholder="Thời gian thực hiện" value={ttData.ThoiGianThucHien} onChange={e => setTtData({...ttData, ThoiGianThucHien: e.target.value})} />
              <textarea className="inp col-span-2 min-h-[60px]" placeholder="Tên các văn bản pháp lý liên quan" value={ttData.TenCacVanBanPhapLyLienQuan} onChange={e => setTtData({...ttData, TenCacVanBanPhapLyLienQuan: e.target.value})} />
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Chi phí 1</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Ký hiệu chi phí 1" value={ttData.KyHieuChiPhi1} onChange={e => setTtData({...ttData, KyHieuChiPhi1: e.target.value})} />
              <input className="inp" placeholder="Nội dung chi phí 1" value={ttData.NoiDungChiPhi1} onChange={e => setTtData({...ttData, NoiDungChiPhi1: e.target.value})} />
              <input className="inp" placeholder="Giá trị trước thuế 1" value={ttData.GiaTriTruocThue1} onChange={e => setTtData({...ttData, GiaTriTruocThue1: e.target.value})} />
              <input className="inp" placeholder="Thuế GTGT 1" value={ttData.ThueGTGT1} onChange={e => setTtData({...ttData, ThueGTGT1: e.target.value})} />
              <input className="inp" placeholder="Giá trị sau thuế 1" value={ttData.GiaTriSauThue1} onChange={e => setTtData({...ttData, GiaTriSauThue1: e.target.value})} />
              <input className="inp" placeholder="Ghi chú 1" value={ttData.GhiChu1} onChange={e => setTtData({...ttData, GhiChu1: e.target.value})} />
              <input className="inp" placeholder="Chi phí 1 bằng số" value={ttData.ChiPhi1BangSo} onChange={e => setTtData({...ttData, ChiPhi1BangSo: e.target.value})} />
              <input className="inp" placeholder="Chi phí 1 bằng chữ" value={ttData.ChiPhi1BangChu} onChange={e => setTtData({...ttData, ChiPhi1BangChu: e.target.value})} />
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Chi phí 2</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Nội dung chi phí 2" value={ttData.NoiDungChiPhi2} onChange={e => setTtData({...ttData, NoiDungChiPhi2: e.target.value})} />
              <input className="inp" placeholder="Giá trị trước thuế 2" value={ttData.GiaTriTruocThue2} onChange={e => setTtData({...ttData, GiaTriTruocThue2: e.target.value})} />
              <input className="inp" placeholder="Thuế GTGT 2" value={ttData.ThueGTGT2} onChange={e => setTtData({...ttData, ThueGTGT2: e.target.value})} />
              <input className="inp" placeholder="Giá trị sau thuế 2" value={ttData.GiaTriSauThue2} onChange={e => setTtData({...ttData, GiaTriSauThue2: e.target.value})} />
              <input className="inp" placeholder="Ghi chú 2" value={ttData.GhiChu2} onChange={e => setTtData({...ttData, GhiChu2: e.target.value})} />
              <input className="inp" placeholder="Chi phí 2 bằng số" value={ttData.ChiPhi2BangSo} onChange={e => setTtData({...ttData, ChiPhi2BangSo: e.target.value})} />
              <input className="inp" placeholder="Chi phí 2 bằng chữ" value={ttData.ChiPhi2BangChu} onChange={e => setTtData({...ttData, ChiPhi2BangChu: e.target.value})} />
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Tổng hợp</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Dự toán bằng số" value={ttData.DuToanBangSo} onChange={e => setTtData({...ttData, DuToanBangSo: e.target.value})} />
              <input className="inp" placeholder="Dự toán bằng chữ" value={ttData.DuToanBangChu} onChange={e => setTtData({...ttData, DuToanBangChu: e.target.value})} />
              <input className="inp" placeholder="Các phòng ban liên quan" value={ttData.CacPhongBanLienQuan} onChange={e => setTtData({...ttData, CacPhongBanLienQuan: e.target.value})} />
              <textarea className="inp min-h-[60px]" placeholder="Các nội dung khác" value={ttData.CacNoiDungKhac} onChange={e => setTtData({...ttData, CacNoiDungKhac: e.target.value})} />
            </div>

            {/* Director selection */}
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Hủy</button>
              <button onClick={handleCreateTT} disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {submitting ? 'Đang gửi...' : 'Tạo & Gửi duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QD_DUTOAN FORM ===== */}
      {showForm === 'QD_DUTOAN' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-purple-50 border-b">
            <h3 className="text-lg font-semibold text-purple-900">Tạo Quyết định phê duyệt dự toán</h3>
          </div>
          <div className="p-6">
            {/* Link from approved TT */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-800 mb-2">Liên kết từ Tờ trình dự toán đã duyệt</label>
              <select className="inp w-full" value={selectedTTId} onChange={e => handleSelectTT(e.target.value)}>
                <option value="">-- Chọn Tờ trình đã duyệt --</option>
                {approvedTTs.map(tt => (
                  <option key={tt.id} value={tt.id}>
                    {tt.data?.SoToTrinh ? `${tt.data.SoToTrinh} - ` : ''}{tt.data?.TenGoiThau || 'Tờ trình dự toán'} ({tt.data?.DuToanBangSo || ''})
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-600 mt-1">Các trường trùng lặp sẽ được tự động điền từ Tờ trình</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Số quyết định" value={qdData.SoQuyetDinh} onChange={e => setQdData({...qdData, SoQuyetDinh: e.target.value})} />
              <input className="inp" placeholder="Số tờ trình liên kết" value={qdData.SoToTrinh} onChange={e => setQdData({...qdData, SoToTrinh: e.target.value})} />
              <input className="inp" placeholder="Địa danh" value={qdData.DiaDanh} onChange={e => setQdData({...qdData, DiaDanh: e.target.value})} />
              <input className="inp" placeholder="Ngày" value={qdData.Ngay} onChange={e => setQdData({...qdData, Ngay: e.target.value})} />
              <input className="inp" placeholder="Tháng" value={qdData.Thang} onChange={e => setQdData({...qdData, Thang: e.target.value})} />
              <input className="inp" placeholder="Năm" value={qdData.Nam} onChange={e => setQdData({...qdData, Nam: e.target.value})} />
              <input className="inp" placeholder="Chủ đầu tư" value={qdData.ChuDauTu} onChange={e => setQdData({...qdData, ChuDauTu: e.target.value})} />
              <input className="inp" placeholder="Viết tắt chủ đầu tư" value={qdData.VietTatChuDauTu} onChange={e => setQdData({...qdData, VietTatChuDauTu: e.target.value})} />
              <input className="inp" placeholder="Đại diện chủ đầu tư" value={qdData.DaiDienChuDauTu} onChange={e => setQdData({...qdData, DaiDienChuDauTu: e.target.value})} />
              <input className="inp" placeholder="Tên gói thầu" value={qdData.TenGoiThau} onChange={e => setQdData({...qdData, TenGoiThau: e.target.value})} />
              <input className="inp" placeholder="Đơn vị mua sắm" value={qdData.DonViMuaSam} onChange={e => setQdData({...qdData, DonViMuaSam: e.target.value})} />
              <input className="inp" placeholder="Phòng ban thuộc đơn vị trình" value={qdData.PhongBanThuocDonViTrinh} onChange={e => setQdData({...qdData, PhongBanThuocDonViTrinh: e.target.value})} />
              <input className="inp" placeholder="Viết tắt phòng ban" value={qdData.VietTatPhongBanThuocDonViTrinh} onChange={e => setQdData({...qdData, VietTatPhongBanThuocDonViTrinh: e.target.value})} />
              <input className="inp" placeholder="Phòng ban chủ trì thuộc đơn vị trình" value={qdData.PhongBanChuTriThuocDonViTrinh} onChange={e => setQdData({...qdData, PhongBanChuTriThuocDonViTrinh: e.target.value})} />
              <input className="inp" placeholder="Đại diện các phòng ban liên quan" value={qdData.DaiDienCacPhongBanLienQuan} onChange={e => setQdData({...qdData, DaiDienCacPhongBanLienQuan: e.target.value})} />
              <input className="inp col-span-2" placeholder="Nguồn vốn" value={qdData.NguonVon} onChange={e => setQdData({...qdData, NguonVon: e.target.value})} />
              <input className="inp" placeholder="Địa điểm thực hiện" value={qdData.DiaDiemThucHien} onChange={e => setQdData({...qdData, DiaDiemThucHien: e.target.value})} />
              <input className="inp" placeholder="Thời gian thực hiện" value={qdData.ThoiGianThucHien} onChange={e => setQdData({...qdData, ThoiGianThucHien: e.target.value})} />
              <textarea className="inp col-span-2 min-h-[60px]" placeholder="Tên các văn bản pháp lý liên quan" value={qdData.TenCacVanBanPhapLyLienQuan} onChange={e => setQdData({...qdData, TenCacVanBanPhapLyLienQuan: e.target.value})} />
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Chi phí 1</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Ký hiệu chi phí 1" value={qdData.KyHieuChiPhi1} onChange={e => setQdData({...qdData, KyHieuChiPhi1: e.target.value})} />
              <input className="inp" placeholder="Nội dung chi phí 1" value={qdData.NoiDungChiPhi1} onChange={e => setQdData({...qdData, NoiDungChiPhi1: e.target.value})} />
              <input className="inp" placeholder="Giá trị trước thuế 1" value={qdData.GiaTriTruocThue1} onChange={e => setQdData({...qdData, GiaTriTruocThue1: e.target.value})} />
              <input className="inp" placeholder="Thuế GTGT 1" value={qdData.ThueGTGT1} onChange={e => setQdData({...qdData, ThueGTGT1: e.target.value})} />
              <input className="inp" placeholder="Giá trị sau thuế 1" value={qdData.GiaTriSauThue1} onChange={e => setQdData({...qdData, GiaTriSauThue1: e.target.value})} />
              <input className="inp" placeholder="Ghi chú 1" value={qdData.GhiChu1} onChange={e => setQdData({...qdData, GhiChu1: e.target.value})} />
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Chi phí 2</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Nội dung chi phí 2" value={qdData.NoiDungChiPhi2} onChange={e => setQdData({...qdData, NoiDungChiPhi2: e.target.value})} />
              <input className="inp" placeholder="Giá trị trước thuế 2" value={qdData.GiaTriTruocThue2} onChange={e => setQdData({...qdData, GiaTriTruocThue2: e.target.value})} />
              <input className="inp" placeholder="Thuế GTGT 2" value={qdData.ThueGTGT2} onChange={e => setQdData({...qdData, ThueGTGT2: e.target.value})} />
              <input className="inp" placeholder="Giá trị sau thuế 2" value={qdData.GiaTriSauThue2} onChange={e => setQdData({...qdData, GiaTriSauThue2: e.target.value})} />
              <input className="inp" placeholder="Ghi chú 2" value={qdData.GhiChu2} onChange={e => setQdData({...qdData, GhiChu2: e.target.value})} />
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Tổng hợp</h4>
            <div className="grid grid-cols-2 gap-4">
              <input className="inp" placeholder="Dự toán bằng số" value={qdData.DuToanBangSo} onChange={e => setQdData({...qdData, DuToanBangSo: e.target.value})} />
              <input className="inp" placeholder="Dự toán bằng chữ" value={qdData.DuToanBangChu} onChange={e => setQdData({...qdData, DuToanBangChu: e.target.value})} />
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Hủy</button>
              <button onClick={handleCreateQD} disabled={submitting}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium">
                {submitting ? 'Đang gửi...' : 'Tạo & Gửi duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <input type="text" placeholder="Tìm kiếm theo tên dự án, số tờ trình, số quyết định, cơ quan, người tạo..."
          className="w-full px-4 py-2.5 pl-10 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông tin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gửi tới</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.filter(doc => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const fields = [
                doc.data?.TenDuAn, doc.data?.SoToTrinh, doc.data?.SoQuyetDinh,
                doc.data?.ChuDauTu, doc.data?.TenGoiThau, doc.data?.DonViMuaSam,
                doc.creator?.name, (doc as any).assignee?.name,
                statusLabels[doc.status], typeLabels[doc.type],
              ].filter(Boolean);
              return fields.some(f => String(f).toLowerCase().includes(q));
            }).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có tài liệu nào'}</td></tr>
            )}
            {docs.filter(doc => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const fields = [
                doc.data?.TenDuAn, doc.data?.SoToTrinh, doc.data?.SoQuyetDinh,
                doc.data?.ChuDauTu, doc.data?.TenGoiThau, doc.data?.DonViMuaSam,
                doc.creator?.name, (doc as any).assignee?.name,
                statusLabels[doc.status], typeLabels[doc.type],
              ].filter(Boolean);
              return fields.some(f => String(f).toLowerCase().includes(q));
            }).map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetailDoc(doc)}>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${doc.type === 'TT_DUTOAN' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {typeLabels[doc.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {doc.data?.TenGoiThau || doc.data?.SoToTrinh || doc.data?.SoQuyetDinh || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{doc.creator.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{(doc as any).assignee?.name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[doc.status]}`}>
                    {statusLabels[doc.status]}
                  </span>
                  {doc.reviews?.[0]?.action === 'REJECT' && doc.reviews[0].comment && (
                    <p className="text-xs text-red-500 mt-1">💬 {doc.reviews[0].comment}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => handleDownload(doc.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥 DOCX</button>
                    <button onClick={() => setPreviewDocId(doc.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem</button>
                    {canApprove && doc.status === 'PENDING_APPROVAL' && (
                      <>
                        <button onClick={() => handleApprove(doc.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">✅ Duyệt</button>
                        {rejectingId === doc.id ? (
                          <div className="flex gap-1 items-center">
                            <input className="text-xs border rounded px-2 py-1 w-40" placeholder="Lý do..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
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
                        <button onClick={() => setEditingDoc({...doc, data: {...doc.data}})} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">✏️ Sửa</button>
                        <button onClick={() => handleResubmit(doc)} className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">📤 Gửi lại</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDetailDoc(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${detailDoc.type === 'TT_DUTOAN' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {typeLabels[detailDoc.type]}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[detailDoc.status]}`}>
                    {statusLabels[detailDoc.status]}
                  </span>
                </div>
                <button onClick={() => setDetailDoc(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {detailDoc.data?.TenGoiThau || detailDoc.data?.SoToTrinh || detailDoc.data?.SoQuyetDinh || 'Chi tiết tài liệu'}
              </h3>

              <div className="space-y-2 text-sm">
                {detailDoc.type === 'TT_DUTOAN' && (
                  <>
                    {detailDoc.data?.SoToTrinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Số tờ trình</span><span className="font-medium">{detailDoc.data.SoToTrinh}</span></div>}
                    {detailDoc.data?.ChuDauTu && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Chủ đầu tư</span><span className="font-medium">{detailDoc.data.ChuDauTu}</span></div>}
                    {detailDoc.data?.TenGoiThau && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Tên gói thầu</span><span className="font-medium">{detailDoc.data.TenGoiThau}</span></div>}
                    {detailDoc.data?.DonViTrinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Đơn vị trình</span><span className="font-medium">{detailDoc.data.DonViTrinh}</span></div>}
                    {detailDoc.data?.DuToanBangSo && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Dự toán</span><span className="font-medium">{detailDoc.data.DuToanBangSo} ({detailDoc.data.DuToanBangChu})</span></div>}
                    {detailDoc.data?.NguonVon && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Nguồn vốn</span><span className="font-medium">{detailDoc.data.NguonVon}</span></div>}
                  </>
                )}
                {detailDoc.type === 'QD_DUTOAN' && (
                  <>
                    {detailDoc.data?.SoQuyetDinh && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Số quyết định</span><span className="font-medium">{detailDoc.data.SoQuyetDinh}</span></div>}
                    {detailDoc.data?.ChuDauTu && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Chủ đầu tư</span><span className="font-medium">{detailDoc.data.ChuDauTu}</span></div>}
                    {detailDoc.data?.TenGoiThau && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Tên gói thầu</span><span className="font-medium">{detailDoc.data.TenGoiThau}</span></div>}
                    {detailDoc.data?.DuToanBangSo && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Dự toán</span><span className="font-medium">{detailDoc.data.DuToanBangSo} ({detailDoc.data.DuToanBangChu})</span></div>}
                    {detailDoc.data?.DonViMuaSam && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Đơn vị mua sắm</span><span className="font-medium">{detailDoc.data.DonViMuaSam}</span></div>}
                    {detailDoc.data?.NguonVon && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Nguồn vốn</span><span className="font-medium">{detailDoc.data.NguonVon}</span></div>}
                  </>
                )}
                {(detailDoc as any).assignee && <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Gửi tới</span><span className="font-medium">{(detailDoc as any).assignee.name}</span></div>}
                <div className="flex justify-between py-1.5 border-b"><span className="text-gray-500">Người tạo</span><span className="font-medium">{detailDoc.creator.name}</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-500">Ngày tạo</span><span className="font-medium">{format(new Date(detailDoc.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span></div>
                {detailDoc.reviews && detailDoc.reviews.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-gray-500 font-medium mb-2">Lịch sử xét duyệt:</p>
                    {detailDoc.reviews.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs">
                        <span className={`px-2 py-0.5 rounded ${r.action === 'APPROVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.action === 'APPROVE' ? 'Duyệt' : 'Từ chối'}
                        </span>
                        <span className="text-gray-600">{r.user.name}</span>
                        <span className="text-gray-400">{format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                        {r.comment && <span className="text-gray-500">- {r.comment}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5 justify-end">
                <button onClick={() => { setPreviewDocId(detailDoc.id); setDetailDoc(null); }} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">👁 Xem trước</button>
                <button onClick={() => { handleDownload(detailDoc.id); }} className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm">📥 Tải DOCX</button>
                <button onClick={() => setDetailDoc(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Đóng</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {previewDocId && (
        <OnlyOfficePreview documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}

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
                if (key === 'canCuPhapLy' || key === 'chiPhiChiTiet' || key === 'nguonVon') return null;
                if (typeof val === 'object') return null;
                const labels: Record<string, string> = {
                  SoToTrinh: 'Số tờ trình', DiaDanh: 'Địa danh', Ngay: 'Ngày', Thang: 'Tháng', Nam: 'Năm',
                  ChuDauTu: 'Chủ đầu tư', TenDuAn: 'Tên dự án', TenGoiThau: 'Tên gói thầu',
                  DonViTrinh: 'Đơn vị trình', DonViMuaSam: 'Đơn vị mua sắm',
                  PhongBanThuocDonViTrinh: 'Phòng ban thuộc ĐV trình', VietTatPhongBanThuocDonViTrinh: 'Viết tắt phòng ban',
                  TenCacVanBanPhapLyLienQuan: 'Văn bản pháp lý', NguonVon: 'Nguồn vốn',
                  DiaDiemThucHien: 'Địa điểm thực hiện', ThoiGianThucHien: 'Thời gian thực hiện',
                  KyHieuChiPhi1: 'Ký hiệu CP1', NoiDungChiPhi1: 'Nội dung CP1',
                  GiaTriTruocThue1: 'Trước thuế 1', ThueGTGT1: 'Thuế GTGT 1', GiaTriSauThue1: 'Sau thuế 1', GhiChu1: 'Ghi chú 1',
                  NoiDungChiPhi2: 'Nội dung CP2', GiaTriTruocThue2: 'Trước thuế 2', ThueGTGT2: 'Thuế GTGT 2',
                  GiaTriSauThue2: 'Sau thuế 2', GhiChu2: 'Ghi chú 2',
                  DuToanBangSo: 'Dự toán bằng số', DuToanBangChu: 'Dự toán bằng chữ',
                  CacPhongBanLienQuan: 'Phòng ban liên quan', CacNoiDungKhac: 'Nội dung khác',
                  ChiPhi1BangSo: 'CP1 bằng số', ChiPhi1BangChu: 'CP1 bằng chữ',
                  ChiPhi2BangSo: 'CP2 bằng số', ChiPhi2BangChu: 'CP2 bằng chữ',
                  SoQuyetDinh: 'Số quyết định', VietTatChuDauTu: 'Viết tắt CDT',
                  DaiDienChuDauTu: 'Đại diện CDT', PhongBanChuTriThuocDonViTrinh: 'PB chủ trì',
                  DaiDienCacPhongBanLienQuan: 'Đại diện PB liên quan',
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
              <button onClick={() => handleResubmit(editingDoc)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                💾 Lưu & Gửi lại duyệt
              </button>
            </div>
          </div>
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
          overflow-wrap: break-word;
        }
        .inp:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.1);
        }
      `}</style>
    </div>
  );
}
