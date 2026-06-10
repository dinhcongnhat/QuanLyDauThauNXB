'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { User } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { LibraryPicker, SaveToLibraryModal } from '@/components/LibraryPicker';
import { LibraryType, SavedValue } from '@/lib/document-library-types';
import { OnlyOfficePreview } from '@/components/OnlyOfficePreview';
import type { PreviewType } from '@/components/OnlyOfficePreview';

type Tab = 'gdn_pcdi' | 'quyetdinh';

interface GDNData {
  tenSach: string; tacGia: string; bbt: string; namXB: string; soTrang: string; khoSach: string;
  giaBia: string; soLuongTon: string; slDeNghiIn: string; thoiGianCanSach: string; deNghiNoiIn: string; ghiChu: string;
  vuKHTKBT: string; banBienTap: string;
}

interface PCDIData {
  coQuan: string;
  bbt: string; phuongThuc: string; tenSach: string; tacGia: string; soTrang: string; khoSach: string;
  soLuongIn: string; giaTriHopDong: string; coSoIn: string; thongSoKyThuat: string; ghiChu: string;
}

interface QDData {
  soQuyetDinh: string; diaDanh: string; ngayBanHanh: string; thangBanHanh: string; namBanHanh: string;
  coQuanPheDuyet: string; nguoiPheDuyet: string; tenDuAn: string;
  nguonVon: string; diaDiem: string;
  tacGia: string;
  ngonNgu: string; khuonKho: string; soTrangCuaXuatBanPhamIn: string;
  doiTacLienKet: string; tenBienTapVien: string; maSoISBN: string; isbn: string;
  coSoIn: string; soLuongIn: string;
  ghiChu: string;
}

function formatMoney(value: string | number): string {
  if (!value) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/[.,]/g, '')) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('vi-VN');
}

function MoneyInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    onChange(raw ? parseInt(raw).toLocaleString('vi-VN') : '');
  };
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function DatSachDetailPageInner() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuthStore();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gdn_pcdi');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>('gdn');
  const [showSaveToLibrary, setShowSaveToLibrary] = useState(false);
  const [saveLibType, setSaveLibType] = useState<LibraryType>('THONG_TIN_TO_CHUC');
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [reviewerModalType, setReviewerModalType] = useState<'gdn' | 'pcdi' | 'gdn_pcdi' | 'qd'>('gdn');
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [reworkModalType, setReworkModalType] = useState<'gdn' | 'pcdi' | 'qd'>('gdn');
  const [reworkComment, setReworkComment] = useState('');
  const datePickerRef = useRef<HTMLInputElement>(null);

  // QD form state
  const [qdData, setQdData] = useState<QDData>({
    soQuyetDinh: '', diaDanh: '', ngayBanHanh: '', thangBanHanh: '', namBanHanh: '',
    coQuanPheDuyet: '', nguoiPheDuyet: '', tenDuAn: '',
    nguonVon: '', diaDiem: '',
    tacGia: '',
    ngonNgu: '', khuonKho: '', soTrangCuaXuatBanPhamIn: '',
    doiTacLienKet: '', tenBienTapVien: '', maSoISBN: '', isbn: '',
    coSoIn: '', soLuongIn: '',
    ghiChu: '',
  });

  // GDN form data — matches template fields
  const [gdnData, setGdnData] = useState<GDNData>({
    tenSach: '', tacGia: '', bbt: '', namXB: '', soTrang: '', khoSach: '',
    giaBia: '', soLuongTon: '', slDeNghiIn: '', thoiGianCanSach: '', deNghiNoiIn: '', ghiChu: '',
    vuKHTKBT: '', banBienTap: '',
  });

  // PCDI form data — matches template + generator fields
  const [pcdiData, setPcdiData] = useState<PCDIData>({
    coQuan: '',
    bbt: '', phuongThuc: '', tenSach: '', tacGia: '', soTrang: '', khoSach: '',
    soLuongIn: '', giaTriHopDong: '', coSoIn: '', thongSoKyThuat: '', ghiChu: '',
  });

  const [hasAutoFilledPCDI, setHasAutoFilledPCDI] = useState(false);
  const [hasAutoFilledQD, setHasAutoFilledQD] = useState(false);

  const hasLoadedRef = useRef(false);

  const fetchProject = useCallback(async (forceReload = false) => {
    try {
      const p = await api.getDatSachProject(projectId);
      setProject(p);
      const g = p.gdnDocuments?.[0];
      const pc = p.pcdiDocuments?.[0];
      const d = g?.data || {};
      const pcd = pc?.data || {};
      const qdd = p.qdData || {};

      if (!hasLoadedRef.current || forceReload) {
        // Populate GDN
        setGdnData({
          tenSach: d.tenSach || d.TenSach || '',
          tacGia: d.tacGia || d.TacGia || '',
          bbt: d.bbt || d.BBT || '',
          namXB: d.namXB || d.NamXB || '',
          soTrang: d.soTrang || d.SoTrang || '',
          khoSach: d.khoSach || d.KhoSach || '',
          giaBia: d.giaBia || d.GiaBia || '',
          soLuongTon: d.soLuongTon || d.SoLuongTon || '',
          slDeNghiIn: d.slDeNghiIn || d.SLDeNghiIn || '',
          thoiGianCanSach: d.thoiGianCanSach || d.ThoiGianCanSach || '',
          deNghiNoiIn: d.deNghiNoiIn || d.DeNghiNoiIn || '',
          ghiChu: d.ghiChu || d.GhiChu || '',
          vuKHTKBT: d.vuKHTKBT || d.VuKHTKBT || '',
          banBienTap: d.banBienTap || d.BanBienTap || '',
        });

        // Populate PCDI
        setPcdiData({
          coQuan: pcd.coQuan || pcd.CoQuan || d.coQuan || d.CoQuan || 'Nhà xuất bản Chính trị Quốc gia Sự thật',
          bbt: pcd.bbt || pcd.BBT || d.bbt || d.BBT || '',
          phuongThuc: pcd.phuongThuc || pcd.PhuongThuc || '',
          tenSach: pcd.tenSach || pcd.TenSach || d.tenSach || d.TenSach || '',
          tacGia: pcd.tacGia || pcd.TacGia || d.tacGia || d.TacGia || '',
          soTrang: pcd.soTrang || pcd.SoTrang || d.soTrang || d.SoTrang || '',
          khoSach: pcd.khoSach || pcd.KhoSach || d.khoSach || d.KhoSach || '',
          soLuongIn: pcd.soLuongIn || pcd.SoLuongIn || '',
          giaTriHopDong: pcd.giaTriHopDong || pcd.GiaTriHopDong || '',
          coSoIn: pcd.coSoIn || pcd.CoSoIn || '',
          thongSoKyThuat: pcd.thongSoKyThuat || pcd.ThongSoKyThuat || '',
          ghiChu: pcd.ghiChu || pcd.GhiChu || d.ghiChu || d.GhiChu || '',
        });

        // Populate QD data
        setQdData(prev => ({
          soQuyetDinh: qdd.soQuyetDinh || prev.soQuyetDinh,
          diaDanh: qdd.diaDanh || prev.diaDanh,
          ngayBanHanh: qdd.ngayBanHanh || prev.ngayBanHanh,
          thangBanHanh: qdd.thangBanHanh || prev.thangBanHanh,
          namBanHanh: qdd.namBanHanh || prev.namBanHanh,
          coQuanPheDuyet: qdd.coQuanPheDuyet || prev.coQuanPheDuyet,
          nguoiPheDuyet: qdd.nguoiPheDuyet || prev.nguoiPheDuyet,
          tenDuAn: qdd.tenDuAn || prev.tenDuAn,
          nguonVon: qdd.nguonVon || prev.nguonVon,
          diaDiem: qdd.diaDiem || prev.diaDiem,
          tacGia: qdd.tacGia || qdd.TacGia || pcd.tacGia || d.tacGia || prev.tacGia,
          ngonNgu: qdd.ngonNgu || qdd.NgonNgu || prev.ngonNgu || 'Tiếng Việt',
          khuonKho: qdd.khuonKho || qdd.KhuonKho || pcd.khoSach || d.khoSach || prev.khuonKho,
          soTrangCuaXuatBanPhamIn: qdd.soTrangCuaXuatBanPhamIn || qdd.SoTrangCuaXuatBanPhamIn || pcd.soTrang || d.soTrang || prev.soTrangCuaXuatBanPhamIn,
          doiTacLienKet: qdd.doiTacLienKet || prev.doiTacLienKet,
          tenBienTapVien: qdd.tenBienTapVien || prev.tenBienTapVien,
          maSoISBN: qdd.maSoISBN || prev.maSoISBN,
          isbn: qdd.isbn || qdd.maSoISBN || prev.isbn,
          coSoIn: qdd.coSoIn || pcd.coSoIn || prev.coSoIn || '',
          soLuongIn: qdd.soLuongIn || pcd.soLuongIn || prev.soLuongIn || '',
          ghiChu: qdd.ghiChu || prev.ghiChu,
        }));

        hasLoadedRef.current = true;
      }
      setHasAutoFilledPCDI(!!pc);
      setHasAutoFilledQD(!!qdd.soQuyetDinh || !!qdd.nguoiPheDuyet);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [projectId, fetchProject]);

  // Poll every 10 seconds for realtime assignment updates
  useEffect(() => {
    const interval = setInterval(fetchProject, 10000);
    return () => clearInterval(interval);
  }, [fetchProject]);

  useEffect(() => {
    setLoadingUsers(true);
    api.getUsers()
      .then(setUsers)
      .catch((err) => {
        toast.error('Không thể tải danh sách người dùng: ' + (err?.message || 'Lỗi không xác định'));
      })
      .finally(() => setLoadingUsers(false));
  }, [fetchProject]);

  // ─── Library ───────────────────────────────────────────────────────
  const handleLibraryGDN = (val: SavedValue) => {
    if (!val.duLieu) return;
    setGdnData(prev => ({
      ...prev,
      tenSach: val.duLieu.tenSach || val.duLieu.TenSach || val.duLieu.ten_sach || prev.tenSach,
      tacGia: val.duLieu.tacGia || val.duLieu.TacGia || val.duLieu.tac_gia || prev.tacGia,
      bbt: val.duLieu.bbt || val.duLieu.BBT || val.duLieu.nhaXuatBan || prev.bbt,
      namXB: val.duLieu.namXB || val.duLieu.NamXB || val.duLieu.nam_xb || prev.namXB,
      soTrang: val.duLieu.soTrang || val.duLieu.SoTrang || prev.soTrang,
      khoSach: val.duLieu.khoSach || val.duLieu.KhoSach || prev.khoSach,
      giaBia: val.duLieu.giaBia || val.duLieu.GiaBia || val.duLieu.gia_bia || prev.giaBia,
      soLuongTon: val.duLieu.soLuongTon || val.duLieu.SoLuongTon || prev.soLuongTon,
      slDeNghiIn: val.duLieu.slDeNghiIn || val.duLieu.SLDeNghiIn || prev.slDeNghiIn,
      thoiGianCanSach: val.duLieu.thoiGianCanSach || val.duLieu.ThoiGianCanSach || prev.thoiGianCanSach,
      deNghiNoiIn: val.duLieu.deNghiNoiIn || val.duLieu.DeNghiNoiIn || prev.deNghiNoiIn,
      vuKHTKBT: val.duLieu.vuKHTKBT || val.duLieu.VuKHTKBT || prev.vuKHTKBT,
      banBienTap: val.duLieu.banBienTap || val.duLieu.BanBienTap || prev.banBienTap,
    }));
    toast.success('Đã điền từ thư viện văn bản');
  };

  const handleLibraryPCDI = (val: SavedValue) => {
    if (!val.duLieu) return;
    setPcdiData(prev => ({
      ...prev,
      bbt: val.duLieu.bbt || val.duLieu.BBT || prev.bbt,
      phuongThuc: val.duLieu.phuongThucIn || val.duLieu.phuongThuc || prev.phuongThuc,
      tenSach: val.duLieu.tenSach || val.duLieu.TenSach || prev.tenSach,
      tacGia: val.duLieu.tacGia || val.duLieu.TacGia || prev.tacGia,
      soTrang: val.duLieu.soTrang || val.duLieu.SoTrang || prev.soTrang,
      khoSach: val.duLieu.khoSach || val.duLieu.KhoSach || prev.khoSach,
      soLuongIn: val.duLieu.soLuongIn || val.duLieu.SoLuongIn || prev.soLuongIn,
      giaTriHopDong: val.duLieu.giaTriHD || val.duLieu.giaTriHopDong || prev.giaTriHopDong,
      coSoIn: val.duLieu.coSoIn || val.duLieu.CoSoIn || prev.coSoIn,
      thongSoKyThuat: val.duLieu.thongSoKyThuat || val.duLieu.ThongSoKyThuat || prev.thongSoKyThuat,
      ghiChu: val.duLieu.ghiChu || prev.ghiChu,
    }));
    toast.success('Đã điền từ thư viện văn bản');
  };

  const handleLibraryQD = (val: SavedValue) => {
    if (!val.duLieu) return;
    setQdData(prev => ({
      ...prev,
      tacGia: val.duLieu.tacGia || val.duLieu.TacGia || prev.tacGia,
      ngonNgu: val.duLieu.ngonNgu || val.duLieu.NgonNgu || prev.ngonNgu,
      khuonKho: val.duLieu.khuonKho || val.duLieu.KhuonKho || prev.khuonKho,
      soTrangCuaXuatBanPhamIn: val.duLieu.soTrang || val.duLieu.SoTrang || prev.soTrangCuaXuatBanPhamIn,
      doiTacLienKet: val.duLieu.doiTac || val.duLieu.doiTacLienKet || prev.doiTacLienKet,
      tenBienTapVien: val.duLieu.bienTapVien || val.duLieu.TenBienTapVien || prev.tenBienTapVien,
      maSoISBN: val.duLieu.isbn || val.duLieu.ISBN || prev.maSoISBN,
      isbn: val.duLieu.isbn || val.duLieu.ISBN || prev.isbn,
      coSoIn: val.duLieu.coSoIn || val.duLieu.CoSoIn || prev.coSoIn,
      soLuongIn: val.duLieu.soLuongIn || val.duLieu.SoLuongIn || prev.soLuongIn,
      coQuanPheDuyet: val.duLieu.coQuanPheDuyet || val.duLieu.CoQuanPheDuyet || prev.coQuanPheDuyet,
      nguonVon: val.duLieu.nguonVon || val.duLieu.NgonNguonVon || prev.nguonVon,
      diaDiem: val.duLieu.diaDiem || val.duLieu.DiaDiem || val.duLieu.diaChi || prev.diaDiem,
      ghiChu: val.duLieu.ghiChu || prev.ghiChu,
    }));
    toast.success('Đã điền từ thư viện văn bản');
  };

  // ─── Auto-fill PCDI ────────────────────────────────────────────────
  const handleAutoFillPCDI = async () => {
    setFetching(true);
    try {
      const data = await api.getAutoFillForPCDI(projectId);
      if (!data) { toast.error('Cần duyệt GDN trước'); setFetching(false); return; }
      const g = project?.gdnDocuments?.[0];
      const gd = g?.data || {};
      const totalSL = (g?.assignments || []).reduce((s: number, a: any) => s + (a.soLuong || 0), 0);
      setPcdiData(prev => ({
        ...prev,
        coQuan: data.CoQuan || data.coQuan || prev.coQuan || 'Nhà xuất bản Chính trị Quốc gia Sự thật',
        bbt: data.BBT || data.bbt || prev.bbt,
        tenSach: data.TenSach || data.tenSach || prev.tenSach,
        tacGia: data.TacGia || data.tacGia || prev.tacGia,
        soTrang: data.SoTrang || data.soTrang || prev.soTrang,
        khoSach: data.KhoSach || data.khoSach || prev.khoSach,
        soLuongIn: data.SoLuongIn || String(totalSL) || prev.soLuongIn,
      }));
      setHasAutoFilledPCDI(true);
      toast.success('Đã điền từ GDN đã duyệt!');
    } catch (err: any) { toast.error(err.message); }
    finally { setFetching(false); }
  };

  // ─── Auto-fill QĐ ────────────────────────────────────────────────
  const handleAutoFillQD = async () => {
    setFetching(true);
    try {
      const data = await api.getAutoFillForDutoan(projectId);
      if (!data) { toast.error('Không có dữ liệu GDN+PCDI'); setFetching(false); return; }
      // Fill QD data from auto-fill response
      setQdData(prev => ({
        ...prev,
        tenDuAn: data.TenDuAn || data.tenDuAn || prev.tenDuAn,
        nguonVon: data.NguonVon || data.nguonVon || prev.nguonVon,
        diaDiem: data.DiaDiemThucHien || data.diaDiemThucHien || prev.diaDiem,
        tacGia: data.TacGia || data.tacGia || prev.tacGia,
        ngonNgu: data.NgonNgu || prev.ngonNgu || 'Tiếng Việt',
        khuonKho: data.khuonKho || prev.khuonKho || '',
        soLuongIn: data.SoLuongIn || prev.soLuongIn,
        isbn: data.isbn || prev.isbn || '',
        soTrangCuaXuatBanPhamIn: data.SoTrangCuaXuatBanPhamIn || prev.soTrangCuaXuatBanPhamIn || '',
        doiTacLienKet: data.doiTacLienKet || prev.doiTacLienKet || '',
        tenBienTapVien: data.TenBienTapVien || prev.tenBienTapVien || '',
        coSoIn: data.CoSoIn || prev.coSoIn || '',
      }));
      setHasAutoFilledQD(true);
      toast.success('Đã điền từ GDN + PCDI!');
    } catch (err: any) { toast.error(err.message); }
    finally { setFetching(false); }
  };

  // ─── GDN Actions ────────────────────────────────────────────────
  const handleCreateOrUpdateGDN = async () => {
    if (!gdnData.tenSach.trim()) { toast.error('Nhập tên sách'); return; }
    setSaving(true);
    try {
      const gdn = project.gdnDocuments?.[0];
      if (gdn) {
        await api.updateGDNInSach(gdn.id, gdnData);
      } else {
        await api.createGDNInSach(projectId, gdnData);
      }
      toast.success('Đã lưu Giấy đề nghị in sách');
      fetchProject(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) { toast.error('Chọn ít nhất 1 user'); return; }
    setSaving(true);
    try {
      const gdn = project.gdnDocuments?.[0];
      if (!gdn) { toast.error('Tạo GDN trước'); setSaving(false); return; }
      await api.assignUsersForSL(gdn.id, selectedUsers);
      toast.success('Đã phân công! Mỗi user sẽ điền số lượng.');
      setShowAssignModal(false);
      fetchProject(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleFillSL = async (gdnId: string, userId: string, soLuong: string) => {
    const num = parseInt(soLuong.replace(/[.,]/g, ''));
    if (!soLuong || isNaN(num)) { toast.error('Nhập số lượng hợp lệ'); return; }
    setSaving(true);
    try {
      await api.fillSL(gdnId, userId, num);
      toast.success('Đã cập nhật số lượng');
      fetchProject(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDownloadGDN = async () => {
    const gdn = project?.gdnDocuments?.[0];
    if (!gdn) return;
    try {
      const res = await api.downloadGDNDatSach(gdn.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `GiayDeNghiIn_${gdn.id.slice(0, 8)}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePreviewGDN = async () => {
    const gdn = project?.gdnDocuments?.[0];
    if (!gdn) return;
    try {
      const config = await api.getOnlyofficeConfigForGdn(gdn.id);
      console.log('[OnlyOffice GDN config]', config);
      setPreviewType('gdn');
      setPreviewDocId(gdn.id);
    } catch (err: any) {
      console.error('[OnlyOffice GDN error]', err);
      toast.error('Lỗi tải cấu hình OnlyOffice: ' + (err.message || 'Kiểm tra kết nối OnlyOffice server'));
    }
  };

  const handlePreviewPCDI = async () => {
    const pcdi = project?.pcdiDocuments?.[0];
    if (!pcdi) return;
    try {
      const config = await api.getOnlyofficeConfigForPcdi(pcdi.id);
      console.log('[OnlyOffice PCDI config]', config);
      setPreviewType('pcdi');
      setPreviewDocId(pcdi.id);
    } catch (err: any) {
      console.error('[OnlyOffice PCDI error]', err);
      toast.error('Lỗi tải cấu hình OnlyOffice: ' + (err.message || 'Kiểm tra kết nối OnlyOffice server'));
    }
  };

  const handlePreviewQD = async () => {
    try {
      const config = await api.getOnlyofficeConfigForQD(projectId);
      console.log('[OnlyOffice QD config]', config);
      setPreviewType('qd');
      setPreviewDocId(projectId);
    } catch (err: any) {
      console.error('[OnlyOffice QD error]', err);
      toast.error('Lỗi tải cấu hình OnlyOffice: ' + (err.message || 'Kiểm tra kết nối OnlyOffice server'));
    }
  };

  // ─── PCDI Actions ──────────────────────────────────────────────
  const handleCreateOrUpdatePCDI = async () => {
    setSaving(true);
    try {
      const pcdi = project.pcdiDocuments?.[0];
      if (pcdi) {
        await api.updatePCDICoSoIn(pcdi.id, pcdiData);
      } else {
        await api.createPCDICoSoIn(projectId, pcdiData);
      }
      toast.success('Đã lưu Phiếu chỉ định cơ sở in');
      fetchProject(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };



  const handleDownloadPCDI = async () => {
    const pcdi = project?.pcdiDocuments?.[0];
    if (!pcdi) return;
    try {
      const res = await api.downloadPCDIDatSach(pcdi.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `PhieuChiDinhCoSoIn_${pcdi.id.slice(0, 8)}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  // ─── QĐ Actions ───────────────────────────────────────────────
  const handleCreateOrUpdateQD = async () => {
    setSaving(true);
    try {
      await api.updateQDQuyetDinhDatSach(projectId, qdData);
      toast.success('Đã lưu Quyết định');
      fetchProject(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };



  const handleDownloadQD = async () => {
    try {
      const res = await api.downloadQDQuyetDinhDatSach(projectId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `QuyetDinhDatSach_${(project?.tenDuAn || 'document').replace(/[^a-zA-Z0-9]/g, '_')}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );

  const gdn = project?.gdnDocuments?.[0];
  const pcdi = project?.pcdiDocuments?.[0];
  const totalSL = (gdn?.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
  const gdnApproved = gdn?.status === 'APPROVED';
  const pcdiApproved = pcdi?.status === 'APPROVED';
  const projectCompleted = project?.status === 'COMPLETED';
  const isReviewer = !!(user && ['ADMIN', 'HEAD_OF_DEPARTMENT', 'DIRECTOR'].includes(user.role));
  const gdnPendingReview = gdn?.status === "PENDING_REVIEW";
  const gdnRework = gdn?.status === 'REWORK';
  const pcdiPendingReview = pcdi?.status === "PENDING_REVIEW";
  const pcdiRework = pcdi?.status === 'REWORK';
  const qdPendingReview = project?.reviewStatus === 'PENDING';

  const handleApprove = async (type: 'gdn' | 'pcdi' | 'qd') => {
    setSaving(true);
    try {
      if (type === 'gdn') {
        await api.approveGDN(gdn!.id);
      } else if (type === 'pcdi') {
        await api.approvePCDI(pcdi!.id);
      } else {
        await api.approveQDQuyetDinhDatSach(projectId);
      }
      toast.success('Phê duyệt thành công!');
      fetchProject(true);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi duyệt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Project Info */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                projectCompleted ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {projectCompleted ? 'Hoàn thành' : 'Đang thực hiện'}
              </span>
              <span className="text-xs text-gray-400">Thầu Sách</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2">{project?.tenDuAn}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Người tạo: {project?.creator?.name} &bull; {format(new Date(project?.createdAt), 'dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
          {projectCompleted && (
            <div className="text-right">
              <p className="text-green-600 font-semibold text-sm">Luồng hoàn thành</p>
              <button onClick={() => window.open(`/dashboard/mua-sam/sach/du-toan?project=${projectId}`, '_self')}
                className="mt-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                Tiếp tục &rarr; Dự toán
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'gdn_pcdi' as Tab, label: '1. Đề nghị in & Chỉ định cơ sở in', locked: false },
          { key: 'quyetdinh' as Tab, label: '2. Quyết định', locked: !(gdnApproved && pcdiApproved) },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.locked && setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' :
              tab.locked ? 'border-transparent text-gray-300 cursor-not-allowed' :
              'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={tab.locked}
          >
            {tab.label}
            {tab.locked && <span className="text-xs">🔒</span>}
            {tab.key === 'gdn_pcdi' && gdnApproved && pcdiApproved && <span className="text-green-500">✅</span>}
            {tab.key === 'quyetdinh' && projectCompleted && <span className="text-green-500">✅</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab 1: GDN & PCDI ─── */}
      {activeTab === 'gdn_pcdi' && (
        <div className="space-y-6">
          {/* Section 1: Giấy đề nghị in/tái bản sách */}
          <div className="bg-white rounded-xl p-5 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">1. Giấy đề nghị in/tái bản sách</h2>
                {gdnApproved && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã duyệt ✅</span>}
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  gdn?.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  gdn?.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                  gdn?.status === 'REWORK' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {gdn?.status === 'APPROVED' ? 'Đã duyệt' :
                   gdn?.status === 'PENDING_REVIEW' ? 'Chờ duyệt' :
                   gdn?.status === 'REWORK' ? 'Cần sửa lại' : 'Nháp'}
                </span>
                {gdn && <button onClick={handleDownloadGDN} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥 DOCX</button>}
                {gdn && <button onClick={handlePreviewGDN} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem trước</button>}
                <button onClick={() => { setSaveLibType('DAT_SACH_GDN'); setShowSaveToLibrary(true); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">💾 Lưu vào thư viện</button>
                <LibraryPicker libraryType="THONG_TIN_TO_CHUC" module="DAT_SACH_GDN" onSelect={handleLibraryGDN} onSaveToLibrary={() => setSaveLibType('DAT_SACH_GDN')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Tên sách <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.tenSach} onChange={e => setGdnData({ ...gdnData, tenSach: e.target.value })} placeholder="VD: Quản trị công ty thực chiến" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tác giả</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.tacGia} onChange={e => setGdnData({ ...gdnData, tacGia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">BBT</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.bbt} onChange={e => setGdnData({ ...gdnData, bbt: e.target.value })} placeholder="VD: NXBCTQGST" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Năm XB</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.namXB} onChange={e => setGdnData({ ...gdnData, namXB: e.target.value })} placeholder="VD: 2026" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số trang</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.soTrang} onChange={e => setGdnData({ ...gdnData, soTrang: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Khổ sách</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.khoSach} onChange={e => setGdnData({ ...gdnData, khoSach: e.target.value })} placeholder="VD: 16x24" />
              </div>
              <MoneyInput label="Giá bìa (đ)" value={gdnData.giaBia} onChange={v => setGdnData({ ...gdnData, giaBia: v })} placeholder="VD: 85.000" />
              <MoneyInput label="Số lượng tồn" value={gdnData.soLuongTon} onChange={v => setGdnData({ ...gdnData, soLuongTon: v })} />
              <div>
                <label className="text-xs font-medium text-gray-600">SL đề nghị in (tổng)</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    {totalSL > 0 ? `${formatMoney(totalSL)} cuốn` : '— chưa có người điền —'}
                  </span>
                  {!(gdn?.status === 'APPROVED') && (
                    <button onClick={() => { setSelectedUsers((gdn?.assignments || []).map((a: any) => a.userId)); setShowAssignModal(true); }}
                      className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-xs font-medium">
                      👥 Phân công điền SL
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Tổng = tổng số lượng của người được phân công. Nhấn "Phân công" để chọn người điền.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Thời gian cần sách</label>
                <div className="relative mt-1">
                  <input
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    value={gdnData.thoiGianCanSach}
                    onChange={e => setGdnData({ ...gdnData, thoiGianCanSach: e.target.value })}
                    placeholder="VD: 30/06/2026"
                  />
                  <button
                    type="button"
                    onClick={() => (datePickerRef.current as any)?.showPicker?.()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
                    title="Chọn ngày"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    ref={datePickerRef}
                    type="date"
                    className="absolute invisible w-0 h-0"
                    onChange={e => {
                      const val = e.target.value;
                      if (val) {
                        const [y, m, d] = val.split('-');
                        setGdnData({ ...gdnData, thoiGianCanSach: `${d}/${m}/${y}` });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Đề nghị nơi in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.deNghiNoiIn} onChange={e => setGdnData({ ...gdnData, deNghiNoiIn: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Vụ KH-TKBT <span className="text-gray-400 font-normal">(ký)</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.vuKHTKBT} onChange={e => setGdnData({ ...gdnData, vuKHTKBT: e.target.value })} placeholder="VD: Nguyễn Văn A" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Ban Biên tập <span className="text-gray-400 font-normal">(ký)</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.banBienTap} onChange={e => setGdnData({ ...gdnData, banBienTap: e.target.value })} placeholder="VD: Trần Thị B" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Ghi chú</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={gdnData.ghiChu} onChange={e => setGdnData({ ...gdnData, ghiChu: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={handleCreateOrUpdateGDN} disabled={saving || !gdnData.tenSach.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? '...' : gdn ? 'Cập nhật Đề nghị in' : 'Tạo Đề nghị in'}
              </button>

              {/* Review workflow buttons */}
              {gdn && gdn.status !== 'APPROVED' && gdn.status !== 'PENDING_REVIEW' && (
                <button
                  onClick={() => {
                    if (totalSL === 0) { toast.error('Cần phân công và điền SL trước khi trình duyệt'); return; }
                    setReviewerModalType('gdn');
                    setSelectedReviewer('');
                    setShowReviewerModal(true);
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  📤 Trình duyệt GDN
                </button>
              )}

              {gdnPendingReview && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm">
                    ⏳ Đang chờ duyệt bởi: <strong>{gdn.reviewer?.name || '—'}</strong>
                  </span>
                  {user && gdn.reviewerId === user.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove('gdn')}
                        disabled={saving}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
                      >
                        ✅ Duyệt GDN
                      </button>
                      <button
                        onClick={() => {
                          setReworkModalType('gdn');
                          setReworkComment('');
                          setShowReworkModal(true);
                        }}
                        disabled={saving}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                      >
                        🔁 Yêu cầu sửa lại GDN
                      </button>
                    </div>
                  )}
                </div>
              )}

              {gdnRework && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                    🔁 Cần sửa lại: <em>{gdn.reviewComment || '—'}</em>
                  </span>
                </div>
              )}

              {gdn?.status === 'APPROVED' && (
                <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
                  ✅ Đã duyệt bởi: {gdn.reviewer?.name || '—'}
                </span>
              )}
            </div>

            {totalSL === 0 && gdn && gdn.status !== 'APPROVED' && gdn.status !== 'PENDING_REVIEW' && (
              <p className="text-xs text-orange-500 mt-2">⚠️ Cần phân công user và điền số lượng trước khi trình duyệt.</p>
            )}
          </div>

          {/* Assignment Section */}
          {gdn && (
            <div className="bg-white rounded-xl p-5 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">📋 Phân công điền số lượng</h3>
                {!(gdn?.status === 'APPROVED') && (
                  <button onClick={() => {
                    if (users.length === 0) {
                      setLoadingUsers(true);
                      api.getUsers().then(u => { setUsers(u); setLoadingUsers(false); }).catch(() => setLoadingUsers(false));
                    }
                    setSelectedUsers((gdn?.assignments || []).map((a: any) => a.userId));
                    setShowAssignModal(true);
                  }} className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 border border-yellow-200">
                    + Thêm người điền
                  </button>
                )}
              </div>
              {(gdn.assignments || []).length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  <p>Chưa có ai được phân công.</p>
                  <p className="text-xs mt-1">Nhấn "Phân công điền SL" để thêm người điền số lượng.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(gdn.assignments || []).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {a.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{a.user?.name || 'User'}</p>
                        <p className="text-xs text-gray-400">{a.user?.email}</p>
                      </div>
                      {!gdnApproved && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28 text-right focus:ring-2 focus:ring-primary-500 outline-none"
                            defaultValue={a.soLuong ? formatMoney(a.soLuong) : ''}
                            placeholder="VD: 500"
                            onBlur={e => { if (e.target.value) handleFillSL(gdn.id, a.userId, e.target.value); }}
                          />
                          <span className="text-xs text-gray-400">cuốn</span>
                        </div>
                      )}
                      {gdnApproved && (
                        <span className={`text-xs px-2 py-1 rounded ${a.soLuong ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {a.soLuong ? `${formatMoney(a.soLuong)} cuốn ✅` : 'Chưa điền'}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Tổng SL:</span>
                    <span className="text-sm font-bold text-blue-700">{formatMoney(totalSL)} cuốn</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Phiếu chỉ định cơ sở in */}
          <div className="bg-white rounded-xl p-5 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">2. Phiếu chỉ định cơ sở in</h2>
                {pcdiApproved && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã duyệt ✅</span>}
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  pcdi?.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  pcdi?.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                  pcdi?.status === 'REWORK' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {pcdi?.status === 'APPROVED' ? 'Đã duyệt' :
                   pcdi?.status === 'PENDING_REVIEW' ? 'Chờ duyệt' :
                   pcdi?.status === 'REWORK' ? 'Cần sửa lại' : 'Nháp'}
                </span>
                {pcdi && <button onClick={handleDownloadPCDI} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥 DOCX</button>}
                {pcdi && <button onClick={handlePreviewPCDI} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem trước</button>}
                <button onClick={() => { setSaveLibType('DAT_SACH_PCDI'); setShowSaveToLibrary(true); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">💾 Lưu vào thư viện</button>
                <LibraryPicker libraryType="THONG_TIN_NHA_THAU" module="DAT_SACH_PCDI" onSelect={handleLibraryPCDI} onSaveToLibrary={() => setSaveLibType('DAT_SACH_PCDI')} />
              </div>
            </div>

            {!hasAutoFilledPCDI && gdn && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">🎯 Auto-fill từ GDN</p>
                  <p className="text-xs text-green-600 mt-0.5">Các trường BBT, Tên sách, Tác giả, Số trang, Khổ sách, Số lượng sẽ được điền tự động</p>
                </div>
                <button onClick={handleAutoFillPCDI} disabled={fetching} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 shrink-0 ml-3">
                  {fetching ? '...' : 'Auto-fill'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Kính gửi (Cơ quan)</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={pcdiData.coQuan} onChange={e => setPcdiData({ ...pcdiData, coQuan: e.target.value })} placeholder="VD: Nhà xuất bản Chính trị Quốc gia Sự thật" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">BBT</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-blue-50 mt-1" value={pcdiData.bbt} onChange={e => setPcdiData({ ...pcdiData, bbt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Phương thức in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={pcdiData.phuongThuc} onChange={e => setPcdiData({ ...pcdiData, phuongThuc: e.target.value })} placeholder="VD: In offset" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tên sách</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-blue-50 mt-1" value={pcdiData.tenSach} onChange={e => setPcdiData({ ...pcdiData, tenSach: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tác giả</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-blue-50 mt-1" value={pcdiData.tacGia} onChange={e => setPcdiData({ ...pcdiData, tacGia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số trang</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-blue-50 mt-1" value={pcdiData.soTrang} onChange={e => setPcdiData({ ...pcdiData, soTrang: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Khổ sách</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-blue-50 mt-1" value={pcdiData.khoSach} onChange={e => setPcdiData({ ...pcdiData, khoSach: e.target.value })} />
              </div>
              <MoneyInput label="Số lượng in (cuốn)" value={pcdiData.soLuongIn} onChange={v => setPcdiData({ ...pcdiData, soLuongIn: v })} />
              <MoneyInput label="Giá trị HĐ in (đ)" value={pcdiData.giaTriHopDong} onChange={v => setPcdiData({ ...pcdiData, giaTriHopDong: v })} placeholder="VD: 50.000.000" />
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Cơ sở in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={pcdiData.coSoIn} onChange={e => setPcdiData({ ...pcdiData, coSoIn: e.target.value })} placeholder="VD: Công ty In Trần Phú" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Thông số kỹ thuật</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={pcdiData.thongSoKyThuat} onChange={e => setPcdiData({ ...pcdiData, thongSoKyThuat: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Ghi chú</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={pcdiData.ghiChu} onChange={e => setPcdiData({ ...pcdiData, ghiChu: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={handleCreateOrUpdatePCDI} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? '...' : pcdi ? 'Cập nhật Phiếu chỉ định' : 'Tạo Phiếu chỉ định'}
              </button>

              {!pcdiApproved && pcdi && (
                <>
                  {pcdiPendingReview ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm">
                        ⏳ Chờ duyệt bởi: <strong>{pcdi.reviewer?.name || '—'}</strong>
                      </span>
                      {pcdi.reviewComment && (
                        <span className="text-xs text-gray-500 italic">"{pcdi.reviewComment}"</span>
                      )}
                      {user && pcdi.reviewerId === user.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove('pcdi')}
                            disabled={saving}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
                          >
                            ✅ Duyệt PCDI
                          </button>
                          <button
                            onClick={() => {
                              setReworkModalType('pcdi');
                              setReworkComment('');
                              setShowReworkModal(true);
                            }}
                            disabled={saving}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                          >
                            🔁 Yêu cầu sửa lại PCDI
                          </button>
                        </div>
                      )}
                    </div>
                  ) : pcdiRework ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                        🔁 Cần sửa lại: <em>{pcdi.reviewComment || '—'}</em>
                      </span>
                      <button
                        onClick={() => {
                          setReviewerModalType('pcdi');
                          setSelectedReviewer('');
                          setShowReviewerModal(true);
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                      >
                        Gửi duyệt lại
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReviewerModalType('pcdi');
                        setSelectedReviewer('');
                        setShowReviewerModal(true);
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                    >
                      📤 Trình duyệt PCDI
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Unified Submission Section */}
          {gdn && pcdi && (gdn.status !== 'APPROVED' || pcdi.status !== 'APPROVED') && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-indigo-900 text-sm">📤 Trình duyệt cả 2 (GDN & PCDI)</h3>
                <p className="text-xs text-indigo-700 mt-1">
                  Gửi đồng thời cả Giấy đề nghị in (GDN) và Phiếu chỉ định cơ sở in (PCDI) cho cùng một người duyệt.
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className={`font-medium ${gdn.status === 'APPROVED' ? 'text-green-600' : gdn.status === 'PENDING_REVIEW' ? 'text-amber-600' : 'text-gray-500'}`}>
                    GDN: {gdn.status === 'APPROVED' ? 'Đã duyệt' : gdn.status === 'PENDING_REVIEW' ? 'Chờ duyệt' : gdn.status === 'REWORK' ? 'Cần sửa lại' : 'Nháp'}
                  </span>
                  <span className={`font-medium ${pcdi.status === 'APPROVED' ? 'text-green-600' : pcdi.status === 'PENDING_REVIEW' ? 'text-amber-600' : 'text-gray-500'}`}>
                    PCDI: {pcdi.status === 'APPROVED' ? 'Đã duyệt' : pcdi.status === 'PENDING_REVIEW' ? 'Chờ duyệt' : pcdi.status === 'REWORK' ? 'Cần sửa lại' : 'Nháp'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 items-center">
                {(gdn.status === 'DRAFT' || gdn.status === 'REWORK' || pcdi.status === 'DRAFT' || pcdi.status === 'REWORK') ? (
                  <button
                    onClick={() => {
                      if (totalSL === 0) { toast.error('Cần phân công và điền SL trước khi trình duyệt GDN'); return; }
                      setReviewerModalType('gdn_pcdi');
                      setSelectedReviewer('');
                      setShowReviewerModal(true);
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                  >
                    Gửi duyệt cả 2
                  </button>
                ) : (
                  (gdn.status === 'PENDING_REVIEW' || pcdi.status === 'PENDING_REVIEW') && (
                    <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2.5 py-1 font-medium">
                      ⏳ Đang chờ duyệt
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 3: Quyết Định ─── */}
      {activeTab === 'quyetdinh' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">Quyết định xuất bản/tái bản sách</h2>
                {projectCompleted && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã duyệt ✅</span>}
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={handleDownloadQD} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">📥 DOCX</button>
                <button onClick={handlePreviewQD} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem trước</button>
                <button onClick={() => { setSaveLibType('DAT_SACH_QD'); setShowSaveToLibrary(true); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">💾 Lưu vào thư viện</button>
                <LibraryPicker libraryType="THONG_TIN_TO_CHUC" module="DAT_SACH_QD" onSelect={handleLibraryQD} onSaveToLibrary={() => setSaveLibType('DAT_SACH_QD')} />
              </div>
            </div>

            {!hasAutoFilledQD && gdnApproved && pcdiApproved && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">🎯 Auto-fill từ GDN + PCDI</p>
                  <p className="text-xs text-purple-600 mt-0.5">Điền tự động từ dữ liệu đã duyệt ở bước 1 và bước 2</p>
                </div>
                <button onClick={handleAutoFillQD} disabled={fetching} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 shrink-0 ml-3">
                  {fetching ? '...' : 'Auto-fill'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Số Quyết định</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.soQuyetDinh} onChange={e => setQdData({ ...qdData, soQuyetDinh: e.target.value })} placeholder="VD: 01/QĐ-NXBCTQGST" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Cơ quan phê duyệt</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.coQuanPheDuyet} onChange={e => setQdData({ ...qdData, coQuanPheDuyet: e.target.value })} placeholder="Nhà xuất bản Chính trị Quốc gia Sự thật" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Người phê duyệt</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.nguoiPheDuyet} onChange={e => setQdData({ ...qdData, nguoiPheDuyet: e.target.value })} placeholder="VD: Vũ Trọng Lâm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Nguồn vốn</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.nguonVon} onChange={e => setQdData({ ...qdData, nguonVon: e.target.value })} placeholder="VD: Ngân sách nhà nước" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Địa điểm in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.diaDiem} onChange={e => setQdData({ ...qdData, diaDiem: e.target.value })} placeholder="VD: Hà Nội" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Tên dự án</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.tenDuAn} onChange={e => setQdData({ ...qdData, tenDuAn: e.target.value })} />
              </div>
              {/* Fields linked from GDN & PCDI for QD template */}
              <div>
                <label className="text-xs font-medium text-gray-600">Tác giả</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.tacGia} onChange={e => setQdData({ ...qdData, tacGia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">ISBN</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.isbn} onChange={e => setQdData({ ...qdData, isbn: e.target.value })} placeholder="VD: 978-604-0-12345-6" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Ngôn ngữ</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.ngonNgu} onChange={e => setQdData({ ...qdData, ngonNgu: e.target.value })} placeholder="VD: Tiếng Việt" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Khuôn khổ</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.khuonKho} onChange={e => setQdData({ ...qdData, khuonKho: e.target.value })} placeholder="VD: 17x24" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số trang của XB phẩm in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.soTrangCuaXuatBanPhamIn} onChange={e => setQdData({ ...qdData, soTrangCuaXuatBanPhamIn: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Đối tác liên kết XB</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.doiTacLienKet} onChange={e => setQdData({ ...qdData, doiTacLienKet: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tên biên tập viên</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.tenBienTapVien} onChange={e => setQdData({ ...qdData, tenBienTapVien: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Cơ sở in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.coSoIn} onChange={e => setQdData({ ...qdData, coSoIn: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Số lượng in</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.soLuongIn} onChange={e => setQdData({ ...qdData, soLuongIn: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Ghi chú</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mt-1" value={qdData.ghiChu} onChange={e => setQdData({ ...qdData, ghiChu: e.target.value })} />
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
              <p className="text-xs font-semibold text-gray-600 mb-2">📋 Trạng thái luồng:</p>
              <div className="flex gap-4 text-xs">
                <span className={gdn?.status === 'APPROVED' ? 'text-green-600' : gdn?.status === 'PENDING_REVIEW' ? 'text-amber-600' : gdn?.status === 'REWORK' ? 'text-red-600' : 'text-gray-400'}>
                  {gdn?.status === 'APPROVED' ? '✅' : gdn?.status === 'PENDING_REVIEW' ? '📤' : gdn?.status === 'REWORK' ? '🔁' : '⏳'} GDN
                </span>
                <span className={pcdi?.status === 'APPROVED' ? 'text-green-600' : pcdi?.status === 'PENDING_REVIEW' ? 'text-amber-600' : pcdi?.status === 'REWORK' ? 'text-red-600' : 'text-gray-400'}>
                  {pcdi?.status === 'APPROVED' ? '✅' : pcdi?.status === 'PENDING_REVIEW' ? '📤' : pcdi?.status === 'REWORK' ? '🔁' : '⏳'} PCDI
                </span>
                <span className={projectCompleted ? 'text-green-600' : 'text-gray-400'}>
                  {projectCompleted ? '✅' : '⏳'} QĐ
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={handleCreateOrUpdateQD} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? '...' : 'Lưu thông tin QĐ'}
              </button>

              {/* Review workflow for QĐ */}
              {gdnApproved && pcdiApproved && (
                <>
                  {projectCompleted ? (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
                      ✅ Hoàn thành bởi: {project.reviewer?.name || '—'}
                    </span>
                  ) : qdPendingReview ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm">
                        ⏳ Chờ duyệt bởi: <strong>{project.reviewer?.name || '—'}</strong>
                      </span>
                      {project.reviewComment && (
                        <span className="text-xs text-gray-500 italic">"{project.reviewComment}"</span>
                      )}
                      {user && project.reviewerId === user.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove('qd')}
                            disabled={saving}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
                          >
                            ✅ Duyệt QĐ
                          </button>
                          <button
                            onClick={() => {
                              setReworkModalType('qd');
                              setReworkComment('');
                              setShowReworkModal(true);
                            }}
                            disabled={saving}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                          >
                            🔁 Yêu cầu sửa lại QĐ
                          </button>
                        </div>
                      )}
                    </div>
                  ) : project.reviewStatus === 'REWORK' ? (
                    <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                      🔁 Cần sửa lại: <em>{project.reviewComment || '—'}</em>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setReviewerModalType('qd');
                        setSelectedReviewer('');
                        setShowReviewerModal(true);
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                    >
                      📤 Trình duyệt QĐ
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Reviewer Selection Modal ─── */}
      {showReviewerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowReviewerModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">📤 Trình duyệt {reviewerModalType === 'gdn' ? 'GDN' : reviewerModalType === 'pcdi' ? 'PCDI' : reviewerModalType === 'gdn_pcdi' ? 'GDN & PCDI' : 'QĐ'}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Chọn người phê duyệt (Trưởng phòng hoặc Giám đốc):
            </p>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedReviewer}
              onChange={e => setSelectedReviewer(e.target.value)}
            >
              <option value="">-- Chọn người duyệt --</option>
              {users.filter(u => ['ADMIN', 'HEAD_OF_DEPARTMENT', 'DIRECTOR'].includes(u.role)).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReviewerModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
              <button
                onClick={async () => {
                  if (!selectedReviewer) { toast.error('Chọn người duyệt'); return; }
                  setSaving(true);
                  try {
                    if (reviewerModalType === 'gdn') {
                      await api.submitGDNForReview(gdn!.id, selectedReviewer);
                    } else if (reviewerModalType === 'pcdi') {
                      await api.submitPCDIForReview(pcdi!.id, selectedReviewer);
                    } else if (reviewerModalType === 'gdn_pcdi') {
                      if (gdn && (gdn.status === 'DRAFT' || gdn.status === 'REWORK')) {
                        await api.submitGDNForReview(gdn.id, selectedReviewer);
                      }
                      if (pcdi && (pcdi.status === 'DRAFT' || pcdi.status === 'REWORK')) {
                        await api.submitPCDIForReview(pcdi.id, selectedReviewer);
                      }
                    } else {
                      await api.submitQDForReview(projectId, selectedReviewer);
                    }
                    toast.success('Đã gửi trình duyệt!');
                    setShowReviewerModal(false);
                    fetchProject(true);
                  } catch (err: any) { toast.error(err.message); }
                  finally { setSaving(false); }
                }}
                disabled={!selectedReviewer || saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
              >
                {saving ? '...' : '📤 Gửi duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rework Comment Modal ─── */}
      {showReworkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowReworkModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 text-red-700">🔁 Yêu cầu làm lại</h3>
            <p className="text-sm text-gray-500 mb-3">
              Nhập lý do yêu cầu làm lại {reworkModalType === 'gdn' ? 'GDN' : reworkModalType === 'pcdi' ? 'PCDI' : 'QĐ'}:
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              rows={4}
              value={reworkComment}
              onChange={e => setReworkComment(e.target.value)}
              placeholder="VD: Số lượng chưa chính xác, thông tin cần bổ sung..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowReworkModal(false); setReworkComment(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
              <button
                onClick={async () => {
                  if (!reworkComment.trim()) { toast.error('Nhập lý do'); return; }
                  setSaving(true);
                  try {
                    if (reworkModalType === 'gdn') await api.reworkGDN(gdn!.id, reworkComment);
                    else if (reworkModalType === 'pcdi') await api.reworkPCDI(pcdi!.id, reworkComment);
                    else await api.reworkQD(projectId, reworkComment);
                    toast.success('Đã gửi yêu cầu làm lại!');
                    setShowReworkModal(false);
                    setReworkComment('');
                    fetchProject(true);
                  } catch (err: any) { toast.error(err.message); }
                  finally { setSaving(false); }
                }}
                disabled={!reworkComment.trim() || saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {saving ? '...' : '🔁 Gửi làm lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Phân công user điền số lượng</h3>
            <p className="text-sm text-gray-500 mb-3">Chọn người sẽ điền số lượng đề nghị in sách cho mỗi đơn vị/phòng ban:</p>
            <div className="space-y-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải danh sách...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Không có user nào để phân công.</p>
                  <button onClick={() => { setLoadingUsers(true); api.getUsers().then(u => { setUsers(u); setLoadingUsers(false); }).catch(() => setLoadingUsers(false)); }}
                    className="mt-2 text-xs text-blue-600 hover:underline">Thử lại</button>
                </div>
              ) : null}
              {users.filter(u => u.role !== 'ADMIN').length === 0 && users.length > 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Không có user (không phải Admin) để phân công.</p>
              ) : null}
              {!loadingUsers && users.filter(u => u.role !== 'ADMIN').map(u => (
                <label key={u.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(u.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                      else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                    }}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {u.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email} · {u.department || 'Không có phòng'}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
              <button onClick={handleAssignUsers} disabled={saving || selectedUsers.length === 0}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm disabled:opacity-50">
                {saving ? '...' : `Phân công (${selectedUsers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OnlyOffice Preview */}
      {previewDocId && (
        <OnlyOfficePreview
          documentId={previewDocId}
          type={previewType}
          onClose={() => setPreviewDocId(null)}
        />
      )}

      {/* Save to Library Modal */}
      <SaveToLibraryModal
        isOpen={showSaveToLibrary}
        onClose={() => setShowSaveToLibrary(false)}
        libraryType={saveLibType}
        formData={
          saveLibType === 'DAT_SACH_GDN' ? { ...gdnData } :
          saveLibType === 'DAT_SACH_PCDI' ? { ...pcdiData } :
          { ...qdData }
        }
        formFieldKeys={
          saveLibType === 'DAT_SACH_GDN' ? Object.keys(gdnData) :
          saveLibType === 'DAT_SACH_PCDI' ? Object.keys(pcdiData) :
          Object.keys(qdData)
        }
        onSave={() => {}}
      />

      {/* ─── Lich su quy trinh ─── */}
      <div className="bg-white rounded-xl p-5 border">
        <h3 className="font-semibold text-gray-800 mb-4">Lịch sử quy trình</h3>
        {project && (
          <div className="space-y-3">
            {/* GDN History */}
            {project.gdnDocuments && project.gdnDocuments.length > 0 && (
              project.gdnDocuments.map((g: any) => (
                <div key={g.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    g.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    g.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    g.status === 'REWORK' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    GDN
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      Giấy đề nghị in sách
                    </p>
                    <p className="text-xs text-gray-400">
                      Tên sách: {g.data?.tenSach || g.data?.TenSach || '—'} · SL: {(g.assignments || []).reduce((s: number, a: any) => s + (a.soLuong || 0), 0) || 0} cuốn
                    </p>
                    <p className="text-xs text-gray-400">
                      {g.assignments && g.assignments.length > 0 && (
                        <>Người điền: {g.assignments.map((a: any) => a.user?.name).filter(Boolean).join(', ')}</>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    g.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    g.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    g.status === 'REWORK' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {g.status === 'APPROVED' ? 'Đã duyệt' :
                     g.status === 'PENDING_REVIEW' ? 'Chờ duyệt' :
                     g.status === 'REWORK' ? 'Cần sửa lại' : 'Nháp'}
                  </span>
                  {g.reviewer && (
                    <span className="text-xs text-gray-400">👤 {g.reviewer.name}</span>
                  )}
                </div>
              ))
            )}

            {/* PCDI History */}
            {project.pcdiDocuments && project.pcdiDocuments.length > 0 && (
              project.pcdiDocuments.map((p: any) => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    p.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    p.status === 'REWORK' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    PCDI
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Phiếu chỉ định cơ sở in</p>
                    <p className="text-xs text-gray-400">
                      Cơ sở in: {p.data?.coSoIn || p.data?.CoSoIn || '—'} · SL: {p.data?.soLuongIn || p.data?.SoLuongIn || '—'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    p.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    p.status === 'REWORK' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status === 'APPROVED' ? 'Đã duyệt' :
                     p.status === 'PENDING_REVIEW' ? 'Chờ duyệt' :
                     p.status === 'REWORK' ? 'Cần sửa lại' : 'Nháp'}
                  </span>
                  {p.reviewer && (
                    <span className="text-xs text-gray-400">👤 {p.reviewer.name}</span>
                  )}
                </div>
              ))
            )}

            {/* QD History */}
            {(project.qdData as any)?.soQuyetDinh && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  QĐ
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Quyết định đặt sách</p>
                  <p className="text-xs text-gray-400">
                    Số QĐ: {(project.qdData as any).soQuyetDinh} · Cơ quan: {(project.qdData as any).coQuanPheDuyet || '—'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600'
                }`}>
                  {project.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã lưu'}
                </span>
              </div>
            )}

            {/* Empty state */}
            {(!project.gdnDocuments || project.gdnDocuments.length === 0) &&
             (!project.pcdiDocuments || project.pcdiDocuments.length === 0) &&
             !(project.qdData as any)?.soQuyetDinh ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                Chưa có quy trình nào được tạo.
              </div>
            ) : null}
          </div>
        )}
      </div>

    </div>
  );
}

export default function DatSachDetailPage() {
  const params = useParams();
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}>
      <DatSachDetailPageInner key={params.projectId as string} />
    </Suspense>
  );
}

