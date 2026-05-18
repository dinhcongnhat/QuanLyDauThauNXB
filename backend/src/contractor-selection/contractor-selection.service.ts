import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { JwtService } from '@nestjs/jwt';
import { ProcurementMethod, NotificationType } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { generateContractorSelectionDocx, isAttachmentOnlyStep } from './lcnt-docx-generator';

// Steps requiring approval (they have DOCX templates)
const APPROVAL_REQUIRED_STEPS = new Set([
  'to_trinh_kqlcnt',
  'quyet_dinh_kqlcnt',
  'to_trinh_hsmt',
  'quyet_dinh_hsmt',
  'quyet_dinh_lcnt',
  'hop_dong',
]);

// Auto-fill field mappings: when moving to `nextStep`, auto-fill from `fromStep`
const AUTO_FILL_MAPPINGS: Record<string, Array<{ fromStep: string; toStep: string; fields: string[] }>> = {
  CHI_DINH_THAU: [
    {
      fromStep: 'thu_moi_hoan_thien',
      toStep: 'bien_ban_hoan_thien',
      fields: ['DiaDanh', 'TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'LoaiHopDong',
        'GiaTriHopDongBangSo', 'GiaTriHopDongBangChu', 'DaiDienChuDauTu', 'DiaChiChuDauTu',
        'SoTaiKhoanCDT', 'TenVietTatChuDauTu', 'TenVietTatNhaThau',
        'DaiDienNhaThau', 'SoTaiKhoanNT', 'NganHangNT', 'MaNganHangNT',
        'NganHangCDT', 'MaNganHangCDT', 'MaSoThueCDT', 'ChucVu'],
    },
    {
      fromStep: 'bien_ban_hoan_thien',
      toStep: 'to_trinh_kqlcnt',
      fields: ['DiaDanh', 'TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'LoaiHopDong',
        'GiaTriHopDongBangSo', 'GiaTriHopDongBangChu', 'DaiDienChuDauTu',
        'MaSoThueNhaThau', 'DiaChiNhaThau', 'TenVietTatNhaThau'],
    },
    {
      fromStep: 'to_trinh_kqlcnt',
      toStep: 'quyet_dinh_kqlcnt',
      fields: ['DiaDanh', 'TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'LoaiHopDong',
        'GiaTriHopDongBangSo', 'DaiDienChuDauTu', 'DonViTrinh', 'TenVietTatDonViTrinh',
        'NguonVon', 'ThoiGianThucHienGoiThau', 'MaSoThueNhaThau',
        'ThoiGianThucHienHopDong', 'GiaTriDuToanDuocDuyet'],
    },
    {
      fromStep: 'quyet_dinh_kqlcnt',
      toStep: 'hop_dong',
      fields: ['DiaDanh', 'TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'LoaiHopDong',
        'GiaTriHopDongBangSo', 'GiaTriHopDongBangChu', 'DaiDienChuDauTu',
        'MaSoThueNhaThau', 'ThoiGianThucHienHD', 'ThoiGianThucHienGoiThau',
        'DonViTrinh', 'TenVietTatDonViTrinh'],
    },
  ],
  CHAO_HANG_CANH_TRANH: [
    {
      fromStep: 'to_trinh_hsmt',
      toStep: 'quyet_dinh_hsmt',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
        'DaiDienChuDauTu', 'TenCacVanBanPhapLyLienQuan', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'LoaiHopDong', 'ThoiGianThucHienGoiThau'],
    },
    {
      fromStep: 'quyet_dinh_hsmt',
      toStep: 'to_trinh_kqlcnt',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
        'GiaGoiThauBangSo', 'NguonVon', 'DaiDienChuDauTu', 'ChucVuDaiDienChuDauTu',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
        'LoaiHopDong', 'ThoiGianThucHienGoiThau',
        'HinhThucPhuongThucLuaChonNhaThau', 'TuyChonMuaThem',
        'ThoiGianToChucLuaChonNhaThau', 'ThoiGianBatDauToChucLuaChonNhaThau'],
    },
    {
      fromStep: 'to_trinh_kqlcnt',
      toStep: 'quyet_dinh_lcnt',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenNhaThauTrungThau', 'MaSoThueNhaThau',
        'GiaDuThau', 'GiaTrungThau', 'LoaiHopDong', 'TenKeHoachLuaChonNhaThau',
        'DaiDienChuDauTu', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
        'ThoiGianThucHienGoiThau', 'ThoiGianThucHienHD',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
        'HinhThucLuaChonNhaThau', 'NguonVon'],
    },
    {
      fromStep: 'quyet_dinh_lcnt',
      toStep: 'hop_dong',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'TenKeHoachLuaChonNhaThau',
        'GiaHDBangSo', 'GiaHDBangChu', 'LoaiHopDong', 'DaiDienChuDauTu',
        'ChucVuDaiDienChuDauTu', 'MaSoThueNhaThau', 'ThoiGianThucHienHD',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'GiaTrungThau',
        'TenNhaThauTrungThau', 'GiaGoiThauBangSo'],
    },
  ],
  DAU_THAU_RONG_RAI: [
    {
      fromStep: 'to_trinh_hsmt',
      toStep: 'quyet_dinh_hsmt',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
        'DaiDienChuDauTu', 'TenCacVanBanPhapLyLienQuan', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'LoaiHopDong', 'ThoiGianThucHienGoiThau'],
    },
    {
      fromStep: 'quyet_dinh_hsmt',
      toStep: 'to_trinh_kqlcnt',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenChuDauTu', 'TenKeHoachLuaChonNhaThau',
        'GiaGoiThauBangSo', 'NguonVon', 'DaiDienChuDauTu', 'ChucVuDaiDienChuDauTu',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
        'LoaiHopDong', 'ThoiGianThucHienGoiThau',
        'HinhThucPhuongThucLuaChonNhaThau', 'TuyChonMuaThem',
        'ThoiGianToChucLuaChonNhaThau', 'ThoiGianBatDauToChucLuaChonNhaThau'],
    },
    {
      fromStep: 'to_trinh_kqlcnt',
      toStep: 'quyet_dinh_lcnt',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'TenNhaThauTrungThau', 'MaSoThueNhaThau',
        'GiaDuThau', 'GiaTrungThau', 'LoaiHopDong', 'TenKeHoachLuaChonNhaThau',
        'DaiDienChuDauTu', 'GiaGoiThauBangSo', 'GiaGoiThauBangChu',
        'ThoiGianThucHienGoiThau', 'ThoiGianThucHienHD',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'TenCacVanBanPhapLyLienQuan',
        'HinhThucLuaChonNhaThau', 'NguonVon'],
    },
    {
      fromStep: 'quyet_dinh_lcnt',
      toStep: 'hop_dong',
      fields: ['TenGoiThau', 'TenDuAn', 'ChuDauTu', 'NhaThau', 'TenKeHoachLuaChonNhaThau',
        'GiaHDBangSo', 'GiaHDBangChu', 'LoaiHopDong', 'DaiDienChuDauTu',
        'ChucVuDaiDienChuDauTu', 'MaSoThueNhaThau', 'ThoiGianThucHienHD',
        'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', 'GiaTrungThau',
        'TenNhaThauTrungThau', 'GiaGoiThauBangSo'],
    },
  ],
};

// Step definitions for each procurement method
const CHI_DINH_THAU_STEPS = [
  { stepKey: 'cong_van_tham_gia', stepOrder: 1, title: 'Công văn xin tham gia của nhà thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'thu_moi_hoan_thien', stepOrder: 2, title: 'Thư mời hoàn thiện hợp đồng', requiresApproval: false },
  { stepKey: 'bien_ban_hoan_thien', stepOrder: 3, title: 'Biên bản hoàn thiện hợp đồng (biên bản thương thảo)', requiresApproval: false },
  { stepKey: 'to_trinh_kqlcnt', stepOrder: 4, title: 'Tờ trình phê duyệt KQLCNT', requiresApproval: true },
  { stepKey: 'quyet_dinh_kqlcnt', stepOrder: 5, title: 'Quyết định phê duyệt KQLCNT', requiresApproval: true },
  { stepKey: 'hop_dong', stepOrder: 6, title: 'Hợp đồng', requiresApproval: true },
];

const CHAO_HANG_CANH_TRANH_STEPS = [
  { stepKey: 'thong_tin_to_chuyen_gia', stepOrder: 1, title: 'Thông tin tổ chuyên gia và tổ thẩm định (Đính kèm)', requiresApproval: false },
  { stepKey: 'san_pham_hsmt', stepOrder: 2, title: 'Sản phẩm hồ sơ mời thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'to_trinh_hsmt', stepOrder: 3, title: 'Tờ trình phê duyệt HSMT', requiresApproval: true },
  { stepKey: 'bao_cao_tham_dinh_hsmt', stepOrder: 4, title: 'Báo cáo thẩm định HSMT (Đính kèm)', requiresApproval: false },
  { stepKey: 'quyet_dinh_hsmt', stepOrder: 5, title: 'Quyết định phê duyệt hồ sơ mời thầu', requiresApproval: true },
  { stepKey: 'dang_tai_hsmt', stepOrder: 6, title: 'Đăng tải HSMT lên mạng đấu thầu quốc gia (Đính kèm)', requiresApproval: false },
  { stepKey: 'bao_cao_danh_gia_hsdt', stepOrder: 7, title: 'Báo cáo đánh giá HSDT (Đính kèm)', requiresApproval: false },
  { stepKey: 'bien_ban_doi_chieu', stepOrder: 8, title: 'Biên bản đối chiếu tài liệu (Đính kèm)', requiresApproval: false },
  { stepKey: 'to_trinh_kqlcnt', stepOrder: 9, title: 'Tờ trình phê duyệt KQLCNT', requiresApproval: true },
  { stepKey: 'bao_cao_tham_dinh_kqlcnt', stepOrder: 10, title: 'Báo cáo thẩm định kết quả lựa chọn nhà thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'quyet_dinh_lcnt', stepOrder: 11, title: 'Quyết định lựa chọn nhà thầu', requiresApproval: true },
  { stepKey: 'dang_tai_lcnt', stepOrder: 12, title: 'Đăng tải thông tin lựa chọn nhà thầu lên mạng đấu thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'hop_dong', stepOrder: 13, title: 'Hợp đồng', requiresApproval: true },
];

const DAU_THAU_RONG_RAI_STEPS = [
  { stepKey: 'thong_tin_to_chuyen_gia', stepOrder: 1, title: 'Thông tin tổ chuyên gia và tổ thẩm định (Đính kèm)', requiresApproval: false },
  { stepKey: 'san_pham_hsmt', stepOrder: 2, title: 'Sản phẩm hồ sơ mời thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'to_trinh_hsmt', stepOrder: 3, title: 'Tờ trình phê duyệt HSMT', requiresApproval: true },
  { stepKey: 'bao_cao_tham_dinh_hsmt', stepOrder: 4, title: 'Báo cáo thẩm định HSMT (Đính kèm)', requiresApproval: false },
  { stepKey: 'quyet_dinh_hsmt', stepOrder: 5, title: 'Quyết định phê duyệt hồ sơ mời thầu', requiresApproval: true },
  { stepKey: 'dang_tai_hsmt', stepOrder: 6, title: 'Đăng tải HSMT lên mạng đấu thầu quốc gia (Đính kèm)', requiresApproval: false },
  { stepKey: 'bao_cao_danh_gia_hsdt', stepOrder: 7, title: 'Báo cáo đánh giá HSDT (Đính kèm)', requiresApproval: false },
  { stepKey: 'bien_ban_doi_chieu', stepOrder: 8, title: 'Biên bản đối chiếu tài liệu (Đính kèm)', requiresApproval: false },
  { stepKey: 'to_trinh_kqlcnt', stepOrder: 9, title: 'Tờ trình phê duyệt KQLCNT', requiresApproval: true },
  { stepKey: 'bao_cao_tham_dinh_kqlcnt', stepOrder: 10, title: 'Báo cáo thẩm định kết quả lựa chọn nhà thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'quyet_dinh_lcnt', stepOrder: 11, title: 'Quyết định lựa chọn nhà thầu', requiresApproval: true },
  { stepKey: 'dang_tai_lcnt', stepOrder: 12, title: 'Đăng tải thông tin lựa chọn nhà thầu lên mạng đấu thầu (Đính kèm)', requiresApproval: false },
  { stepKey: 'hop_dong', stepOrder: 13, title: 'Hợp đồng', requiresApproval: true },
];

function getSteps(method: ProcurementMethod) {
  switch (method) {
    case ProcurementMethod.CHI_DINH_THAU: return CHI_DINH_THAU_STEPS;
    case ProcurementMethod.CHAO_HANG_CANH_TRANH: return CHAO_HANG_CANH_TRANH_STEPS;
    case ProcurementMethod.DAU_THAU_RONG_RAI: return DAU_THAU_RONG_RAI_STEPS;
  }
}

function canApprove(role: string): boolean {
  return role === 'HEAD_OF_DEPARTMENT' || role === 'DIRECTOR' || role === 'ADMIN';
}

/**
 * Merge step form data + gói thầu snapshot + QĐ KHLCNT for DOCX placeholders.
 * Templates use PascalCase keys (ChuDauTu, TenDuAn, …) while JSON stores camelCase.
 */
function buildLcntDocxPayload(
  stepData: Record<string, any>,
  pkg: Record<string, any>,
  q: Record<string, any>,
  tenGoiThauColumn: string,
): Record<string, any> {
  const s = stepData || {};
  const p = pkg || {};
  const base = { ...q, ...p, ...s };
  const canCu = Array.isArray(q.canCuPhapLy) ? q.canCuPhapLy.filter(Boolean).join('; ') : '';
  const giaPkg = p.giaGoiThau;

  return {
    ...base,
    // Core fields
    TenGoiThau: s.TenGoiThau ?? p.TenGoiThau ?? p.tenGoiThau ?? tenGoiThauColumn ?? '',
    TenDuAn: s.TenDuAn ?? p.TenDuAn ?? p.tenDuAn ?? q.tenDuAn ?? '',
    ChuDauTu: s.ChuDauTu ?? p.ChuDauTu ?? p.chuDauTu ?? q.chuDauTu ?? '',
    DiaDanh: s.DiaDanh ?? p.DiaDanh ?? p.diaDanh ?? q.diaDanh ?? '',
    DonViMoi: s.DonViMoi ?? p.DonViMoi ?? p.donViMoi ?? q.donViTrinh ?? '',
    DonViTrinh: s.DonViTrinh ?? p.DonViTrinh ?? p.donViTrinh ?? q.donViTrinh ?? '',
    TenChuDauTu: s.TenChuDauTu ?? p.TenChuDauTu ?? p.tenChuDauTu ?? q.chuDauTu ?? '',
    NguonVon: s.NguonVon ?? p.NguonVon ?? p.nguonVon ?? '',
    LoaiHopDong: s.LoaiHopDong ?? p.LoaiHopDong ?? p.loaiHopDong ?? '',
    TenKeHoachLuaChonNhaThau:
      s.TenKeHoachLuaChonNhaThau ?? p.TenKeHoachLuaChonNhaThau ?? p.tenKeHoachLuaChonNhaThau ?? q.tenDuAn ?? '',
    GiaGoiThauBangSo:
      s.GiaGoiThauBangSo ?? p.GiaGoiThauBangSo ?? (giaPkg != null && giaPkg !== '' ? String(giaPkg) : ''),
    GiaTriHopDongBangSo:
      s.GiaTriHopDongBangSo ??
      p.GiaTriHopDongBangSo ??
      (giaPkg != null && giaPkg !== '' ? String(giaPkg) : ''),
    CanCuVanBanPhapLy: s.CanCuVanBanPhapLy ?? (canCu || undefined),
    // CHCT / DTRR HSMT fields
    MaSoToTrinhPheDuyetHSMT: s.MaSoToTrinhPheDuyetHSMT ?? p.MaSoToTrinhPheDuyetHSMT ?? '',
    tendonvicuatochuyengia: s.tendonvicuatochuyengia ?? p.tendonvicuatochuyengia ?? '',
    HinhThucLuaChonNhaThau: s.HinhThucLuaChonNhaThau ?? p.HinhThucLuaChonNhaThau ?? p.hinhThucLuaChon ?? '',
    HinhThucPhuongThucLuaChonNhaThau: s.HinhThucPhuongThucLuaChonNhaThau ?? p.HinhThucPhuongThucLuaChonNhaThau ?? '',
    TuyChonMuaThem: s.TuyChonMuaThem ?? p.TuyChonMuaThem ?? '',
    'ChuDauTu/DonViTuVanDauThau': s['ChuDauTu/DonViTuVanDauThau'] ?? p['ChuDauTu/DonViTuVanDauThau'] ?? s.ChuDauTu ?? p.chuDauTu ?? '',
    MaSoQuyetDinhLapHSMT: s.MaSoQuyetDinhLapHSMT ?? p.MaSoQuyetDinhLapHSMT ?? '',
    TenDonViTuVanDauThau: s.TenDonViTuVanDauThau ?? p.TenDonViTuVanDauThau ?? '',
    ThoiGianToChucLuaChonNhaThau: s.ThoiGianToChucLuaChonNhaThau ?? p.ThoiGianToChucLuaChonNhaThau ?? '',
    TenCacVanBanPhapLyLienQuan: s.TenCacVanBanPhapLyLienQuan ?? p.TenCacVanBanPhapLyLienQuan ?? (canCu || ''),
    // Thành viên TCG (expert committee) — array for row cloning
    thanhVienTCG: s.thanhVienTCG ?? [],
    // KQLCNT fields
    TenQuyetDinhPheDuyetHSMT: s.TenQuyetDinhPheDuyetHSMT ?? p.TenQuyetDinhPheDuyetHSMT ?? '',
    MaSoBCDG: s.MaSoBCDG ?? p.MaSoBCDG ?? '',
    ThoiGianRaBCDG: s.ThoiGianRaBCDG ?? p.ThoiGianRaBCDG ?? '',
    DonViLapBCDG: s.DonViLapBCDG ?? p.DonViLapBCDG ?? '',
    MaSoBBDCTL: s.MaSoBBDCTL ?? p.MaSoBBDCTL ?? '',
    ThoiGianRaBBDCTL: s.ThoiGianRaBBDCTL ?? p.ThoiGianRaBBDCTL ?? '',
    // Bidder comparison data for table rows
    danhSachNhaThauDoiChieu: s.danhSachNhaThauDoiChieu ?? [],
    NoiDungKhac: s.NoiDungKhac ?? p.NoiDungKhac ?? '',
    PhanLoNhaThauThamDu: s.PhanLoNhaThauThamDu ?? p.PhanLoNhaThauThamDu ?? '',
    LydoKhongTrungThau: s.LydoKhongTrungThau ?? p.LydoKhongTrungThau ?? '',
    // Thông tin nhà thầu trúng thầu / không trúng
    TenNhaThauTrungThau: s.TenNhaThauTrungThau ?? p.TenNhaThauTrungThau ?? '',
    NhaThau: s.NhaThau ?? p.NhaThau ?? '',
    MaSoThueNhaThau: s.MaSoThueNhaThau ?? p.MaSoThueNhaThau ?? '',
    GiaDuThau: s.GiaDuThau ?? p.GiaDuThau ?? '',
    GiaDuThauSauHieuChinh: s.GiaDuThauSauHieuChinh ?? p.GiaDuThauSauHieuChinh ?? '',
    DiemKyThuat: s.DiemKyThuat ?? p.DiemKyThuat ?? '',
    GiaDanhGia: s.GiaDanhGia ?? p.GiaDanhGia ?? '',
    GiaTrungThau: s.GiaTrungThau ?? p.GiaTrungThau ?? '',
    ThoiGianThucHienGoiThau: s.ThoiGianThucHienGoiThau ?? p.ThoiGianThucHienGoiThau ?? '',
    ThoiGianThucHienHD: s.ThoiGianThucHienHD ?? p.ThoiGianThucHienHD ?? '',
    // QĐ LCNT / Hợp đồng fields
    SoTBMT: s.SoTBMT ?? p.SoTBMT ?? '',
    SoGoiThau: s.SoGoiThau ?? p.SoGoiThau ?? '',
    VietTatNoiLuuVanBan: s.VietTatNoiLuuVanBan ?? p.VietTatNoiLuuVanBan ?? '',
    GhiChu: s.GhiChu ?? p.GhiChu ?? '',
    // Tờ trình KQLCNT new fields
    SoToTrinh: s.SoToTrinh ?? p.SoToTrinh ?? '',
    NhaThauDuocDoiChieu: s.NhaThauDuocDoiChieu ?? p.NhaThauDuocDoiChieu ?? '',
    TomTatNoiDungHSMT: s.TomTatNoiDungHSMT ?? s.TomTatThongTinHSMT ?? p.TomTatNoiDungHSMT ?? '',
    GiaGoiThauBangChu: s.GiaGoiThauBangChu ?? p.GiaGoiThauBangChu ?? '',
    // Hợp đồng - bank account fields
    SoTaiKhoanChuDauTu: s.SoTaiKhoanChuDauTu ?? p.SoTaiKhoanChuDauTu ?? '',
    NganHangChuDauTu: s.NganHangChuDauTu ?? p.NganHangChuDauTu ?? '',
    MaSoNganHangChuDauTu: s.MaSoNganHangChuDauTu ?? p.MaSoNganHangChuDauTu ?? '',
    SoTaiKhoanNhaThau: s.SoTaiKhoanNhaThau ?? p.SoTaiKhoanNhaThau ?? '',
    NganHangNhaThau: s.NganHangNhaThau ?? p.NganHangNhaThau ?? '',
    MaSoNganHangNhaThau: s.MaSoNganHangNhaThau ?? p.MaSoNganHangNhaThau ?? '',
    // Hợp đồng - bảo đảm thực hiện HĐ
    GiaTriBaoDamThucHienHD: s.GiaTriBaoDamThucHienHD ?? '',
    ThoiHanNopBaoDam: s.ThoiHanNopBaoDam ?? '',
    TyLePhanTramBaoDam: s.TyLePhanTramBaoDam ?? '',
    SoTienBaoDamBangSo: s.SoTienBaoDamBangSo ?? '',
    SoTienBaoDamBangChu: s.SoTienBaoDamBangChu ?? '',
    ThoiHanHoanTraBaoDam: s.ThoiHanHoanTraBaoDam ?? '',
    DanhSachNhaThauPhu: s.DanhSachNhaThauPhu ?? '',
    ThoiHanDeTrinhToaAn: s.ThoiHanDeTrinhToaAn ?? '',
    DanhSachChungTuCungCap: s.DanhSachChungTuCungCap ?? '',
    // Hợp đồng - giá trị & thanh toán
    TongGiaTriHopDongBangSo: s.TongGiaTriHopDongBangSo ?? '',
    TongGiaTriHopDongBangChu: s.TongGiaTriHopDongBangChu ?? '',
    TamUng: s.TamUng ?? '',
    ThanhToan: s.ThanhToan ?? '',
    TyLeThanhToan: s.TyLeThanhToan ?? '',
    SoTienThanhToanBangSo: s.SoTienThanhToanBangSo ?? '',
    SoTienThanhToanBangChu: s.SoTienThanhToanBangChu ?? '',
    HoSoThanhToan: s.HoSoThanhToan ?? '',
    ThoiHanThanhToan: s.ThoiHanThanhToan ?? '',
    // Hợp đồng - bảo hành & kiểm tra
    BaoHanh: s.BaoHanh ?? '',
    DongGoiHangHoa: s.DongGoiHangHoa ?? '',
    CacDichVuBaoGom: s.CacDichVuBaoGom ?? '',
    KiemTraThuNghiemHangHoa: s.KiemTraThuNghiemHangHoa ?? '',
    DiaDiemKiemTraThuNghiem: s.DiaDiemKiemTraThuNghiem ?? '',
    // Hợp đồng - phạt vi phạm & bồi thường
    SoTienPhatViPhamHD: s.SoTienPhatViPhamHD ?? '',
    TyLePhatMoiTuan: s.TyLePhatMoiTuan ?? '',
    MucPhatToiDa: s.MucPhatToiDa ?? '',
    BoiThuongThietHai: s.BoiThuongThietHai ?? '',
    ThoiHanBaoHanh: s.ThoiHanBaoHanh ?? '',
    DiaDiemBaoHanh: s.DiaDiemBaoHanh ?? '',
    ThoiHanSuaChuaKhacPhuc: s.ThoiHanSuaChuaKhacPhuc ?? '',
    ThoiHanCuThe: s.ThoiHanCuThe ?? '',
    TyLeThanhToanTietKiem: s.TyLeThanhToanTietKiem ?? '',
  };
}

function getRequiredApproverRole(stepKey: string): string {
  // For contract and final decision steps, require DIRECTOR
  if (stepKey === 'hop_dong' || stepKey === 'quyet_dinh_kqlcnt' || stepKey === 'quyet_dinh_lcnt') {
    return 'DIRECTOR';
  }
  return 'HEAD_OF_DEPARTMENT';
}

@Injectable()
export class ContractorSelectionService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  // ====================== AUTO FILL LOGIC ======================

  /** Get auto-fill data from previous completed steps + parent KHLCNT data */
  async getAutoFillData(selectionId: string, nextStepKey: string, procurementMethod: ProcurementMethod): Promise<Record<string, any>> {
    const mappings = AUTO_FILL_MAPPINGS[procurementMethod] || [];
    const autoFill: Record<string, any> = {};

    // First, pull data from parent QD_KHLCNT and goiThau for matching fields in the first step
    const selection = await this.prisma.contractorSelection.findUnique({
      where: { id: selectionId },
      include: { qdKhlcnt: { select: { data: true } } },
    });
    if (selection) {
      const goiThauData = (selection.data as any) || {};
      const qdData = (selection.qdKhlcnt?.data as any) || {};

      // Map KHLCNT fields → LCNT field names
      const khlcntMapping: Record<string, any> = {
        DiaDanh: qdData.diaDanh || goiThauData.diaDanh || '',
        TenDuAn: qdData.tenDuAn || '',
        TenGoiThau: goiThauData.tenGoiThau || selection.tenGoiThau || '',
        ChuDauTu: qdData.chuDauTu || goiThauData.tenChuDauTu || '',
        TenChuDauTu: qdData.chuDauTu || goiThauData.tenChuDauTu || '',
        NguonVon: goiThauData.nguonVon || qdData.nguonVon || '',
        LoaiHopDong: goiThauData.loaiHopDong || '',
        ThoiGianThucHienGoiThau: goiThauData.thoiGianThucHien || '',
        ThoiGianToChucLuaChonNhaThau: goiThauData.thoiGianToChuc || '',
        ThoiGianBatDauToChucLuaChonNhaThau: goiThauData.thoiGianBatDau || '',
        HinhThucPhuongThucLuaChonNhaThau: goiThauData.hinhThucLuaChon || '',
        HinhThucLuaChonNhaThau: goiThauData.hinhThucLuaChon || '',
        TuyChonMuaThem: goiThauData.tuyChonMuaThem || '',
        GiaGoiThauBangSo: goiThauData.giaGoiThau ? String(goiThauData.giaGoiThau) : '',
        DonViTrinh: qdData.donViTrinh || '',
        TenKeHoachLuaChonNhaThau: qdData.tenDuAn ? `KH LCNT - ${qdData.tenDuAn}` : '',
        TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau: qdData.soQuyetDinh ? `QĐ số ${qdData.soQuyetDinh}` : '',
        CanCuVanBanPhapLy: (qdData.canCuPhapLy || []).join('; '),
        TenCacVanBanPhapLyLienQuan: (qdData.canCuPhapLy || []).join('; '),
      };

      for (const [key, value] of Object.entries(khlcntMapping)) {
        if (value) autoFill[key] = value;
      }
    }

    // Then, overlay with data from previous completed LCNT steps (higher priority)
    for (const mapping of mappings) {
      if (mapping.toStep === nextStepKey) {
        const prevStep = mapping.fromStep;
        const step = await this.prisma.procurementStep.findFirst({
          where: { contractorSelectionId: selectionId, stepKey: prevStep },
        });
        if (step && step.data) {
          const data = step.data as Record<string, any>;
          for (const field of mapping.fields) {
            if (data[field]) {
              autoFill[field] = data[field];
            }
          }
        }
      }
    }

    return autoFill;
  }

  /** Get auto-fill data for a specific step by stepId */
  async getAutoFillDataForStep(stepId: string): Promise<Record<string, any>> {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: { contractorSelection: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    return this.getAutoFillData(
      step.contractorSelectionId,
      step.stepKey,
      step.contractorSelection.procurementMethod,
    );
  }

  // ====================== LIST / GET ======================

  async getApprovedQDKHLCNT(projectId?: string) {
    const where: any = { type: 'QD_KHLCNT', status: 'APPROVED' };
    if (projectId) {
      where.projectId = projectId;
    }
    return this.prisma.document.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        contractorSelections: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSelections(projectId?: string) {
    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }
    return this.prisma.contractorSelection.findMany({
      where,
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        qdKhlcnt: { select: { id: true, data: true, status: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSelectionsByQD(qdKhlcntId: string, projectId?: string) {
    const where: any = { qdKhlcntId };
    if (projectId) {
      where.projectId = projectId;
    }
    return this.prisma.contractorSelection.findMany({
      where,
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { goiThauIndex: 'asc' },
    });
  }

  async getSelection(id: string) {
    const selection = await this.prisma.contractorSelection.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true, status: true } },
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { approvalRequests: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } } },
        },
        qdKhlcnt: { select: { id: true, data: true, status: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
    });
    if (!selection) throw new NotFoundException('Không tìm thấy quy trình LCNT');
    return selection;
  }

  async getStep(stepId: string) {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: {
        contractorSelection: {
          include: {
            qdKhlcnt: { select: { id: true, data: true, status: true } },
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        approvalRequests: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    return step;
  }

  // ====================== CREATE ======================

  async createSelection(userId: string, qdKhlcntId: string, goiThauIndex: number, projectId?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: qdKhlcntId } });
    if (!doc || doc.type !== 'QD_KHLCNT' || doc.status !== 'APPROVED') {
      throw new BadRequestException('QĐ KHLCNT không hợp lệ hoặc chưa được phê duyệt');
    }

    const data = doc.data as any;
    const goiThau = data?.goiThau?.[goiThauIndex];
    if (!goiThau) {
      throw new BadRequestException('Gói thầu không tồn tại');
    }

    const htlc = (goiThau.hinhThucLuaChon || '').toLowerCase().replace(/_/g, ' ');
    let method: ProcurementMethod;
    if (htlc.includes('chi dinh') || htlc.includes('chỉ định')) {
      method = ProcurementMethod.CHI_DINH_THAU;
    } else if (htlc.includes('chào hàng') || htlc.includes('chao hang') || htlc.includes('chao hang canh tranh')) {
      method = ProcurementMethod.CHAO_HANG_CANH_TRANH;
    } else if (htlc.includes('đấu thầu rộng') || htlc.includes('dau thau rong') || htlc.includes('dau thau')) {
      method = ProcurementMethod.DAU_THAU_RONG_RAI;
    } else {
      throw new BadRequestException(`Không xác định được hình thức LCNT: "${goiThau.hinhThucLuaChon}". Vui lòng kiểm tra lại.`);
    }

    const existing = await this.prisma.contractorSelection.findUnique({
      where: { qdKhlcntId_goiThauIndex: { qdKhlcntId, goiThauIndex } },
    });
    if (existing) {
      throw new BadRequestException('Đã tồn tại quy trình LCNT cho gói thầu này');
    }

    const steps = getSteps(method);

    const selection = await this.prisma.contractorSelection.create({
      data: {
        qdKhlcntId,
        goiThauIndex,
        tenGoiThau: goiThau.tenGoiThau || `Gói thầu ${goiThauIndex + 1}`,
        procurementMethod: method,
        data: goiThau,
        createdBy: userId,
        projectId,
        steps: {
          create: steps.map(s => ({
            stepKey: s.stepKey,
            stepOrder: s.stepOrder,
            title: s.title,
            status: 'NOT_STARTED',
            requiresApproval: s.requiresApproval,
            approvalStatus: s.requiresApproval ? 'NO_APPROVAL_REQUIRED' : 'NO_APPROVAL_REQUIRED',
          })),
        },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, name: true, role: true } },
      },
    });

    return selection;
  }

  // ====================== UPDATE STEP DATA ======================

  async updateStepData(stepId: string, data: any, userId: string) {
    const step = await this.prisma.procurementStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    // Cannot edit completed steps (unless approval is rejected)
    if (step.status === 'COMPLETED') {
      throw new BadRequestException('Bước đã hoàn thành. Cần mở lại trước khi chỉnh sửa.');
    }

    // If step was rejected, reset approval status when editing
    const needsReset = step.approvalStatus === 'REJECTED';

    return this.prisma.procurementStep.update({
      where: { id: stepId },
      data: {
        data,
        status: step.status === 'NOT_STARTED' ? 'IN_PROGRESS' : step.status,
        ...(needsReset ? { approvalStatus: 'NO_APPROVAL_REQUIRED' } : {}),
      },
    });
  }

  // ====================== APPROVAL WORKFLOW ======================

  /** Request approval for a step (trình lên giám đốc/trưởng phòng) */
  async requestApproval(stepId: string, userId: string, comment?: string) {
    const step = await this.prisma.procurementStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    if (!step.requiresApproval) {
      throw new BadRequestException('Bước này không yêu cầu phê duyệt');
    }

    if (step.approvalStatus === 'PENDING_APPROVAL') {
      throw new BadRequestException('Bước đang chờ phê duyệt');
    }

    if (step.approvalStatus === 'APPROVED') {
      throw new BadRequestException('Bước đã được phê duyệt. Cần mở lại để yêu cầu phê duyệt mới.');
    }

    // Update step status
    await this.prisma.procurementStep.update({
      where: { id: stepId },
      data: { approvalStatus: 'PENDING_APPROVAL' },
    });

    // Create approval request record
    const request = await this.prisma.stepApprovalRequest.create({
      data: {
        stepId,
        userId,
        action: 'PENDING_APPROVAL',
        comment,
      },
    });

    // Notify directors about the pending approval
    const directors = await this.prisma.user.findMany({ where: { role: 'DIRECTOR' } });
    const stepData = await this.getStep(stepId);
    const selectionData = stepData.contractorSelection;
    const projectName = (selectionData.data as any)?.tenGoiThau || (selectionData.data as any)?.tenDuAn || '';

    await Promise.all(
      directors.map((u) =>
        this.notificationService.create(u.id, {
          type: NotificationType.STEP_PENDING_APPROVAL,
          title: 'Có bước LCNT chờ duyệt',
          message: `Bước "${stepData.title}" của "${projectName}" cần được phê duyệt.`,
          link: '/dashboard/mua-sam/lua-chon-nha-thau',
        }),
      ),
    );

    return stepData;
  }

  /** Approve a step */
  async approveStep(stepId: string, userId: string, userRole: string, comment?: string) {
    if (!canApprove(userRole)) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt bước này');
    }

    const step = await this.prisma.procurementStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    if (step.approvalStatus !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Bước không ở trạng thái chờ phê duyệt');
    }

    const requiredRole = getRequiredApproverRole(step.stepKey);
    if (requiredRole === 'DIRECTOR' && userRole !== 'DIRECTOR' && userRole !== 'ADMIN') {
      throw new ForbiddenException(`Bước này yêu cầu Giám đốc phê duyệt. Bạn là ${userRole === 'HEAD_OF_DEPARTMENT' ? 'Trưởng phòng' : userRole}`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Update step
      await tx.procurementStep.update({
        where: { id: stepId },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: userId,
          approvedAt: new Date(),
          approverRole: userRole,
          approvalComment: comment || null,
        },
      });

      // Create approval record
      await tx.stepApprovalRequest.create({
        data: {
          stepId,
          userId,
          action: 'APPROVED',
          comment,
        },
      });
    });

    const stepData = await this.getStep(stepId);
    const selectionData = stepData.contractorSelection;
    const projectName = (selectionData.data as any)?.tenGoiThau || (selectionData.data as any)?.tenDuAn || '';

    // Notify the requester about approval
    const requester = await this.prisma.stepApprovalRequest.findFirst({
      where: { stepId, action: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'asc' },
    });
    if (requester) {
      await this.notificationService.create(requester.userId, {
        type: NotificationType.STEP_APPROVED,
        title: 'Bước LCNT đã được phê duyệt',
        message: `Bước "${stepData.title}" của "${projectName}" đã được phê duyệt.`,
        link: '/dashboard/mua-sam/lua-chon-nha-thau',
      });
    }

    return stepData;
  }

  /** Reject a step */
  async rejectStep(stepId: string, userId: string, userRole: string, comment: string) {
    if (!canApprove(userRole)) {
      throw new ForbiddenException('Bạn không có quyền từ chối bước này');
    }

    const step = await this.prisma.procurementStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    if (step.approvalStatus !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Bước không ở trạng thái chờ phê duyệt');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.procurementStep.update({
        where: { id: stepId },
        data: {
          approvalStatus: 'REJECTED',
          approvedBy: null,
          approvedAt: null,
          approverRole: null,
        },
      });

      await tx.stepApprovalRequest.create({
        data: {
          stepId,
          userId,
          action: 'REJECTED',
          comment,
        },
      });
    });

    const stepData = await this.getStep(stepId);
    const selectionData = stepData.contractorSelection;
    const projectName = (selectionData.data as any)?.tenGoiThau || (selectionData.data as any)?.tenDuAn || '';

    const requester = await this.prisma.stepApprovalRequest.findFirst({
      where: { stepId, action: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'asc' },
    });
    if (requester) {
      await this.notificationService.create(requester.userId, {
        type: NotificationType.STEP_REJECTED,
        title: 'Bước LCNT bị từ chối',
        message: `Bước "${stepData.title}" của "${projectName}" đã bị từ chối. Lý do: ${comment || 'Không có'}`.slice(0, 500),
        link: '/dashboard/mua-sam/lua-chon-nha-thau',
      });
    }

    return stepData;
  }

  /** Get steps pending approval (for approval dashboard) */
  async getPendingApprovals(projectId?: string) {
    const where: any = {
      approvalStatus: 'PENDING_APPROVAL',
      requiresApproval: true,
    };
    if (projectId) {
      where.contractorSelection = { projectId };
    }
    const steps = await this.prisma.procurementStep.findMany({
      where,
      include: {
        contractorSelection: {
          include: {
            project: { select: { id: true, tenDuAn: true, procurementType: true } },
            qdKhlcnt: { select: { id: true, data: true } },
            creator: { select: { id: true, name: true, role: true } },
          },
        },
        approvalRequests: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
    return steps;
  }

  // ====================== CONTRACT PACKAGE TYPE ======================

  async setContractPackageType(selectionId: string, packageType: string) {
    const valid = ['GOI_THAU_TU_VAN', 'GOI_THAU_PHI_TU_VAN', 'GOI_THAU_TRIEN_KHAI'];
    if (!valid.includes(packageType)) {
      throw new BadRequestException(`Loại gói thầu không hợp lệ: ${packageType}`);
    }
    return this.prisma.contractorSelection.update({
      where: { id: selectionId },
      data: { contractPackageType: packageType as any },
    });
  }

  // ====================== STEP COMPLETION ======================

  async completeStep(stepId: string) {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: { contractorSelection: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    // Verify previous steps are completed
    const allSteps = await this.prisma.procurementStep.findMany({
      where: { contractorSelectionId: step.contractorSelectionId },
      orderBy: { stepOrder: 'asc' },
    });

    for (const s of allSteps) {
      if (s.stepOrder < step.stepOrder && s.status !== 'COMPLETED') {
        throw new BadRequestException(`Cần hoàn thành bước "${s.title}" trước`);
      }
    }

    // If step requires approval, must be approved first
    if (step.requiresApproval && step.approvalStatus !== 'APPROVED') {
      if (step.approvalStatus === 'PENDING_APPROVAL') {
        throw new BadRequestException('Bước đang chờ phê duyệt. Vui lòng đợi Giám đốc/Trưởng phòng phê duyệt.');
      }
      if (step.approvalStatus === 'NO_APPROVAL_REQUIRED') {
        throw new BadRequestException('Bước cần được trình lên Giám đốc/Trưởng phòng trước khi hoàn thành.');
      }
      throw new BadRequestException('Bước đang bị từ chối. Vui lòng chỉnh sửa và trình lại.');
    }

    const updated = await this.prisma.procurementStep.update({
      where: { id: stepId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const stepData = await this.getStep(stepId);
    const selectionData = stepData.contractorSelection;
    const projectName = (selectionData.data as any)?.tenGoiThau || (selectionData.data as any)?.tenDuAn || '';

    // Notify the creator of the contractor selection
    await this.notificationService.create(selectionData.createdBy, {
      type: NotificationType.STEP_COMPLETED,
      title: 'Bước LCNT đã hoàn thành',
      message: `Bước "${stepData.title}" của "${projectName}" đã hoàn thành.`,
      link: '/dashboard/mua-sam/lua-chon-nha-thau',
    });

    return updated;
  }

  async reopenStep(stepId: string) {
    const step = await this.prisma.procurementStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    if (step.status !== 'COMPLETED') {
      throw new BadRequestException('Bước này chưa hoàn thành, không cần mở lại');
    }

    return this.prisma.procurementStep.update({
      where: { id: stepId },
      data: { status: 'IN_PROGRESS', completedAt: null },
    });
  }

  // ====================== DOCX ======================

  async generateStepDocx(stepId: string): Promise<Buffer> {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: { contractorSelection: { include: { qdKhlcnt: true } } },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    if (isAttachmentOnlyStep(step.stepKey)) {
      throw new BadRequestException('Bước này chỉ hỗ trợ đính kèm file, không có mẫu DOCX');
    }

    const selection = step.contractorSelection;
    const qdData = (selection.qdKhlcnt.data as any) || {};
    const goiThauData = (selection.data as any) || {};
    const stepData = (step.data as any) || {};

    const docxData = buildLcntDocxPayload(stepData, goiThauData, qdData, selection.tenGoiThau);

    return generateContractorSelectionDocx(
      selection.procurementMethod,
      step.stepKey,
      docxData,
    );
  }

  async generateAndSaveDocx(stepId: string): Promise<string> {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: { contractorSelection: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const buffer = await this.generateStepDocx(stepId);
    const label = this.getStepDocFilename(step.stepKey, step.contractorSelection.tenGoiThau);
    const objectName = `lcnt/${step.contractorSelection.id}/${step.stepKey}/${label}.docx`;
    await this.minio.upload(objectName, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    await this.prisma.procurementStep.update({
      where: { id: stepId },
      data: { attachmentPath: objectName },
    });

    return objectName;
  }

  // ====================== FILE UPLOAD ======================

  async uploadAttachment(stepId: string, file: { buffer: Buffer; originalname: string; mimetype: string; ghiChu?: string }): Promise<string> {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: { contractorSelection: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._\u00C0-\u024F\u1E00-\u1EFF-]/g, '_');
    const objectName = `lcnt/${step.contractorSelection.id}/${step.stepKey}/${safeName}`;

    await this.minio.upload(objectName, file.buffer, file.mimetype);

    const existingData = (step.data as any) || {};
    const attachments: any[] = existingData._attachments || [];
    // Store each attachment with metadata (filename + ghi chu)
    const attachmentMeta: any = { path: objectName, fileName: file.originalname };
    if (file.ghiChu) attachmentMeta.ghiChu = file.ghiChu;
    attachments.push(attachmentMeta);

    await this.prisma.procurementStep.update({
      where: { id: stepId },
      data: {
        data: { ...existingData, _attachments: attachments },
        status: step.status === 'NOT_STARTED' ? 'IN_PROGRESS' : step.status,
      },
    });

    return objectName;
  }

  async deleteAttachment(stepId: string, objectPath: string) {
    const step = await this.prisma.procurementStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const data = (step.data as any) || {};
    const attachments: string[] = data._attachments || [];
    const idx = attachments.indexOf(objectPath);
    if (idx !== -1) {
      attachments.splice(idx, 1);
    }

    await this.prisma.procurementStep.update({
      where: { id: stepId },
      data: { data: { ...data, _attachments: attachments } },
    });

    try {
      await this.minio.delete(objectPath);
    } catch { /* ignore delete errors */ }
  }

  async getFileUrl(objectName: string): Promise<string> {
    return this.minio.getPresignedUrl(objectName, 7200);
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    return this.minio.download(objectName);
  }

  async getOnlyofficeConfigForFile(objectPath: string) {
    const appUrl = process.env.APP_URL || 'http://demo.jtsc.vn';
    const onlyofficeUrl = process.env.ONLYOFFICE_URL || 'https://jtsconlyoffice.duckdns.org';
    const onlyofficeSecret = process.env.ONLYOFFICE_JWT_SECRET || '10122002';

    const downloadToken = this.jwtService.sign(
      { path: objectPath, purpose: 'lcnt-download' },
      { expiresIn: '1h' },
    );

    const filename = objectPath.split('/').pop() || 'document';
    const ext = filename.split('.').pop()?.toLowerCase() || 'docx';
    const fileType = ext === 'xlsx' || ext === 'xls' ? 'cell' : ext === 'pptx' || ext === 'ppt' ? 'slide' : 'word';
    const docKey = `lcnt_${Buffer.from(objectPath).toString('base64url')}_${Date.now()}`;

    const editorConfig: any = {
      document: {
        fileType: ext,
        key: docKey,
        title: decodeURIComponent(filename),
        url: `${appUrl}/api/contractor-selection/file/download-public?token=${downloadToken}`,
      },
      documentType: fileType,
      editorConfig: {
        mode: 'view',
        lang: 'vi',
      },
    };

    const token = this.jwtService.sign(editorConfig, {
      secret: onlyofficeSecret,
      expiresIn: '1h',
    });

    return { onlyofficeUrl, editorConfig: { ...editorConfig, token } };
  }

  verifyFileDownloadToken(token: string): string {
    const payload = this.jwtService.verify(token);
    if (payload.purpose !== 'lcnt-download' || !payload.path) {
      throw new BadRequestException('Token không hợp lệ');
    }
    return payload.path;
  }

  // ====================== COMPLETED CONTRACTS ======================

  async getCompletedContracts(projectId?: string) {
    const where: any = { stepKey: 'hop_dong', status: 'COMPLETED' };
    if (projectId) {
      where.contractorSelection = { projectId };
    }
    const steps = await this.prisma.procurementStep.findMany({
      where,
      include: {
        contractorSelection: {
          include: {
            qdKhlcnt: { select: { id: true, data: true } },
            project: { select: { id: true, tenDuAn: true, procurementType: true } },
            creator: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
    return steps;
  }

  getStepDocFilename(stepKey: string, tenGoiThau: string): string {
    const labels: Record<string, string> = {
      cong_van_tham_gia: 'Công văn xin tham gia',
      thu_moi_hoan_thien: 'Thư mời thương thảo hợp đồng',
      bien_ban_hoan_thien: 'Biên bản hoàn thiện hợp đồng',
      to_trinh_kqlcnt: 'Tờ trình phê duyệt KQLCNT',
      quyet_dinh_kqlcnt: 'Quyết định phê duyệt KQLCNT',
      hop_dong: 'Hợp đồng',
      thong_tin_to_chuyen_gia: 'Thông tin tổ chuyên gia',
      san_pham_hsmt: 'Sản phẩm HSMT',
      to_trinh_hsmt: 'Tờ trình phê duyệt HSMT',
      bao_cao_tham_dinh_hsmt: 'Báo cáo thẩm định HSMT',
      quyet_dinh_hsmt: 'QĐ phê duyệt HSMT',
      dang_tai_hsmt: 'Đăng tải HSMT',
      bao_cao_danh_gia_hsdt: 'Báo cáo đánh giá HSDT',
      bien_ban_doi_chieu: 'Biên bản đối chiếu tài liệu',
      bao_cao_tham_dinh_kqlcnt: 'BC thẩm định KQLCNT',
      quyet_dinh_lcnt: 'QĐ lựa chọn nhà thầu',
      dang_tai_lcnt: 'Đăng tải thông tin LCNT',
    };
    const label = labels[stepKey] || stepKey;
    return `${label} - ${tenGoiThau}`;
  }

  /** List all downloadable files for ZIP preview */
  async getZipFileList(selectionId: string) {
    const selection = await this.prisma.contractorSelection.findUnique({
      where: { id: selectionId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!selection) throw new NotFoundException('Không tìm thấy quy trình LCNT');

    const files: { stepId: string; stepTitle: string; filename: string; type: string; source: 'generate' | 'minio'; objectPath?: string }[] = [];

    for (const step of selection.steps) {
      const hasDocx = !isAttachmentOnlyStep(step.stepKey);
      // Generated DOCX
      if (hasDocx) {
        const docName = this.getStepDocFilename(step.stepKey, selection.tenGoiThau) + '.docx';
        files.push({ stepId: step.id, stepTitle: step.title, filename: docName, type: 'docx', source: 'generate' });
      }
      // User-uploaded attachments
      const data = (step.data as any) || {};
      const attachments: any[] = data._attachments || [];
      for (const att of attachments) {
        const attObj = typeof att === 'string' ? { path: att, fileName: att.split('/').pop() } : att;
        files.push({ stepId: step.id, stepTitle: step.title, filename: `${step.title} - ${attObj.fileName || attObj.path.split('/').pop()}`, type: 'attachment', source: 'minio', objectPath: attObj.path });
      }
    }

    return { files, zipName: `${selection.tenGoiThau}.zip` };
  }
}
