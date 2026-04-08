'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ContractorSelection, ProcurementStep } from '@/lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const METHOD_LABELS: Record<string, string> = {
  CHI_DINH_THAU: 'Chỉ định thầu',
  CHAO_HANG_CANH_TRANH: 'Chào hàng cạnh tranh',
  DAU_THAU_RONG_RAI: 'Đấu thầu rộng rãi',
};

const STEP_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
};
const STEP_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const ATTACHMENT_ONLY = new Set([
  'cong_van_tham_gia', 'thong_tin_to_chuyen_gia', 'san_pham_hsmt',
  'bao_cao_tham_dinh_hsmt', 'dang_tai_hsmt', 'bao_cao_danh_gia_hsdt',
  'bien_ban_doi_chieu', 'bao_cao_tham_dinh_kqlcnt', 'dang_tai_lcnt',
]);

const HYBRID_STEPS = new Set(['dang_tai_hsmt']);

// Steps where "Có/Không" toggle is shown - if "Không" → auto-complete
const OPTIONAL_STEPS = new Set(['bao_cao_tham_dinh_hsmt']);

const CDT_STEP_FIELDS: Record<string, { key: string; label: string; type?: 'textarea' | 'date' }[]> = {
  thu_moi_hoan_thien: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'NamThucHienHopDong', label: 'Năm thực hiện hợp đồng' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenVietTatChuDauTu', label: 'Tên viết tắt chủ đầu tư' },
    { key: 'TenVietTatNhaThau', label: 'Tên viết tắt nhà thầu' },
    { key: 'DonViMoi', label: 'Đơn vị mời' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'CanCuVanBanPhapLy', label: 'Căn cứ văn bản pháp lý', type: 'textarea' },
    { key: 'DaiDien', label: 'Đại diện' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
    { key: 'ChucVu', label: 'Chức vụ' },
    { key: 'DiaChi', label: 'Địa chỉ' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ chủ đầu tư' },
    { key: 'MaSoThue', label: 'Mã số thuế' },
    { key: 'DienThoai', label: 'Điện thoại' },
    { key: 'SoTaiKhoanCDT', label: 'Số tài khoản chủ đầu tư' },
    { key: 'TaiNganHang', label: 'Tài ngân hàng' },
    { key: 'SoTaiKhoan', label: 'Số tài khoản' },
    { key: 'SanPhamGoiThau', label: 'Sản phẩm gói thầu' },
    { key: 'SoLuong', label: 'Số lượng' },
    { key: 'SoNgayThucHienHopDong', label: 'Số ngày thực hiện hợp đồng' },
    { key: 'GiaTriHopDongBangSo', label: 'Giá trị hợp đồng bằng số' },
    { key: 'GiaTriHopDongBangChu', label: 'Giá trị hợp đồng bằng chữ' },
  ],
  bien_ban_hoan_thien: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'Ngay', label: 'Ngày' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'HomNay', label: 'Hôm nay' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'ChucVu', label: 'Chức vụ' },
    { key: 'DiaChi', label: 'Địa chỉ' },
    { key: 'SoTaiKhoanCDT', label: 'Số tài khoản chủ đầu tư' },
    { key: 'NganHangCDT', label: 'Ngân hàng chủ đầu tư' },
    { key: 'MaNganHangCDT', label: 'Mã ngân hàng chủ đầu tư' },
    { key: 'MaSoThueCDT', label: 'Mã số thuế chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'DaiDienNhaThau', label: 'Đại diện nhà thầu' },
    { key: 'SoDienThoai', label: 'Số điện thoại' },
    { key: 'SoTaiKhoanNT', label: 'Số tài khoản nhà thầu' },
    { key: 'NganHangNT', label: 'Ngân hàng nhà thầu' },
    { key: 'MaNganHangNT', label: 'Mã ngân hàng nhà thầu' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'GiaTriHopDongBangSo', label: 'Giá trị hợp đồng bằng số' },
  ],
  to_trinh_kqlcnt: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'DonViTrinh', label: 'Đơn vị trình' },
    { key: 'TenVietTatDonViTrinh', label: 'Tên viết tắt đơn vị trình' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
    { key: 'CanCuVanBanPhapLy', label: 'Căn cứ văn bản pháp lý', type: 'textarea' },
    { key: 'GiaTriHopDongBangSo', label: 'Giá trị hợp đồng bằng số' },
    { key: 'GiaTriHopDongBangChu', label: 'Giá trị hợp đồng bằng chữ' },
    { key: 'NguonVon', label: 'Nguồn vốn' },
    { key: 'ThoiGianLuaChonNhaThau', label: 'Thời gian lựa chọn nhà thầu' },
    { key: 'ThoiGianBatDauToChucLuaChonNhaThau', label: 'Thời gian bắt đầu tổ chức LCNT' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'ThoiGianThucHienGoiThau', label: 'Thời gian thực hiện gói thầu' },
    { key: 'CoKhongApDung', label: 'Có/Không áp dụng ưu đãi' },
    { key: 'TenVietTatNhaThau', label: 'Tên viết tắt nhà thầu' },
    { key: 'MaSoThueNhaThau', label: 'Mã số thuế nhà thầu' },
    { key: 'CoQuanCapMaSoThue', label: 'Cơ quan cấp mã số thuế' },
    { key: 'NgayCapMaSoThueNhaThau', label: 'Ngày cấp MST nhà thầu' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ nhà thầu' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'ThoiGianThucHienHopDong', label: 'Thời gian thực hiện hợp đồng' },
    { key: 'GhiChuThoiGian', label: 'Ghi chú thời gian' },
  ],
  quyet_dinh_kqlcnt: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenVietTatChuDauTu', label: 'Tên viết tắt chủ đầu tư' },
    { key: 'DonViMoi', label: 'Đơn vị mời' },
    { key: 'DonViTrinh', label: 'Đơn vị trình' },
    { key: 'TenVietTatDonViTrinh', label: 'Tên viết tắt đơn vị trình' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
    { key: 'CanCuVanBanPhapLy', label: 'Căn cứ văn bản pháp lý', type: 'textarea' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'GiaTriDuToanDuocDuyet', label: 'Giá trị dự toán được duyệt' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'ThoiGianThucHienGoiThau', label: 'Thời gian thực hiện gói thầu' },
    { key: 'MaSoThueNhaThau', label: 'Mã số thuế nhà thầu' },
    { key: 'GiaTrungThau', label: 'Giá trúng thầu' },
    { key: 'ThoiGianThucHienHopDong', label: 'Thời gian thực hiện hợp đồng' },
  ],
  hop_dong: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'MaSoHD', label: 'Mã số hợp đồng' },
    { key: 'NamKyHD', label: 'Năm ký hợp đồng' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện chủ đầu tư' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ chủ đầu tư' },
    { key: 'SoDienThoaiChuDauTu', label: 'Số điện thoại chủ đầu tư' },
    { key: 'SoTaiKhoanChuDauTu', label: 'Số tài khoản chủ đầu tư' },
    { key: 'NganHangChuDauTu', label: 'Ngân hàng chủ đầu tư' },
    { key: 'MaSoNganHangChuDauTu', label: 'Mã số ngân hàng chủ đầu tư' },
    { key: 'MaSoThueChuDauTu', label: 'Mã số thuế chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'DaiDienNhaThau', label: 'Đại diện nhà thầu' },
    { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện nhà thầu' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ nhà thầu' },
    { key: 'SoDienThoaiNhaThau', label: 'Số điện thoại nhà thầu' },
    { key: 'SoTaiKhoanNhaThau', label: 'Số tài khoản nhà thầu' },
    { key: 'NganHangNhaThau', label: 'Ngân hàng nhà thầu' },
    { key: 'MaSoNganHangNhaThau', label: 'Mã số ngân hàng nhà thầu' },
    { key: 'MaSoThueNhaThau', label: 'Mã số thuế nhà thầu' },
    { key: 'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', label: 'Tên quyết định phê duyệt KHLCNT' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'GiaHDBangSo', label: 'Giá HĐ bằng số' },
    { key: 'GiaHDBangChu', label: 'Giá HĐ bằng chữ' },
    { key: 'ThoiGianThucHienHD', label: 'Thời gian thực hiện hợp đồng' },
  ],
};

const CHCT_STEP_FIELDS: Record<string, { key: string; label: string; type?: 'textarea' | 'date' }[]> = {
  to_trinh_hsmt: [
    { key: 'tendonvicuatochuyengia', label: 'Tên tổ chức, đơn vị' },
    { key: 'MaSoToTrinhPheDuyetHSMT', label: 'Mã số tờ trình phê duyệt HSMT' },
    { key: 'ĐiaDanh', label: 'Địa danh' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenKeHoachLuaChonNhaThau', label: 'Tên kế hoạch lựa chọn nhà thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'TenChuDauTu', label: 'Tên chủ đầu tư' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', label: 'Tên quyết định phê duyệt KHLCNT' },
    { key: 'TenCacVanBanPhapLyLienQuan', label: 'Tên các văn bản pháp lý liên quan', type: 'textarea' },
    { key: 'GiaGoiThauBangSo', label: 'Giá gói thầu bằng số' },
    { key: 'GiaGoiThauBangChu', label: 'Giá gói thầu bằng chữ' },
    { key: 'NguonVon', label: 'Nguồn vốn' },
    { key: 'ThoiGianToChucLuaChonNhaThau', label: 'Thời gian tổ chức lựa chọn nhà thầu' },
    { key: 'ThoiGianBatDauToChucLuaChonNhaThau', label: 'Thời gian bắt đầu tổ chức LCNT' },
    { key: 'HinhThucPhuongThucLuaChonNhaThau', label: 'Hình thức/phương thức lựa chọn nhà thầu' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'ThoiGianThucHienGoiThau', label: 'Thời gian thực hiện gói thầu' },
    { key: 'TuyChonMuaThem', label: 'Tùy chọn mua thêm' },
    { key: 'ChuDauTu/DonViTuVanDauThau', label: 'CĐT/đơn vị tư vấn đấu thầu' },
    { key: 'MaSoQuyetDinhLapHSMT', label: 'Mã số quyết định lập HSMT' },
    { key: 'MaSoHD', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHĐ', label: 'Thời gian ký hợp đồng' },
    { key: 'TenDonViTuVanDauThau', label: 'Tên đơn vị tư vấn đấu thầu' },
    { key: 'STT', label: 'STT' },
    { key: 'HoVaTenThanhVienTCG', label: 'Họ và tên thành viên tổ chuyên gia' },
    { key: 'ChucVuTrongTCG', label: 'Chức vụ trong tổ chuyên gia' },
    { key: 'PhanCongCongViec', label: 'Phân công công việc' },
    { key: 'CachThucLamViecCuaToChuyenGia', label: 'Cách thức làm việc của tổ chuyên gia' },
    { key: 'TomTatNoiDungHSMT', label: 'Tóm tắt nội dung HSMT', type: 'textarea' },
    { key: 'YKienBaoLuuTongQuat', label: 'Ý kiến bảo lưu tổng quát', type: 'textarea' },
    { key: 'NoiDungHSMTBaoLuu', label: 'Nội dung HSMT bảo lưu' },
    { key: 'YKienBaoLuu', label: 'Ý kiến bảo lưu' },
    { key: 'LyDoBaoLuu', label: 'Lý do bảo lưu' },
    { key: 'TenChuyenGia1', label: 'Tên chuyên gia 1' },
    { key: 'TenChuyenGia2', label: 'Tên chuyên gia 2' },
    { key: 'TenChuyenGia3', label: 'Tên chuyên gia 3' },
  ],
  quyet_dinh_hsmt: [
    { key: 'TenChuDauTu', label: 'Tên chủ đầu tư' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenKeHoachLuaChonNhaThau', label: 'Tên kế hoạch lựa chọn nhà thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện theo pháp luật của chủ đầu tư' },
    { key: 'ThoiGianToTrinhPheDuyetHSMT', label: 'Thời gian tờ trình phê duyệt HSMT' },
    { key: 'TenCacVanBanPhapLyLienQuan', label: 'Tên các văn bản pháp lý liên quan', type: 'textarea' },
    { key: 'DonViDuocGiao', label: 'Đơn vị được giao' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện chủ đầu tư' },
  ],
  to_trinh_kqlcnt: [
    { key: 'SoToTrinh', label: 'Số tờ trình' },
    { key: 'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', label: 'Tên quyết định phê duyệt KHLCNT' },
    { key: 'TenQuyetDinhPheDuyetHSMT', label: 'Tên quyết định phê duyệt HSMT' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'MaSoBCDG', label: 'Mã số báo cáo đánh giá' },
    { key: 'ThoiGianRaBCDG', label: 'Thời gian ra báo cáo đánh giá' },
    { key: 'DonViLapBCDG', label: 'Đơn vị lập báo cáo đánh giá' },
    { key: 'MaSoBBDCTL', label: 'Mã số biên bản đối chiếu tài liệu' },
    { key: 'ThoiGianRaBBDCTL', label: 'Thời gian ra biên bản đối chiếu' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThauDuocDoiChieu', label: 'Nhà thầu được đối chiếu' },
    { key: 'GiaGoiThauBangSo', label: 'Giá gói thầu bằng số' },
    { key: 'NguonVon', label: 'Nguồn vốn' },
    { key: 'ThoiGianToChucLuaChonNhaThau', label: 'Thời gian tổ chức lựa chọn nhà thầu' },
    { key: 'ThoiGianBatDauToChucLuaChonNhaThau', label: 'Thời gian bắt đầu tổ chức LCNT' },
    { key: 'HinhThucPhuongThucLuaChonNhaThau', label: 'Hình thức/phương thức LCNT' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'ThoiGianThucHienGoiThau', label: 'Thời gian thực hiện gói thầu' },
    { key: 'TuyChonMuaThem', label: 'Tùy chọn mua thêm' },
    { key: 'STT', label: 'STT' },
    { key: 'TenNhaThauDoiChieu', label: 'Tên nhà thầu đối chiếu' },
    { key: 'DanhGiaTinhHopLe', label: 'Đánh giá tính hợp lệ' },
    { key: 'DanhGiaNangLucKinhNghiem', label: 'Đánh giá năng lực kinh nghiệm' },
    { key: 'DanhGiaKyThuat', label: 'Đánh giá kỹ thuật' },
    { key: 'XepHangCuaNhaThauDoiChieu', label: 'Xếp hạng nhà thầu đối chiếu' },
    { key: 'KetQuaThuongThaoHopDong', label: 'Kết quả thương thảo hợp đồng' },
    { key: 'DanhSachNhaThauBiLoai', label: 'Danh sách nhà thầu bị loại' },
    { key: 'LyDoNhaThauBiLoai', label: 'Lý do nhà thầu bị loại' },
    { key: 'TenNhaThauDeNghiTrungThau', label: 'Tên nhà thầu đề nghị trúng thầu' },
    { key: 'GiaDeNghiTrungThau', label: 'Giá đề nghị trúng thầu' },
    { key: 'ThoiGianThucHienHD', label: 'Thời gian thực hiện hợp đồng' },
    { key: 'NhanXetTinhCanhTranhCongBangMinhBach', label: 'Nhận xét tính cạnh tranh, công bằng, minh bạch', type: 'textarea' },
    { key: 'NoiDungHSMTChuaPhuHopVaBienPhapXuLy', label: 'Nội dung HSMT chưa phù hợp và biện pháp xử lý' },
    { key: 'ThoiGianDangTaiKHLCNT', label: 'Thời gian đăng tải KHLCNT' },
    { key: 'ThoiGianDangTaiTBMTVaPhatHanhHSMT', label: 'Thời gian đăng tải TBMT và phát hành HSMT' },
    { key: 'ThoiGianLamRoHSMT', label: 'Thời gian làm rõ HSMT' },
    { key: 'ThoiGianSuaDoiEHSMT', label: 'Thời gian sửa đổi e-HSMT' },
    { key: 'ThoiDiemDongThau', label: 'Thời điểm đóng thầu' },
    { key: 'ThoiGianMoThau', label: 'Thời gian mở thầu' },
    { key: 'CacVanDeKhacKhiMoThau', label: 'Các vấn đề khác khi mở thầu' },
    { key: 'ThoiGianDanhGiaHSDT', label: 'Thời gian đánh giá HSDT' },
    { key: 'XuLyTinhHuongTrongDanhGia', label: 'Xử lý tình huống trong đánh giá' },
    { key: 'NhaThauVuotQuaKyThuat', label: 'Nhà thầu vượt qua kỹ thuật' },
    { key: 'YKienBenMoiThauVeBaoCao', label: 'Ý kiến bên mời thầu về báo cáo' },
    { key: 'NhanXetTinhMinhBachCuaBenMoiThau', label: 'Nhận xét tính minh bạch của bên mời thầu' },
    { key: 'KetQuaDoiChieuTaiLieu', label: 'Kết quả đối chiếu tài liệu' },
    { key: 'VanDePhatSinhKhiDoiChieu', label: 'Vấn đề phát sinh khi đối chiếu' },
    { key: 'QuaTrinhThuongThaoHopDong', label: 'Quá trình thương thảo hợp đồng' },
    { key: 'TenNhaThau', label: 'Tên nhà thầu' },
    { key: 'TenChuDauTu', label: 'Tên chủ đầu tư' },
    { key: 'TenNhaThauTrungThau', label: 'Tên nhà thầu trúng thầu' },
    { key: 'MaSoThueNhaThau', label: 'Mã số thuế nhà thầu' },
    { key: 'GiaDuThau', label: 'Giá dự thầu' },
    { key: 'GiaDuThauSauHieuChinh', label: 'Giá dự thầu sau hiệu chỉnh' },
    { key: 'GiaTrungThau', label: 'Giá trúng thầu' },
    { key: 'ThoiGianThucHienHopDong', label: 'Thời gian thực hiện hợp đồng' },
    { key: 'NoiDungKhacCuaNhaThauTrungThau', label: 'Nội dung khác của nhà thầu trúng thầu' },
    { key: 'NhaThauKhongTrungThau', label: 'Nhà thầu không trúng thầu' },
    { key: 'TenDonViTrinh', label: 'Tên đơn vị trình' },
    { key: 'ChucDanhNguoiKy', label: 'Chức danh người ký' },
    { key: 'HoVaTenNguoiKy', label: 'Họ và tên người ký' },
  ],
  quyet_dinh_lcnt: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenKeHoachLuaChonNhaThau', label: 'Tên kế hoạch lựa chọn nhà thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện theo pháp luật của chủ đầu tư' },
    { key: 'SoTBMT', label: 'Số thông báo mời thầu' },
    { key: 'SoGoiThau', label: 'Số gói thầu' },
    { key: 'GiaGoiThauBangSo', label: 'Giá gói thầu bằng số' },
    { key: 'GiaGoiThauBangChu', label: 'Giá gói thầu bằng chữ' },
    { key: 'HinhThucLuaChonNhaThau', label: 'Hình thức lựa chọn nhà thầu' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'ThoiGianThucHienGoiThau', label: 'Thời gian thực hiện gói thầu' },
    { key: 'TenNhaThauTrungThau', label: 'Tên nhà thầu trúng thầu' },
    { key: 'NhaThauTrungThau', label: 'Nhà thầu trúng thầu' },
    { key: 'MaSoThueNhaThau', label: 'Mã số thuế nhà thầu' },
    { key: 'GiaDuThau', label: 'Giá dự thầu' },
    { key: 'GiaDuThauSauHieuChinh', label: 'Giá dự thầu sau hiệu chỉnh' },
    { key: 'DiemKyThuat', label: 'Điểm kỹ thuật' },
    { key: 'GiaDanhGia', label: 'Giá đánh giá' },
    { key: 'GiaTrungThau', label: 'Giá trúng thầu' },
    { key: 'ThoiGianThucHienHD', label: 'Thời gian thực hiện hợp đồng' },
    { key: 'NoiDungKhac', label: 'Nội dung khác' },
    { key: 'NhaThauKhongTrungThau', label: 'Nhà thầu không trúng thầu' },
    { key: 'PhanLoNhaThauThamDu', label: 'Phần/lô nhà thầu tham dự' },
    { key: 'LydoKhongTrungThau', label: 'Lý do không trúng thầu' },
    { key: 'TenCacVanBanPhapLyLienQuan', label: 'Tên các văn bản pháp lý liên quan', type: 'textarea' },
    { key: 'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', label: 'Tên quyết định phê duyệt KHLCNT' },
    { key: 'DonViDuocGiao', label: 'Đơn vị được giao' },
    { key: 'VietTatNoiLuuVanBan', label: 'Viết tắt nơi lưu văn bản' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện chủ đầu tư' },
  ],
  hop_dong: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'MaSoHD', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHĐ', label: 'Thời gian ký hợp đồng' },
    { key: 'NamKyHD', label: 'Năm ký hợp đồng' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án/dự toán mua sắm' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenQuyetDinhPheDuyetKeHoachLuaChonNhaThau', label: 'Tên quyết định phê duyệt KHLCNT' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện chủ đầu tư' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ chủ đầu tư' },
    { key: 'SoDienThoaiChuDauTu', label: 'Số điện thoại chủ đầu tư' },
    { key: 'SoTaiKhoanChuDauTu', label: 'Số tài khoản chủ đầu tư' },
    { key: 'NganHangChuDauTu', label: 'Ngân hàng chủ đầu tư' },
    { key: 'MaSoNganHangChuDauTu', label: 'Mã số ngân hàng chủ đầu tư' },
    { key: 'MaSoThueChuDauTu', label: 'Mã số thuế chủ đầu tư' },
    { key: 'DaiDienNhaThau', label: 'Đại diện nhà thầu' },
    { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện nhà thầu' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ nhà thầu' },
    { key: 'SoDienThoaiNhaThau', label: 'Số điện thoại nhà thầu' },
    { key: 'SoTaiKhoanNhaThau', label: 'Số tài khoản nhà thầu' },
    { key: 'NganHangNhaThau', label: 'Ngân hàng nhà thầu' },
    { key: 'MaSoNganHangNhaThau', label: 'Mã số ngân hàng nhà thầu' },
    { key: 'MaSoThueNhaThau', label: 'Mã số thuế nhà thầu' },
    { key: 'ThanhPhanHDVaThuTuUuTienPhapLy', label: 'Thành phần HĐ và thứ tự ưu tiên pháp lý', type: 'textarea' },
    { key: 'LoaiHopDong', label: 'Loại hợp đồng' },
    { key: 'GiaHDBangSo', label: 'Giá hợp đồng bằng số' },
    { key: 'GiaHDBangChu', label: 'Giá hợp đồng bằng chữ' },
    { key: 'TongSoLuongInHD', label: 'Tổng số lượng in hợp đồng' },
    { key: 'SoLuongHDCuaChuDauTu', label: 'Số lượng HĐ của chủ đầu tư' },
    { key: 'SoLuongHDCuaNhaThau', label: 'Số lượng HĐ của nhà thầu' },
    { key: 'ThoiGianThucHienHD', label: 'Thời gian thực hiện hợp đồng' },
    { key: 'HieuLucHD', label: 'Hiệu lực hợp đồng' },
    { key: 'GiaTriBaoDamThucHienHD', label: 'Giá trị bảo đảm thực hiện HĐ' },
    { key: 'ThoiHanNopBaoDam', label: 'Thời hạn nộp bảo đảm' },
    { key: 'TyLePhanTramBaoDam', label: 'Tỷ lệ phần trăm bảo đảm' },
    { key: 'SoTienBaoDamBangSo', label: 'Số tiền bảo đảm bằng số' },
    { key: 'SoTienBaoDamBangChu', label: 'Số tiền bảo đảm bằng chữ' },
    { key: 'ThoiHanHoanTraBaoDam', label: 'Thời hạn hoàn trả bảo đảm' },
    { key: 'DanhSachNhaThauPhu', label: 'Danh sách nhà thầu phụ' },
    { key: 'ThoiHanDeTrinhToaAn', label: 'Thời hạn đệ trình tòa án' },
    { key: 'DanhSachChungTuCungCap', label: 'Danh sách chứng từ cung cấp', type: 'textarea' },
    { key: 'TongGiaTriHopDongBangSo', label: 'Tổng giá trị hợp đồng bằng số' },
    { key: 'TongGiaTriHopDongBangChu', label: 'Tổng giá trị hợp đồng bằng chữ' },
    { key: 'TamUng', label: 'Tạm ứng' },
    { key: 'ThanhToan', label: 'Thanh toán' },
    { key: 'TyLeThanhToan', label: 'Tỷ lệ thanh toán' },
    { key: 'SoTienThanhToanBangSo', label: 'Số tiền thanh toán bằng số' },
    { key: 'SoTienThanhToanBangChu', label: 'Số tiền thanh toán bằng chữ' },
    { key: 'HoSoThanhToan', label: 'Hồ sơ thanh toán', type: 'textarea' },
    { key: 'ThoiHanThanhToan', label: 'Thời hạn thanh toán' },
    { key: 'BaoHanh', label: 'Bảo hành' },
    { key: 'DongGoiHangHoa', label: 'Đóng gói hàng hoá' },
    { key: 'CacDichVuBaoGom', label: 'Các dịch vụ bao gồm' },
    { key: 'KiemTraThuNghiemHangHoa', label: 'Kiểm tra thử nghiệm hàng hoá' },
    { key: 'DiaDiemKiemTraThuNghiem', label: 'Địa điểm kiểm tra thử nghiệm' },
    { key: 'SoTienPhatViPhamHD', label: 'Số tiền phạt vi phạm HĐ' },
    { key: 'TyLePhatMoiTuan', label: 'Tỷ lệ phạt mỗi tuần' },
    { key: 'MucPhatToiDa', label: 'Mức phạt tối đa' },
    { key: 'BoiThuongThietHai', label: 'Bồi thường thiệt hại' },
    { key: 'ThoiHanBaoHanh', label: 'Thời hạn bảo hành' },
    { key: 'DiaDiemBaoHanh', label: 'Địa điểm bảo hành' },
    { key: 'ThoiHanSuaChuaKhacPhuc', label: 'Thời hạn sửa chữa khắc phục' },
    { key: 'ThoiHanCuThe', label: 'Thời hạn cụ thể' },
    { key: 'TyLeThanhToanTietKiem', label: 'Tỷ lệ thanh toán tiết kiệm' },
  ],
};

const DANG_TAI_HSMT_FIELDS: { key: string; label: string; type?: string }[] = [
  { key: 'maThongBaoMoiThau', label: 'Mã thông báo mời thầu' },
  { key: 'thoiGianDongThau', label: 'Thời gian đóng thầu', type: 'datetime-local' },
  { key: 'thoiGianMoThau', label: 'Thời gian mở thầu', type: 'datetime-local' },
];

declare global {
  interface Window {
    DocsAPI?: any;
  }
}

/* ======================== OnlyOffice Preview Component ======================== */
function LCNTOnlyOfficePreview({ objectPath, onClose }: { objectPath: string; onClose: () => void }) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<string>('oo-editor-' + Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let destroyed = false;
    const init = async () => {
      try {
        const { onlyofficeUrl, editorConfig } = await api.getLCNTOnlyofficeConfig(objectPath);
        if (destroyed) return;
        if (!window.DocsAPI) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = onlyofficeUrl + '/web-apps/apps/api/documents/api.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Không thể tải OnlyOffice'));
            document.head.appendChild(script);
          });
        }
        if (destroyed) return;
        editorRef.current = new window.DocsAPI.DocEditor(containerRef.current, {
          ...editorConfig,
          height: '100%',
          width: '100%',
          events: {
            onAppReady: () => { if (!destroyed) setLoading(false); },
            onError: (e: any) => { if (!destroyed) setError(e?.data?.message || 'Lỗi OnlyOffice'); },
          },
        });
      } catch (err: any) {
        if (!destroyed) { setError(err.message || 'Lỗi tải cấu hình'); setLoading(false); }
      }
    };
    init();
    return () => { destroyed = true; if (editorRef.current?.destroyEditor) editorRef.current.destroyEditor(); };
  }, [objectPath]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <h3 className="text-lg font-semibold">Xem trước tài liệu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 relative">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          <div id={containerRef.current} className="w-full h-full" />
        </div>
      </div>
    </motion.div>
  );
}

/* ======================== Helper: safe filename display ======================== */
function displayFilename(path: string): string {
  const raw = path.split('/').pop() || path;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/* ======================== Main Page ======================== */
export default function LuaChonNhaThauPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [qdList, setQdList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQD, setSelectedQD] = useState<any>(null);
  const [selections, setSelections] = useState<ContractorSelection[]>([]);
  const [activeSelection, setActiveSelection] = useState<ContractorSelection | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepFormData, setStepFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStepId, setUploadStepId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await api.getApprovedQDForLCNT();
      setQdList(data);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSelectQD = async (qd: any) => {
    setSelectedQD(qd);
    setActiveSelection(null);
    setEditingStepId(null);
    try {
      const sels = await api.getContractorSelectionsByQD(qd.id);
      setSelections(sels);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateSelection = async (goiThauIndex: number) => {
    if (!selectedQD) return;
    try {
      const sel = await api.createContractorSelection(selectedQD.id, goiThauIndex);
      toast.success('Đã tạo quy trình lựa chọn nhà thầu');
      setSelections(prev => [...prev, sel]);
      setActiveSelection(sel);
    } catch (err: any) { toast.error(err.message); }
  };

  const refreshSelection = useCallback(async () => {
    if (!activeSelection) return;
    try {
      const updated = await api.getContractorSelection(activeSelection.id);
      setActiveSelection(updated);
    } catch (err: any) { toast.error(err.message); }
  }, [activeSelection]);

  const handleOpenSelection = (sel: ContractorSelection) => {
    router.push(`/dashboard/lua-chon-nha-thau/${sel.id}`);
  };

  const openStepForm = (step: ProcurementStep) => {
    setEditingStepId(step.id);
    const rawData = (step.data || {}) as Record<string, any>;
    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawData)) {
      if (k !== '_attachments') stringData[k] = String(v ?? '');
    }
    setStepFormData(stringData);
  };

  const handleSaveStep = async () => {
    if (!editingStepId) return;
    setSaving(true);
    try {
      await api.updateLCNTStep(editingStepId, stepFormData);
      toast.success('Đã lưu thông tin bước');
      await refreshSelection();
      setEditingStepId(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleCompleteStep = async (stepId: string) => {
    try {
      await api.completeLCNTStep(stepId);
      toast.success('Đã hoàn thành bước');
      await refreshSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReopenStep = async (stepId: string) => {
    try {
      await api.reopenLCNTStep(stepId);
      toast.success('Đã mở lại bước để chỉnh sửa');
      await refreshSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleOptionalSkip = async (stepId: string) => {
    try {
      await api.updateLCNTStep(stepId, { _optional: 'khong', ghiChu: 'Không áp dụng' });
      await api.completeLCNTStep(stepId);
      toast.success('Đã bỏ qua bước này (Không áp dụng)');
      await refreshSelection();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateDocx = async (stepId: string) => {
    setGenerating(stepId);
    try {
      await api.generateLCNTDocx(stepId);
      toast.success('Đã tạo file DOCX thành công');
      await refreshSelection();
    } catch (err: any) { toast.error(err.message); }
    finally { setGenerating(null); }
  };

  const handleDownloadDocx = async (stepId: string) => {
    try {
      const res = await api.downloadLCNTStepDocx(stepId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Lỗi tải file' }));
        toast.error(err.message);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUploadFile = async (stepId: string, file: File) => {
    setUploading(true);
    try {
      await api.uploadLCNTAttachment(stepId, file);
      toast.success('Đã tải lên: ' + file.name);
      await refreshSelection();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handlePreviewFile = (objectPath: string) => {
    setPreviewPath(objectPath);
  };

  const handleDownloadFile = async (objectPath: string) => {
    try {
      const { url } = await api.getLCNTFileUrl(objectPath);
      window.open(url, '_blank');
    } catch (err: any) { toast.error(err.message); }
  };

  const triggerFileUpload = (stepId: string) => {
    setUploadStepId(stepId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadStepId) handleUploadFile(uploadStepId, file);
    e.target.value = '';
    setUploadStepId(null);
  };

  const getStepFields = (step: ProcurementStep): { key: string; label: string; type?: string }[] => {
    if (!activeSelection) return [];
    const method = activeSelection.procurementMethod;
    if (method === 'CHI_DINH_THAU') return CDT_STEP_FIELDS[step.stepKey] || [];
    return CHCT_STEP_FIELDS[step.stepKey] || [];
  };

  const getAttachments = (step: ProcurementStep): string[] => {
    return (step.data as any)?._attachments || [];
  };

  const toggleStep = (stepId: string) => {
    setExpandedStepId(prev => prev === stepId ? null : stepId);
  };

  const filteredQD = qdList.filter(qd => {
    if (!searchTerm) return true;
    const d = qd.data || {};
    const text = (d.tenDuAn || '') + ' ' + (d.soQuyetDinh || '') + ' ' + (d.chuDauTu || '');
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const goiThauList = selectedQD?.data?.goiThau || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const editingStep = editingStepId && activeSelection
    ? activeSelection.steps.find(s => s.id === editingStepId)
    : null;

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected}
        accept=".doc,.docx,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip,.rar" />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lựa chọn nhà thầu</h1>
        <p className="mt-1 text-sm text-gray-500">Quản lý quy trình lựa chọn nhà thầu theo từng gói thầu đã phê duyệt</p>
      </div>

      <div className="flex gap-2">
        {editingStep && (
          <button onClick={() => setEditingStepId(null)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            ← Quay lại quy trình
          </button>
        )}
        {activeSelection && !editingStep && (
          <button onClick={() => { setActiveSelection(null); setEditingStepId(null); setExpandedStepId(null); }}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            ← Quay lại danh sách gói thầu
          </button>
        )}
        {selectedQD && !activeSelection && (
          <button onClick={() => { setSelectedQD(null); setSelections([]); }}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            ← Quay lại danh sách QĐ
          </button>
        )}
      </div>

      {/* ===================== STEP EDIT FORM (Full-page inline) ===================== */}
      {editingStep && activeSelection && (
        <StepEditForm
          step={editingStep}
          fields={getStepFields(editingStep)}
          formData={stepFormData}
          setFormData={setStepFormData}
          saving={saving}
          generating={generating}
          uploading={uploading}
          onSave={handleSaveStep}
          onCancel={() => setEditingStepId(null)}
          onGenerate={() => handleGenerateDocx(editingStep.id)}
          onDownload={() => handleDownloadDocx(editingStep.id)}
          onUpload={() => triggerFileUpload(editingStep.id)}
          onPreview={handlePreviewFile}
          onDownloadFile={handleDownloadFile}
          attachments={getAttachments(editingStep)}
          procurementMethod={activeSelection.procurementMethod}
        />
      )}

      {/* ===================== Step workflow ===================== */}
      {activeSelection && !editingStep && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{activeSelection.tenGoiThau}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {METHOD_LABELS[activeSelection.procurementMethod]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {activeSelection.steps.filter(s => s.status === 'COMPLETED').length}/{activeSelection.steps.length} bước hoàn thành
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: (activeSelection.steps.filter(s => s.status === 'COMPLETED').length / activeSelection.steps.length * 100) + '%' }} />
            </div>

            <div className="space-y-3">
              {activeSelection.steps.map((step, idx) => {
                const isAttachment = ATTACHMENT_ONLY.has(step.stepKey);
                const isHybrid = HYBRID_STEPS.has(step.stepKey);
                const isOptional = OPTIONAL_STEPS.has(step.stepKey);
                const hasFields = getStepFields(step).length > 0;
                const prevCompleted = idx === 0 || activeSelection.steps[idx - 1]?.status === 'COMPLETED';
                const canWork = prevCompleted && step.status !== 'COMPLETED';
                const isCompleted = step.status === 'COMPLETED';
                const isExpanded = expandedStepId === step.id;
                const attachments = getAttachments(step);
                const hasGeneratedDocx = !!step.attachmentPath;
                const stepData = (step.data || {}) as Record<string, any>;
                const dataEntries = Object.entries(stepData).filter(([k]) => !k.startsWith('_'));
                const wasSkipped = stepData._optional === 'khong';

                return (
                  <div key={step.id}
                    className={'border rounded-lg transition-colors ' + (
                      isCompleted ? 'bg-green-50 border-green-200' :
                      step.status === 'IN_PROGRESS' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-white border-gray-200'
                    )}>
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 rounded-lg transition-colors"
                      onClick={() => toggleStep(step.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ' + (
                          isCompleted ? 'bg-green-500 text-white' :
                          step.status === 'IN_PROGRESS' ? 'bg-yellow-500 text-white' :
                          'bg-gray-200 text-gray-500'
                        )}>
                          {isCompleted ? '✓' : step.stepOrder}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{step.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + STEP_STATUS_COLORS[step.status]}>
                              {STEP_STATUS_LABELS[step.status]}
                            </span>
                            {step.completedAt && (
                              <span className="text-xs text-gray-400">
                                {format(new Date(step.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                              </span>
                            )}
                            {wasSkipped && <span className="text-xs text-orange-500">⏭ Đã bỏ qua</span>}
                            {isOptional && !wasSkipped && !isCompleted && <span className="text-xs text-purple-500">❓ Tùy chọn</span>}
                            {isAttachment && !isHybrid && !isOptional && <span className="text-xs text-blue-500">📎 Đính kèm</span>}
                            {isHybrid && <span className="text-xs text-purple-500">📎+📝</span>}
                            {dataEntries.length > 0 && <span className="text-xs text-gray-400">📝 {dataEntries.length}</span>}
                            {attachments.length > 0 && <span className="text-xs text-gray-400">📎 {attachments.length}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 text-gray-400">
                        <span className={'inline-block transition-transform ' + (isExpanded ? 'rotate-90' : '')}>▶</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                            {/* Optional step: Yes/No toggle */}
                            {isOptional && canWork && !wasSkipped && (
                              <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-sm font-medium text-purple-800 mb-2">Bước này có áp dụng không?</p>
                                <div className="flex gap-3">
                                  <button onClick={(e) => { e.stopPropagation(); }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
                                    ✅ Có - Tiến hành
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleOptionalSkip(step.id); }}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 font-medium">
                                    ❌ Không - Bỏ qua
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {(canWork || isCompleted) && (hasFields || isHybrid) && (
                                <button onClick={(e) => { e.stopPropagation(); openStepForm(step); }}
                                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                                  ✏️ {isCompleted ? 'Chỉnh sửa' : 'Nhập liệu'}
                                </button>
                              )}
                              {/* Link to detail page */}
                              {activeSelection && (
                                <Link href={`/dashboard/lua-chon-nha-thau/${activeSelection.id}/step/${step.id}`}
                                  onClick={e => e.stopPropagation()}
                                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                                  🔍 Chi tiết
                                </Link>
                              )}
                              {(canWork || isCompleted) && (isAttachment || isHybrid) && (
                                <button onClick={(e) => { e.stopPropagation(); triggerFileUpload(step.id); }} disabled={uploading}
                                  className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                                  {uploading ? '⏳' : '📤'} Tải file
                                </button>
                              )}
                              {(canWork || isCompleted) && !isAttachment && hasFields && dataEntries.length > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); handleGenerateDocx(step.id); }}
                                  disabled={generating === step.id}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                  {generating === step.id ? '⏳...' : '📄 Tạo DOCX'}
                                </button>
                              )}
                              {hasFields && !isAttachment && dataEntries.length > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); handleDownloadDocx(step.id); }}
                                  className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
                                  📥 Tải DOCX
                                </button>
                              )}
                              {canWork && (
                                <button onClick={(e) => { e.stopPropagation(); handleCompleteStep(step.id); }}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                                  ✅ Hoàn thành
                                </button>
                              )}
                              {isCompleted && (
                                <button onClick={(e) => { e.stopPropagation(); handleReopenStep(step.id); }}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600">
                                  🔄 Mở lại
                                </button>
                              )}
                            </div>

                            {dataEntries.length > 0 && (
                              <div className="mb-3 p-3 bg-white rounded-lg border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Dữ liệu đã nhập</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                  {dataEntries.map(([k, v]) => {
                                    const fieldDef = getStepFields(step).find(f => f.key === k);
                                    const label = fieldDef?.label || k;
                                    return (
                                      <div key={k} className="flex text-sm">
                                        <span className="text-gray-500 shrink-0 w-44 truncate">{label}:</span>
                                        <span className="text-gray-900 font-medium truncate">{String(v)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {stepData.ghiChu && (
                              <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                <p className="text-xs font-semibold text-yellow-700 mb-1">📝 Ghi chú</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{stepData.ghiChu}</p>
                              </div>
                            )}

                            {attachments.length > 0 && (
                              <div className="mb-3 p-3 bg-white rounded-lg border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">📎 File đính kèm ({attachments.length})</p>
                                <div className="space-y-1.5">
                                  {attachments.map((att, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-600 truncate flex-1">{displayFilename(att)}</span>
                                      <button onClick={(e) => { e.stopPropagation(); handlePreviewFile(att); }}
                                        className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap px-2 py-1 bg-blue-50 rounded">
                                        👁 Xem
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(att); }}
                                        className="text-xs text-green-600 hover:text-green-700 whitespace-nowrap px-2 py-1 bg-green-50 rounded">
                                        📥 Tải
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasGeneratedDocx && (
                              <div className="p-3 bg-white rounded-lg border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">📄 File DOCX đã tạo</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600 truncate flex-1">{displayFilename(step.attachmentPath!)}</span>
                                  <button onClick={(e) => { e.stopPropagation(); handlePreviewFile(step.attachmentPath!); }}
                                    className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap px-2 py-1 bg-blue-50 rounded">
                                    👁 Xem
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(step.attachmentPath!); }}
                                    className="text-xs text-green-600 hover:text-green-700 whitespace-nowrap px-2 py-1 bg-green-50 rounded">
                                    📥 Tải
                                  </button>
                                </div>
                              </div>
                            )}

                            {dataEntries.length === 0 && attachments.length === 0 && !hasGeneratedDocx && (
                              <p className="text-sm text-gray-400 italic">Chưa có dữ liệu hoặc file nào</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* OnlyOffice preview */}
      <AnimatePresence>
        {previewPath && (
          <LCNTOnlyOfficePreview objectPath={previewPath} onClose={() => setPreviewPath(null)} />
        )}
      </AnimatePresence>

      {/* ===================== Packages for selected QD ===================== */}
      {selectedQD && !activeSelection && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {selectedQD.data?.tenDuAn || 'QĐ phê duyệt KHLCNT'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Số QĐ: {selectedQD.data?.soQuyetDinh || '—'} | Ngày: {selectedQD.data?.ngayBanHanh ? format(new Date(selectedQD.data.ngayBanHanh), 'dd/MM/yyyy') : '—'}
            </p>

            <h3 className="font-medium text-gray-800 mb-3">Danh sách gói thầu ({goiThauList.length})</h3>
            <div className="space-y-3">
              {goiThauList.map((gt: any, idx: number) => {
                const existingSelection = selections.find(s => s.goiThauIndex === idx);
                const method = (gt.hinhThucLuaChon || '').toLowerCase();
                let methodLabel = '';
                if (method.includes('chỉ định') || method.includes('chi dinh')) methodLabel = 'Chỉ định thầu';
                else if (method.includes('chào hàng') || method.includes('chao hang')) methodLabel = 'Chào hàng cạnh tranh';
                else if (method.includes('đấu thầu rộng') || method.includes('dau thau rong')) methodLabel = 'Đấu thầu rộng rãi';

                return (
                  <div key={idx} className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Gói {idx + 1}: {gt.tenGoiThau || '—'}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                          <span>💰 {gt.giaGoiThau ? Number(gt.giaGoiThau).toLocaleString('vi-VN') + ' đ' : '—'}</span>
                          <span>📋 {gt.hinhThucLuaChon || '—'}</span>
                          <span>📄 {gt.loaiHopDong || '—'}</span>
                        </div>
                        {methodLabel && (
                          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">
                            → {methodLabel}
                          </span>
                        )}
                      </div>
                      <div>
                        {existingSelection ? (
                          <button onClick={() => handleOpenSelection(existingSelection)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                            📂 Mở quy trình
                          </button>
                        ) : (
                          <button onClick={() => handleCreateSelection(idx)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                            ➕ Tạo quy trình LCNT
                          </button>
                        )}
                      </div>
                    </div>
                    {existingSelection && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          Tiến độ: {existingSelection.steps.filter(s => s.status === 'COMPLETED').length}/{existingSelection.steps.length} bước
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: (existingSelection.steps.filter(s => s.status === 'COMPLETED').length / existingSelection.steps.length * 100) + '%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {goiThauList.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">QĐ này chưa có gói thầu nào</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== QD List ===================== */}
      {!selectedQD && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Tìm kiếm theo tên dự án, số QĐ..."
              className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          {filteredQD.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <p className="text-gray-500">Chưa có QĐ phê duyệt KHLCNT nào</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredQD.map(qd => {
                const d = qd.data || {};
                const selCount = qd.contractorSelections?.length || 0;
                const gtCount = d.goiThau?.length || 0;

                return (
                  <div key={qd.id}
                    className="bg-white rounded-xl shadow-sm border p-5 hover:border-primary-300 cursor-pointer transition-colors"
                    onClick={() => handleSelectQD(qd)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{d.tenDuAn || 'Chưa có tên'}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          <span>📋 Số QĐ: {d.soQuyetDinh || '—'}</span>
                          <span>📅 {d.ngayBanHanh ? format(new Date(d.ngayBanHanh), 'dd/MM/yyyy') : '—'}</span>
                          <span>📦 {gtCount} gói thầu</span>
                          {selCount > 0 && (
                            <span className="text-primary-600 font-medium">🏗️ {selCount} quy trình LCNT</span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-400 text-xl">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================== Full-page Step Edit Form ======================== */
function StepEditForm({
  step, fields, formData, setFormData, saving, generating, uploading,
  onSave, onCancel, onGenerate, onDownload, onUpload, onPreview, onDownloadFile,
  attachments, procurementMethod,
}: {
  step: ProcurementStep;
  fields: { key: string; label: string; type?: string }[];
  formData: Record<string, string>;
  setFormData: (d: Record<string, string>) => void;
  saving: boolean;
  generating: string | null;
  uploading: boolean;
  onSave: () => void;
  onCancel: () => void;
  onGenerate: () => void;
  onDownload: () => void;
  onUpload: () => void;
  onPreview: (path: string) => void;
  onDownloadFile: (path: string) => void;
  attachments: string[];
  procurementMethod: string;
}) {
  const isAttachment = ATTACHMENT_ONLY.has(step.stepKey);
  const isHybrid = HYBRID_STEPS.has(step.stepKey);
  const hasFields = fields.length > 0;
  const hasGeneratedDocx = !!step.attachmentPath;

  const regularFields = fields.filter(f => f.type !== 'textarea');
  const textareaFields = fields.filter(f => f.type === 'textarea');

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">Bước {step.stepOrder}</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-1">{step.title}</h3>
          </div>
          <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + STEP_STATUS_COLORS[step.status]}>
            {STEP_STATUS_LABELS[step.status]}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {step.stepKey === 'dang_tai_hsmt' && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-semibold text-purple-800 mb-3">Thông tin đăng tải HSMT</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DANG_TAI_HSMT_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input type={field.type || 'text'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        )}

        {regularFields.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">📝 Thông tin chi tiết</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regularFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                  <input type={field.type || 'text'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        )}

        {textareaFields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
            <textarea rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={formData[field.key] || ''}
              onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">📝 Ghi chú</label>
          <textarea rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Nhập ghi chú cho bước này (không bắt buộc)..."
            value={formData.ghiChu || ''}
            onChange={e => setFormData({ ...formData, ghiChu: e.target.value })} />
        </div>

        {(isAttachment || isHybrid) && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">📎 File đính kèm</p>
              <button onClick={onUpload} disabled={uploading}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {uploading ? '⏳ Đang tải...' : '📤 Tải file lên'}
              </button>
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                    <span className="text-gray-600 truncate flex-1">{displayFilename(att)}</span>
                    <button onClick={() => onPreview(att)}
                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 rounded whitespace-nowrap">
                      👁 Xem
                    </button>
                    <button onClick={() => onDownloadFile(att)}
                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 rounded whitespace-nowrap">
                      📥 Tải
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Chưa có file đính kèm</p>
            )}
          </div>
        )}

        {hasGeneratedDocx && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">📄 File DOCX đã tạo</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 truncate flex-1">{displayFilename(step.attachmentPath!)}</span>
              <button onClick={() => onPreview(step.attachmentPath!)}
                className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 bg-white rounded whitespace-nowrap">
                👁 Xem
              </button>
              <button onClick={() => onDownloadFile(step.attachmentPath!)}
                className="text-xs text-green-600 hover:text-green-700 px-2 py-1 bg-white rounded whitespace-nowrap">
                📥 Tải
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t">
          <button onClick={onSave} disabled={saving}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thông tin'}
          </button>
          {hasFields && !isAttachment && (
            <>
              <button onClick={onGenerate}
                disabled={generating === step.id}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {generating === step.id ? '⏳...' : '📄 Tạo DOCX'}
              </button>
              <button onClick={onDownload}
                className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium">
                📥 Tải DOCX
              </button>
            </>
          )}
          <button onClick={onCancel}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium ml-auto">
            ← Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
