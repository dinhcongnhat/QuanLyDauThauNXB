'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { SmartFormField, FieldDef } from '@/components/SmartFormField';
import { ZipDownloadModal } from '@/components/ZipDownloadModal';

const STEP_LABELS: Record<string, string> = {
  THONG_TIN_GOI_THAU: 'Thông tin gói thầu dự kiến tham dự',
  HO_SO_DU_THAU: 'Hồ sơ dự thầu (đính kèm)',
  TO_TRINH_XIN_Y_KIEN: 'Tờ trình xin ý kiến',
  QD_PHE_DUYET_HSDT: 'Quyết định phê duyệt HSDT',
  HO_SO_DA_NOP: 'Hồ sơ dự thầu đã nộp',
  KET_QUA_DAU_THAU: 'Kết quả tham gia đấu thầu',
  HOP_DONG_THUC_HIEN: 'Hợp đồng thực hiện',
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-200 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
};

const RESULT_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

const RESULT_LABELS: Record<string, string> = {
  PENDING: 'Chờ kết quả',
  WON: 'Trúng thầu',
  LOST: 'Trượt thầu',
};

// =================== TO TRINH XIN Y KIEN fields (27) ===================
const TT_FIELDS: FieldDef[] = [
  { key: 'DonViTrinh', label: 'Đơn vị trình' },
  { key: 'SoToTrinh', label: 'Số tờ trình' },
  { key: 'TenVietTatDonViTrinh', label: 'Tên viết tắt đơn vị trình' },
  { key: 'DiaDanh', label: 'Địa danh' },
  { key: 'Ngay', label: 'Ngày', type: 'date' },
  { key: 'Thang', label: 'Tháng' },
  { key: 'Nam', label: 'Năm' },
  { key: 'TenGoiThau', label: 'Tên gói thầu' },
  { key: 'TenDuAn', label: 'Tên dự án' },
  { key: 'BanLanhDaoNhaThau', label: 'Ban lãnh đạo nhà thầu' },
  { key: 'SoHSMT', label: 'Số HSMT' },
  { key: 'NgayBanHanhHSMT', label: 'Ngày ban hành HSMT', type: 'date' },
  { key: 'TenBenMoiThau', label: 'Tên bên mời thầu' },
  { key: 'GiaGoiThauBangSo', label: 'Giá gói thầu (bằng số)', type: 'money' },
  { key: 'HinhThucLuaChonNhaThau', label: 'Hình thức lựa chọn nhà thầu' },
  { key: 'GiaDuThauBangSo', label: 'Giá dự thầu (bằng số)', type: 'money' },
  { key: 'GiaDuThauBangChu', label: 'Giá dự thầu (bằng chữ)', type: 'money-words' },
  { key: 'HieuLucHSDT', label: 'Hiệu lực HSDT' },
  { key: 'GiaTriBaoDamDuThau', label: 'Giá trị bảo đảm dự thầu', type: 'money' },
  { key: 'HinhThucBaoDam', label: 'Hình thức bảo đảm' },
  { key: 'ThoiGianThucHienHD', label: 'Thời gian thực hiện HĐ' },
  { key: 'DanhSachNhaThauPhu', label: 'Danh sách nhà thầu phụ', type: 'textarea' },
  { key: 'GioDongThau', label: 'Giờ đóng thầu' },
  { key: 'ThoiDiemDongThau', label: 'Thời điểm đóng thầu', type: 'date' },
  { key: 'TenDonViTrinh', label: 'Tên đơn vị trình (đầy đủ)' },
  { key: 'ChucDanhNguoiKy', label: 'Chức danh người ký' },
  { key: 'HoVaTenNguoiKy', label: 'Họ và tên người ký' },
];

// =================== QD PHE DUYET HSDT fields (24) ===================
const QD_FIELDS: FieldDef[] = [
  { key: 'TenCongTy', label: 'Tên công ty' },
  { key: 'SoQuyetDinh', label: 'Số quyết định' },
  { key: 'TenVietTatCongTy', label: 'Tên viết tắt công ty' },
  { key: 'DiaDanh', label: 'Địa danh' },
  { key: 'Ngay', label: 'Ngày', type: 'date' },
  { key: 'Thang', label: 'Tháng' },
  { key: 'Nam', label: 'Năm' },
  { key: 'TenGoiThau', label: 'Tên gói thầu' },
  { key: 'SoHSMT', label: 'Số HSMT' },
  { key: 'NgayBanHanhHSMT', label: 'Ngày ban hành HSMT', type: 'date' },
  { key: 'TenBenMoiThau', label: 'Tên bên mời thầu' },
  { key: 'SoToTrinh', label: 'Số tờ trình liên kết' },
  { key: 'BoPhanTrinh', label: 'Bộ phận trình' },
  { key: 'ThoiGianTrinh', label: 'Thời gian trình', type: 'date' },
  { key: 'TenDuAn', label: 'Tên dự án' },
  { key: 'GiaDuThauBangSo', label: 'Giá dự thầu (bằng số)', type: 'money' },
  { key: 'GiaDuThauBangChu', label: 'Giá dự thầu (bằng chữ)', type: 'money-words' },
  { key: 'ThoiGianThucHien', label: 'Thời gian thực hiện' },
  { key: 'HieuLucHSDT', label: 'Hiệu lực HSDT' },
  { key: 'GiaTriBaoDam', label: 'Giá trị bảo đảm', type: 'money' },
  { key: 'HinhThucBaoDam', label: 'Hình thức bảo đảm' },
  { key: 'BoPhanChuyenTrach', label: 'Bộ phận chuyên trách' },
  { key: 'ChucDanhNguoiKy', label: 'Chức danh người ký' },
  { key: 'HoTenNguoiKy', label: 'Họ tên người ký' },
];

// =================== HOP DONG THUC HIEN fields (62) ===================
const HD_FIELDS: FieldDef[] = [
  { key: 'MaSoHD', label: 'Mã số hợp đồng' },
  { key: 'ThoiGianKyHĐ', label: 'Thời gian ký HĐ', type: 'date' },
  { key: 'TenGoiThau', label: 'Tên gói thầu' },
  { key: 'TenDuAn', label: 'Tên dự án' },
  { key: 'ChuDauTu', label: 'Chủ đầu tư' },
  { key: 'NhaThau', label: 'Nhà thầu' },
  { key: 'DiaDanh', label: 'Địa danh' },
  { key: 'NamKyHD', label: 'Năm ký HĐ' },
  { key: 'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', label: 'Tên QĐ phê duyệt KHLCNT', type: 'textarea' },
  { key: 'DiaChiChuDauTu', label: 'Địa chỉ chủ đầu tư' },
  { key: 'SoDienThoaiChuDauTu', label: 'SĐT chủ đầu tư' },
  { key: 'ThongTinTaiKhoanChuDauTu', label: 'TK ngân hàng chủ đầu tư' },
  { key: 'MaSoThueChuDauTu', label: 'MST chủ đầu tư' },
  { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
  { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
  { key: 'DiaChiNhaThau', label: 'Địa chỉ nhà thầu' },
  { key: 'SoDienThoaiNhaThau', label: 'SĐT nhà thầu' },
  { key: 'ThongTinTaiKhoanNhaThau', label: 'TK ngân hàng nhà thầu' },
  { key: 'MaSoThueNhaThau', label: 'MST nhà thầu' },
  { key: 'DaiDienNhaThau', label: 'Đại diện nhà thầu' },
  { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện nhà thầu' },
  { key: 'ThanhPhanHDVaThuTuUuTienPhapLy', label: 'Thành phần HĐ & thứ tự ưu tiên pháp lý', type: 'textarea' },
  { key: 'GiaHDBangSo', label: 'Giá HĐ (bằng số)', type: 'money' },
  { key: 'GiaHDBangChu', label: 'Giá HĐ (bằng chữ)', type: 'money-words' },
  { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
  { key: 'ThoiGianThucHienHD', label: 'Thời gian thực hiện HĐ' },
  { key: 'HieuLucHD', label: 'Hiệu lực HĐ' },
  { key: 'TongSoLuongInHD', label: 'Tổng số lượng in HĐ' },
  { key: 'SoLuongHDCuaChuDauTu', label: 'Số lượng HĐ của CĐT' },
  { key: 'SoLuongHDCuaNhaThau', label: 'Số lượng HĐ của nhà thầu' },
  { key: 'GiaTriBaoDamThucHienHD', label: 'Giá trị bảo đảm thực hiện HĐ', type: 'money' },
  { key: 'ThoiHanNopBaoDam', label: 'Thời hạn nộp bảo đảm', type: 'date' },
  { key: 'TyLePhanTramBaoDam', label: 'Tỷ lệ % bảo đảm' },
  { key: 'SoTienBaoDamBangSo', label: 'Số tiền bảo đảm (bằng số)', type: 'money' },
  { key: 'SoTienBaoDamBangChu', label: 'Số tiền bảo đảm (bằng chữ)', type: 'money-words' },
  { key: 'ThoiHanHoanTraBaoDam', label: 'Thời hạn hoàn trả bảo đảm', type: 'date' },
  { key: 'DanhSachNhaThauPhu', label: 'Danh sách nhà thầu phụ', type: 'textarea' },
  { key: 'ThoiHanDeTrinhToaAn', label: 'Thời hạn để trình tòa án' },
  { key: 'DanhSachChungTuCungCap', label: 'Danh sách chứng từ cung cấp', type: 'textarea' },
  { key: 'TongGiaTriHopDongBangSo', label: 'Tổng giá trị HĐ (bằng số)', type: 'money' },
  { key: 'TongGiaTriHopDongBangChu', label: 'Tổng giá trị HĐ (bằng chữ)', type: 'money-words' },
  { key: 'TamUng', label: 'Tạm ứng', type: 'money' },
  { key: 'ThanhToan', label: 'Thanh toán', type: 'money' },
  { key: 'TyLeThanhToan', label: 'Tỷ lệ thanh toán' },
  { key: 'SoTienThanhToanBangSo', label: 'Số tiền thanh toán (bằng số)', type: 'money' },
  { key: 'SoTienThanhToanBangChu', label: 'Số tiền thanh toán (bằng chữ)', type: 'money-words' },
  { key: 'HoSoThanhToan', label: 'Hồ sơ thanh toán', type: 'textarea' },
  { key: 'ThoiHanThanhToan', label: 'Thời hạn thanh toán', type: 'date' },
  { key: 'BaoHanh', label: 'Bảo hành' },
  { key: 'DongGoiHangHoa', label: 'Đóng gói hàng hóa' },
  { key: 'CacDichVuBaoGom', label: 'Các dịch vụ bao gồm', type: 'textarea' },
  { key: 'KiemTraThuNghiemHangHoa', label: 'Kiểm tra thử nghiệm hàng hóa' },
  { key: 'DiaDiemKiemTraThuNghiem', label: 'Địa điểm kiểm tra thử nghiệm' },
  { key: 'SoTienPhatViPhamHD', label: 'Số tiền phạt vi phạm HĐ', type: 'money' },
  { key: 'TyLePhatMoiTuan', label: 'Tỷ lệ phạt mỗi tuần' },
  { key: 'MucPhatToiDa', label: 'Mức phạt tối đa', type: 'money' },
  { key: 'BoiThuongThietHai', label: 'Bồi thường thiệt hại' },
  { key: 'ThoiHanBaoHanh', label: 'Thời hạn bảo hành' },
  { key: 'DiaDiemBaoHanh', label: 'Địa điểm bảo hành' },
  { key: 'ThoiHanSuaChuaKhacPhuc', label: 'Thời hạn sửa chữa khắc phục' },
  { key: 'ThoiHanCuThe', label: 'Thời hạn cụ thể' },
  { key: 'TyLeThanhToanTietKiem', label: 'Tỷ lệ thanh toán tiết kiệm' },
];

// =================== Helper: which fields for which step ===================
function getFieldsForStep(stepKey: string): FieldDef[] {
  switch (stepKey) {
    case 'TO_TRINH_XIN_Y_KIEN': return TT_FIELDS;
    case 'QD_PHE_DUYET_HSDT': return QD_FIELDS;
    case 'HOP_DONG_THUC_HIEN': return HD_FIELDS;
    default: return [];
  }
}

function hasDocxTemplate(stepKey: string) {
  return ['TO_TRINH_XIN_Y_KIEN', 'QD_PHE_DUYET_HSDT', 'HOP_DONG_THUC_HIEN'].includes(stepKey);
}

function isAttachmentStep(stepKey: string) {
  return ['THONG_TIN_GOI_THAU', 'HO_SO_DU_THAU', 'HO_SO_DA_NOP'].includes(stepKey);
}

export default function ThamDuDauThauPage() {
  const { user } = useAuthStore();
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showZipModal, setShowZipModal] = useState(false);

  // Create form
  const [createData, setCreateData] = useState({
    maThongBaoMoiThau: '',
    tenChuDauTu: '',
    tenGoiThau: '',
  });

  // Step form data (for DOCX steps)
  const [stepFormData, setStepFormData] = useState<Record<string, string>>({});

  const fetchBids = async () => {
    try {
      const data = await api.getAllBidParticipations();
      setBids(data);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBids(); }, []);

  const handleCreate = async () => {
    if (!createData.maThongBaoMoiThau.trim()) {
      toast.error('Vui lòng nhập mã thông báo mời thầu');
      return;
    }
    if (!createData.tenChuDauTu.trim()) {
      toast.error('Vui lòng nhập tên chủ đầu tư');
      return;
    }
    setSubmitting(true);
    try {
      await api.createBidParticipation(createData);
      toast.success('Đã tạo hồ sơ tham dự đấu thầu');
      setShowCreateForm(false);
      setCreateData({ maThongBaoMoiThau: '', tenChuDauTu: '', tenGoiThau: '' });
      fetchBids();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleSelectBid = async (bid: any) => {
    try {
      const full = await api.getBidParticipation(bid.id);
      setSelectedBid(full);
      setSelectedStep(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSelectStep = async (step: any) => {
    setSelectedStep(step);
    const data = step.data || {};
    setStepFormData({ ...data });
  };

  const handleSaveStepData = async () => {
    if (!selectedStep) return;
    setSubmitting(true);
    try {
      await api.updateBidStep(selectedStep.id, stepFormData);
      toast.success('Đã lưu thông tin');
      // Refresh
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      const updated = bid.steps.find((s: any) => s.id === selectedStep.id);
      if (updated) setSelectedStep(updated);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleCompleteStep = async (stepId: string) => {
    try {
      await api.completeBidStep(stepId);
      toast.success('Đã hoàn thành bước');
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      const updated = bid.steps.find((s: any) => s.id === selectedStep?.id);
      if (updated) setSelectedStep(updated);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReopenStep = async (stepId: string) => {
    try {
      await api.reopenBidStep(stepId);
      toast.success('Đã mở lại bước');
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      const updated = bid.steps.find((s: any) => s.id === selectedStep?.id);
      if (updated) setSelectedStep(updated);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSetResult = async (result: 'WON' | 'LOST') => {
    if (!selectedBid) return;
    try {
      await api.setBidResult(selectedBid.id, result);
      toast.success(result === 'WON' ? 'Trúng thầu!' : 'Trượt thầu');
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      fetchBids();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStep || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await api.uploadBidAttachment(selectedStep.id, file);
      toast.success('Tải lên thành công');
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      const updated = bid.steps.find((s: any) => s.id === selectedStep.id);
      if (updated) setSelectedStep(updated);
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDeleteAttachment = async (objectName: string) => {
    if (!selectedStep) return;
    try {
      await api.deleteBidAttachment(selectedStep.id, objectName);
      toast.success('Đã xóa file');
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      const updated = bid.steps.find((s: any) => s.id === selectedStep.id);
      if (updated) setSelectedStep(updated);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleViewFile = async (objectName: string) => {
    try {
      const { url } = await api.getBidFileUrl(objectName);
      window.open(url, '_blank');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateDocx = async () => {
    if (!selectedStep) return;
    setSubmitting(true);
    try {
      await api.generateBidDocx(selectedStep.id);
      toast.success('Đã tạo file DOCX');
      const bid = await api.getBidParticipation(selectedBid.id);
      setSelectedBid(bid);
      const updated = bid.steps.find((s: any) => s.id === selectedStep.id);
      if (updated) setSelectedStep(updated);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDownloadDocx = async () => {
    if (!selectedStep) return;
    try {
      const res = await api.downloadBidDocx(selectedStep.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disp = res.headers.get('Content-Disposition');
      let fn = 'document.docx';
      if (disp) {
        const m = disp.match(/filename\*=UTF-8''(.+)/);
        if (m) fn = decodeURIComponent(m[1]);
      }
      a.download = fn;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;

  // ===== BID DETAIL VIEW =====
  if (selectedBid) {
    const steps = selectedBid.steps || [];
    const currentStep = selectedStep;

    return (
      <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => { setSelectedBid(null); setSelectedStep(null); }}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Quay lại danh sách
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {selectedBid.tenGoiThau || selectedBid.maThongBaoMoiThau}
            </h1>
            <p className="text-sm text-gray-500">
              Mã TBMT: {selectedBid.maThongBaoMoiThau} · CĐT: {selectedBid.tenChuDauTu}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${RESULT_COLORS[selectedBid.result]}`}>
              {RESULT_LABELS[selectedBid.result]}
            </span>
            {selectedBid.steps?.every((s: any) => s.status === 'COMPLETED') && (
              <button onClick={() => setShowZipModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                📦 Tải toàn bộ file
              </button>
            )}
          </div>
        </div>

        {/* Steps Timeline */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tiến trình</h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {steps.map((step: any, idx: number) => {
              const isActive = currentStep?.id === step.id;
              const isDisabled = step.status === 'NOT_STARTED' ||
                (step.stepKey === 'HOP_DONG_THUC_HIEN' && selectedBid.result !== 'WON' && step.status === 'NOT_STARTED');

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => !isDisabled && handleSelectStep(step)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs transition-all min-w-[100px] ${
                      isActive ? 'bg-orange-50 border-2 border-orange-400 text-orange-700' :
                      isDisabled ? 'opacity-40 cursor-not-allowed' :
                      'hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-xs font-bold ${
                      step.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                      step.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {step.status === 'COMPLETED' ? '✓' : idx + 1}
                    </div>
                    <span className="text-center leading-tight">{step.title}</span>
                    <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] ${STATUS_COLORS[step.status]}`}>
                      {STATUS_LABELS[step.status]}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className={`w-6 h-0.5 ${step.status === 'COMPLETED' ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Detail */}
        {currentStep && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 bg-orange-50 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-orange-900">{currentStep.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[currentStep.status]}`}>
                  {STATUS_LABELS[currentStep.status]}
                </span>
              </div>
              <div className="flex gap-2">
                {currentStep.status === 'IN_PROGRESS' && (
                  <button onClick={() => handleCompleteStep(currentStep.id)}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    ✓ Hoàn thành
                  </button>
                )}
                {currentStep.status === 'COMPLETED' && (
                  <button onClick={() => handleReopenStep(currentStep.id)}
                    className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                    ↺ Mở lại
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* ===== STEP: THONG_TIN_GOI_THAU ===== */}
              {currentStep.stepKey === 'THONG_TIN_GOI_THAU' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Mã thông báo mời thầu</label>
                      <p className="text-sm font-medium">{selectedBid.maThongBaoMoiThau}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tên chủ đầu tư</label>
                      <p className="text-sm font-medium">{selectedBid.tenChuDauTu}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tên gói thầu</label>
                      <p className="text-sm font-medium">{selectedBid.tenGoiThau || '-'}</p>
                    </div>
                  </div>
                  <AttachmentSection
                    step={currentStep}
                    uploading={uploading}
                    fileInputRef={fileInputRef}
                    onUpload={handleUpload}
                    onDelete={handleDeleteAttachment}
                    onView={handleViewFile}
                    label="Hồ sơ mời thầu (đính kèm)"
                  />
                </div>
              )}

              {/* ===== STEP: HO_SO_DU_THAU / HO_SO_DA_NOP ===== */}
              {(currentStep.stepKey === 'HO_SO_DU_THAU' || currentStep.stepKey === 'HO_SO_DA_NOP') && (
                <AttachmentSection
                  step={currentStep}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  onUpload={handleUpload}
                  onDelete={handleDeleteAttachment}
                  onView={handleViewFile}
                  label={currentStep.stepKey === 'HO_SO_DU_THAU' ? 'Đính kèm hồ sơ dự thầu' : 'Đính kèm hồ sơ đã nộp + thông báo'}
                />
              )}

              {/* ===== STEP: DOCX template steps ===== */}
              {hasDocxTemplate(currentStep.stepKey) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {getFieldsForStep(currentStep.stepKey).map(f => (
                      currentStep.status !== 'COMPLETED' ? (
                        <SmartFormField
                          key={f.key}
                          field={f}
                          value={stepFormData[f.key] || ''}
                          onChange={(key, val) => setStepFormData({...stepFormData, [key]: val})}
                          disabled={false}
                          formData={stepFormData}
                          onFormDataChange={setStepFormData}
                        />
                      ) : (
                        <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                          <p className="text-sm">{(currentStep.data as any)?.[f.key] || '-'}</p>
                        </div>
                      )
                    ))}
                  </div>

                  {currentStep.status !== 'COMPLETED' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <button onClick={handleSaveStepData} disabled={submitting}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm disabled:opacity-50">
                        {submitting ? 'Đang lưu...' : '💾 Lưu thông tin'}
                      </button>
                      <button onClick={handleGenerateDocx} disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                        📄 Tạo file DOCX
                      </button>
                    </div>
                  )}

                  <button onClick={handleDownloadDocx}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    📥 Tải DOCX
                  </button>

                  {/* Attachments for docx steps too */}
                  <AttachmentSection
                    step={currentStep}
                    uploading={uploading}
                    fileInputRef={fileInputRef}
                    onUpload={handleUpload}
                    onDelete={handleDeleteAttachment}
                    onView={handleViewFile}
                    label="File đính kèm"
                  />
                </div>
              )}

              {/* ===== STEP: KET_QUA_DAU_THAU ===== */}
              {currentStep.stepKey === 'KET_QUA_DAU_THAU' && (
                <div className="space-y-4">
                  {selectedBid.result === 'PENDING' && currentStep.status === 'IN_PROGRESS' ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-6 text-lg">Kết quả tham gia đấu thầu</p>
                      <div className="flex gap-4 justify-center">
                        <button onClick={() => handleSetResult('WON')}
                          className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                          🏆 Trúng thầu
                        </button>
                        <button onClick={() => handleSetResult('LOST')}
                          className="px-8 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                          ✗ Trượt thầu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className={`text-2xl font-bold px-6 py-3 rounded-xl ${RESULT_COLORS[selectedBid.result]}`}>
                        {selectedBid.result === 'WON' ? '🏆 ' : '✗ '}{RESULT_LABELS[selectedBid.result]}
                      </span>
                      {selectedBid.result === 'LOST' && (
                        <p className="text-gray-500 mt-4">Hồ sơ đã kết thúc do trượt thầu.</p>
                      )}
                    </div>
                  )}

                  <AttachmentSection
                    step={currentStep}
                    uploading={uploading}
                    fileInputRef={fileInputRef}
                    onUpload={handleUpload}
                    onDelete={handleDeleteAttachment}
                    onView={handleViewFile}
                    label="File minh chứng kết quả"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompt to select step if none selected */}
        {!currentStep && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-400">
            Chọn một bước trong tiến trình để xem chi tiết
          </div>
        )}
      </div>

      {/* ZIP Download Modal */}
      <ZipDownloadModal
        open={showZipModal}
        onClose={() => setShowZipModal(false)}
        loadPreview={() => api.getBidZipPreview(selectedBid.id)}
        downloadZip={() => api.downloadBidZip(selectedBid.id)}
      />
      </>
    );
  }

  // ===== BID LIST VIEW =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tham dự đấu thầu</h1>
          <p className="text-gray-500 mt-1">Quản lý hồ sơ tham dự đấu thầu</p>
        </div>
        {!showCreateForm && (
          <button onClick={() => setShowCreateForm(true)}
            className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
            + Tạo hồ sơ mới
          </button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 bg-orange-50 border-b">
              <h3 className="text-lg font-semibold text-orange-900">Tạo hồ sơ tham dự đấu thầu mới</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã thông báo mời thầu *</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="VD: IB2400123456"
                    value={createData.maThongBaoMoiThau} onChange={e => setCreateData({...createData, maThongBaoMoiThau: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ đầu tư *</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="Tên chủ đầu tư"
                    value={createData.tenChuDauTu} onChange={e => setCreateData({...createData, tenChuDauTu: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên gói thầu</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="Tên gói thầu (không bắt buộc)"
                    value={createData.tenGoiThau} onChange={e => setCreateData({...createData, tenGoiThau: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setShowCreateForm(false); setCreateData({ maThongBaoMoiThau: '', tenChuDauTu: '', tenGoiThau: '' }); }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">Hủy</button>
                <button onClick={handleCreate} disabled={submitting}
                  className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium">
                  {submitting ? 'Đang tạo...' : 'Tạo hồ sơ'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bid List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã TBMT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên gói thầu</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chủ đầu tư</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến trình</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kết quả</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bids.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có hồ sơ tham dự đấu thầu</td></tr>
            )}
            {bids.map(bid => {
              const completedSteps = (bid.steps || []).filter((s: any) => s.status === 'COMPLETED').length;
              const totalSteps = (bid.steps || []).length;
              return (
                <tr key={bid.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectBid(bid)}>
                  <td className="px-4 py-3 text-sm font-medium text-orange-700">{bid.maThongBaoMoiThau}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{bid.tenGoiThau || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bid.tenChuDauTu}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{completedSteps}/{totalSteps}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${RESULT_COLORS[bid.result]}`}>
                      {RESULT_LABELS[bid.result]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(bid.createdAt), 'dd/MM/yyyy', { locale: vi })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Attachment Section Component =====
function AttachmentSection({ step, uploading, fileInputRef, onUpload, onDelete, onView, label }: {
  step: any;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (objectName: string) => void;
  onView: (objectName: string) => void;
  label: string;
}) {
  const attachments = (step.attachments as any[]) || [];

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{label}</h4>

      {/* Upload button */}
      {step.status !== 'COMPLETED' && (
        <div className="mb-3">
          <input ref={fileInputRef} type="file" className="hidden" onChange={onUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50 w-full">
            {uploading ? 'Đang tải lên...' : '📎 Click để chọn file tải lên (PDF, DOCX, ảnh...)'}
          </button>
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((att: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">
                  {att.contentType?.includes('pdf') ? '📄' :
                   att.contentType?.includes('image') ? '🖼️' :
                   att.contentType?.includes('word') ? '📝' : '📎'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{att.originalName}</p>
                  <p className="text-xs text-gray-400">
                    {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}
                    {att.generated && ' · Tự động tạo'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onView(att.objectName)}
                  className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">👁 Xem</button>
                {step.status !== 'COMPLETED' && (
                  <button onClick={() => onDelete(att.objectName)}
                    className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Chưa có file đính kèm</p>
      )}
    </div>
  );
}
