'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SmartFormField, FieldDef } from '@/components/SmartFormField';
import { GroupedFieldRenderer } from '@/components/GroupedFieldRenderer';
import { HistoryModal } from '@/components/HistoryModal';
import { LibraryPicker, SaveToLibraryModal } from '@/components/LibraryPicker';
import { SavedValue } from '@/lib/document-library-types';

// ====================== FIELD DEFINITIONS ======================
// Mapped from template placeholders per step, per package type

// Remove old FieldDef - now imported from SmartFormField

// ---- GOI_THAU_TU_VAN ----
const TU_VAN_FIELDS: Record<string, FieldDef[]> = {
  ban_giao_san_pham: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianBBBG', label: 'Thời gian bàn giao', type: 'date' },
    { key: 'TenSanPhamBanGiao', label: 'Tên sản phẩm bàn giao' },
    { key: 'SoLuongSanPhamBanCung', label: 'Số lượng sản phẩm bàn cung' },
    { key: 'TenDaiDienBGChuDauTu', label: 'Tên đại diện bàn giao CDT' },
    { key: 'ChucVuDaiDienBGChuDauTu', label: 'Chức vụ đại diện BG CĐT' },
    { key: 'TenDaiDienBGNhaThau', label: 'Tên đại diện bàn giao nhà thầu' },
    { key: 'ChucVuDaiDienBGNhaThau', label: 'Chức vụ đại diện BG NT' },
    { key: 'SoLuongBBBGMoiBenGiu', label: 'Số lượng BBBG mỗi bên giữ' },
    { key: 'TongSoLuongBBBG', label: 'Tổng số lượng BBBG' },
  ],
  nghiem_thu_san_pham: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianNghiemThu', label: 'Thời gian nghiệm thu', type: 'date' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện chủ đầu tư' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DienThoaiChuDauTu', label: 'Điện thoại CĐT' },
    { key: 'MaSoThueChuDauTu', label: 'Mã số thuế CĐT' },
    { key: 'MaSoNganHangChuDauTu', label: 'Mã số ngân hàng CĐT' },
    { key: 'ThongTinTaiKhoanChuDauTu', label: 'Thông tin tài khoản CĐT' },
    { key: 'DaiDienNhaThau', label: 'Đại diện nhà thầu' },
    { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện NT' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ nhà thầu' },
    { key: 'SoDienThoaiNhaThau', label: 'Số điện thoại nhà thầu' },
    { key: 'MaSoThueNhaThau', label: 'MST nhà thầu' },
    { key: 'ThongTinTaiKhoanNhaThau', label: 'TK nhà thầu' },
    { key: 'SanPhamBG', label: 'Sản phẩm bàn giao' },
    { key: 'SoLuongSanPham', label: 'Số lượng sản phẩm' },
    { key: 'SoLuongBBNTCuaChuDauTu', label: 'Số lượng BBNT bên CĐT' },
    { key: 'SoLuongBBNTCuaNhaThau', label: 'Số lượng BBNT bên NT' },
    { key: 'TongSoLuongBBNT', label: 'Tổng số lượng BBNT' },
  ],
  mau_08a: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianNghiemThu', label: 'Thời gian nghiệm thu', type: 'date' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'Thang', label: 'Tháng' },
    { key: 'Nam', label: 'Năm' },
    { key: 'So', label: 'Số' },
    { key: 'MaDonVi', label: 'Mã đơn vị' },
    { key: 'MaHieu', label: 'Mã hiệu' },
    { key: 'MaNguon', label: 'Mã nguồn' },
    { key: 'GiaHDBangSo', label: 'Giá HĐ bằng số', type: 'money' },
    { key: 'GiaHDBangChu', label: 'Giá HĐ bằng chữ', type: 'money-words' },
    { key: 'DonGiaHDBangSo', label: 'Đơn giá HĐ bằng số', type: 'money' },
    { key: 'GiaTriThanhToanTamUng', label: 'Giá trị thanh toán tạm ứng', type: 'money' },
    { key: 'GiaTriThanhToanTrucTiep', label: 'Giá trị thanh toán trực tiếp', type: 'money' },
    { key: 'SoDeNghiThanhToanKyNay', label: 'Số đề nghị thanh toán kỳ này', type: 'money' },
    { key: 'SoDuTamUngKyTruoc', label: 'Số dư tạm ứng kỳ trước', type: 'money' },
  ],
  thanh_ly_hop_dong: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHD', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHD', label: 'Thời gian ký HĐ', type: 'date' },
    { key: 'ThoiGianBBBG', label: 'Thời gian BBBG', type: 'date' },
    { key: 'ThoiGianBBNT', label: 'Thời gian BBNT', type: 'date' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DienThoaiChuDauTu', label: 'Điện thoại CĐT' },
    { key: 'MaSoThueChuDauTu', label: 'MST CĐT' },
    { key: 'ThongTinTaiKhoanChuDauTu', label: 'TK CĐT' },
    { key: 'DaiDienNhaThau', label: 'Đại diện NT' },
    { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện NT' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ NT' },
    { key: 'DienThoaiNhaThau', label: 'Điện thoại NT' },
    { key: 'MaSoThueNhaThau', label: 'MST NT' },
    { key: 'ThongTinTaiKhoanNhaThau', label: 'TK NT' },
    { key: 'GiaTriThanhLyBangSo', label: 'Giá trị thanh lý bằng số', type: 'money' },
    { key: 'GiaTriThanhLyBangChu', label: 'Giá trị thanh lý bằng chữ', type: 'money-words' },
    { key: 'SoTienTamUngBangSo', label: 'Số tiền tạm ứng bằng số', type: 'money' },
    { key: 'SoLuongBBTLHDBenA', label: 'Số lượng BBTLHD bên A' },
    { key: 'SoLuongBBTLHDBenB', label: 'Số lượng BBTLHD bên B' },
    { key: 'TongSoLuongBBTLHD', label: 'Tổng số lượng BBTLHD' },
  ],
};

// ---- GOI_THAU_PHI_TU_VAN ----
const PHI_TU_VAN_FIELDS: Record<string, FieldDef[]> = {
  ban_giao_dich_vu: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianBBBG', label: 'Thời gian bàn giao', type: 'date' },
    { key: 'TenSanPhamBanGiao', label: 'Tên sản phẩm bàn giao' },
    { key: 'SoLuongSanPhamBGBanCung', label: 'Số lượng sản phẩm BG bàn cung' },
    { key: 'TenDaiDienBGChuDauTu', label: 'Tên đại diện BG CĐT' },
    { key: 'ChucVuDaiDienBGChuDauTu', label: 'Chức vụ đại diện BG CĐT' },
    { key: 'TenDaiDienBGNhaThau', label: 'Tên đại diện BG nhà thầu' },
    { key: 'ChucVuDaiDienBGNhaThau', label: 'Chức vụ đại diện BG NT' },
    { key: 'SoLuongBBBGMoiBenGiu', label: 'Số lượng BBBG mỗi bên giữ' },
    { key: 'TongSoLuongBBBG', label: 'Tổng số lượng BBBG' },
  ],
  nghiem_thu_dich_vu: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'NamBatDauNT', label: 'Năm bắt đầu NT' },
    { key: 'NamKetThucNT', label: 'Năm kết thúc NT' },
    { key: 'NgayBatDauNT', label: 'Ngày bắt đầu NT', type: 'date' },
    { key: 'NgayKetThucNT', label: 'Ngày kết thúc NT', type: 'date' },
    { key: 'ThangBatDauNT', label: 'Tháng bắt đầu NT' },
    { key: 'ThangKetThucNT', label: 'Tháng kết thúc NT' },
    { key: 'GioBatDauNTVHT', label: 'Giờ bắt đầu NT' },
    { key: 'GioKetThucNT', label: 'Giờ kết thúc NT' },
    { key: 'DiaDiemNT', label: 'Địa điểm NT' },
    { key: 'DoiTuongNghiemThu', label: 'Đối tượng nghiệm thu' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DonViTuVanQLDA', label: 'Đơn vị tư vấn QLDA' },
    { key: 'DaiDienTuVanQLDA', label: 'Đại diện tư vấn QLDA' },
    { key: 'ChucVuTuVanQLDA', label: 'Chức vụ tư vấn QLDA' },
    { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn thiết kế' },
    { key: 'DaiDienNhaThauTuVanThietKe', label: 'Đại diện NT tư vấn TK' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị giám sát triển khai' },
    { key: 'DaiDienGiamSatTrienKhai', label: 'Đại diện giám sát TK' },
    { key: 'ChucVuGiamSatTrienKhai', label: 'Chức vụ giám sát TK' },
    { key: 'DonViLapBCKTKT', label: 'Đơn vị lập BCKTKT' },
    { key: 'DaiDienDonViLapBCKTKT', label: 'Đại diện đơn vị lập BCKTKT' },
    { key: 'ChucVuDaiDienDonViLapBCKTKT', label: 'Chức vụ đại diện lập BCKTKT' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'ChucVuDaiDienNhaThauTrienKhai', label: 'Chức vụ đại diện NT TK' },
    { key: 'ChucVuNhaThauTrienKhai', label: 'Chức vụ NT triển khai' },
    { key: 'PhanCongViecNT', label: 'Phần công việc NT' },
    { key: 'TaiLieuCanCuNghiemThu', label: 'Tài liệu căn cứ NT', type: 'textarea' },
    { key: 'KetLuanNT', label: 'Kết luận NT', type: 'textarea' },
    { key: 'TongSoLuongBBNT', label: 'Tổng số lượng BBNT' },
  ],
  van_hanh_thu: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'NamVHT', label: 'Năm VHT' },
    { key: 'ThangVHT', label: 'Tháng VHT' },
    { key: 'NgayVHT', label: 'Ngày VHT', type: 'date' },
    { key: 'NamBatDauNTVHT', label: 'Năm bắt đầu NT VHT' },
    { key: 'NamKetThucNTVHT', label: 'Năm kết thúc NT VHT' },
    { key: 'ThangBatDauNTVHT', label: 'Tháng bắt đầu NT VHT' },
    { key: 'ThangKetThucNTVHT', label: 'Tháng kết thúc NT VHT' },
    { key: 'NgayBatDauNTVHT', label: 'Ngày bắt đầu NT VHT', type: 'date' },
    { key: 'NgayKetThucNTVHT', label: 'Ngày kết thúc NT VHT', type: 'date' },
    { key: 'GioBatDauNTVHT', label: 'Giờ bắt đầu NT VHT' },
    { key: 'GioKetThucNTVHT', label: 'Giờ kết thúc NT VHT' },
    { key: 'DiaDiemNTVHT', label: 'Địa điểm NT VHT' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DaiDienDonViQLSD', label: 'Đại diện đơn vị QLSD' },
    { key: 'ChucVuDaiDienDVSD', label: 'Chức vụ đại diện DVSD' },
    { key: 'DonViDuocGiaoQLSD', label: 'Đơn vị được giao QLSD' },
    { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn thiết kế' },
    { key: 'DonViTuVanGiamSatThiCong', label: 'Đơn vị tư vấn giám sát TC' },
    { key: 'DonViThiCong', label: 'Đơn vị thi công' },
    { key: 'CanBoThietKe', label: 'Cán bộ thiết kế' },
    { key: 'CanBoGiamSatThiCong', label: 'Cán bộ giám sát thi công' },
    { key: 'CanBoThiCong', label: 'Cán bộ thi công' },
    { key: 'NoiDungNghiemThu', label: 'Nội dung nghiệm thu', type: 'textarea' },
    { key: 'CacChucNangTheoThietKe', label: 'Các chức năng theo thiết kế', type: 'textarea' },
    { key: 'CacChucNangThucTeDatDuoc', label: 'Các chức năng thực tế đạt được', type: 'textarea' },
    { key: 'TaiLieuCanCuNghiemThu', label: 'Tài liệu căn cứ NT', type: 'textarea' },
    { key: 'DanhGiaChatLuongKiemThu', label: 'Đánh giá chất lượng kiểm thử', type: 'textarea' },
    { key: 'NgayBatDauKiemThu', label: 'Ngày bắt đầu kiểm thử', type: 'date' },
    { key: 'NgayKetThucKiemThu', label: 'Ngày kết thúc kiểm thử', type: 'date' },
    { key: 'YKienKhac', label: 'Ý kiến khác', type: 'textarea' },
  ],
  mau_08a: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianNghiemThu', label: 'Thời gian nghiệm thu', type: 'date' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'So', label: 'Số' },
    { key: 'MaDonVi', label: 'Mã đơn vị' },
    { key: 'MaHieu', label: 'Mã hiệu' },
    { key: 'MaNguon', label: 'Mã nguồn' },
    { key: 'GiaHDBangSo', label: 'Giá HĐ bằng số', type: 'money' },
    { key: 'GiaHDBangChu', label: 'Giá HĐ bằng chữ', type: 'money-words' },
    { key: 'DonGiaHDBangSo', label: 'Đơn giá HĐ bằng số', type: 'money' },
    { key: 'GiaTriThanhToanTamUng', label: 'Giá trị thanh toán tạm ứng', type: 'money' },
    { key: 'GiaTriThanhToanTrucTiep', label: 'Giá trị thanh toán trực tiếp', type: 'money' },
    { key: 'SoDeNghiThanhToanKyNay', label: 'Số đề nghị thanh toán kỳ này', type: 'money' },
    { key: 'SoDuTamUngKyTruoc', label: 'Số dư tạm ứng kỳ trước', type: 'money' },
  ],
  thanh_ly_hop_dong: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHD', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHD', label: 'Thời gian ký HĐ', type: 'date' },
    { key: 'ThoiGianBBBG', label: 'Thời gian BBBG', type: 'date' },
    { key: 'ThoiGianBBNT', label: 'Thời gian BBNT', type: 'date' },
    { key: 'ThoiGianBBTLHD', label: 'Thời gian BBTLHD' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DienThoaiChuDauTu', label: 'Điện thoại CĐT' },
    { key: 'MaSoThueChuDauTu', label: 'MST CĐT' },
    { key: 'ThongTinTaiKhoanChuDauTu', label: 'TK CĐT' },
    { key: 'DaiDienNhaThau', label: 'Đại diện NT' },
    { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện NT' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ NT' },
    { key: 'DienThoaiNhaThau', label: 'Điện thoại NT' },
    { key: 'MaSoThueNhaThau', label: 'MST NT' },
    { key: 'ThongTinTaiKhoanNhaThau', label: 'TK NT' },
    { key: 'GiaTriThanhLyBangSo', label: 'Giá trị thanh lý bằng số', type: 'money' },
    { key: 'GiaTriThanhLyBangChu', label: 'Giá trị thanh lý bằng chữ', type: 'money-words' },
    { key: 'SoTienTamUngBangSo', label: 'Số tiền tạm ứng bằng số', type: 'money' },
    { key: 'SoLuongBBTLHDBenA', label: 'SL BBTLHD bên A' },
    { key: 'SoLuongBBTLHDBenB', label: 'SL BBTLHD bên B' },
    { key: 'TongSoLuongBBTLHD', label: 'Tổng SL BBTLHD' },
  ],
};

// ---- GOI_THAU_TRIEN_KHAI ----
// Common fields for kiem tra steps (dieu_kien, nang_luc, vat_tu share similar structure)
const KIEM_TRA_COMMON: FieldDef[] = [
  { key: 'Diadanh', label: 'Địa danh' },
  { key: 'ChuDauTu', label: 'Chủ đầu tư' },
  { key: 'TenGoiThau', label: 'Tên gói thầu' },
  { key: 'Ngay', label: 'Ngày', type: 'date' },
  { key: 'thang', label: 'Tháng' },
  { key: 'nam', label: 'Năm' },
  { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
  { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
  { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
  { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị giám sát triển khai' },
  { key: 'DaiDienGiamSatTrienKhai', label: 'Đại diện giám sát TK' },
  { key: 'ChucVuDaiDienGiamSatTrienKhai', label: 'Chức vụ đại diện GS TK' },
  { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn thiết kế' },
  { key: 'DaiDienTuVanThietKe', label: 'Đại diện tư vấn TK' },
  { key: 'ChucVuDaiDienTuVanThietKe', label: 'Chức vụ đại diện TV TK' },
  { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
  { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
  { key: 'ChucVuDaiDienNhaThauTrienKhai', label: 'Chức vụ đại diện NT TK' },
  { key: 'DonViLienQuanKhac', label: 'Đơn vị liên quan khác' },
  { key: 'DaiDienDonViLienQuanKhac', label: 'Đại diện đơn vị liên quan' },
  { key: 'ChucVuDaiDienDonViLienQuanKhac', label: 'Chức vụ đại diện ĐV LQ' },
  { key: 'YKienKienNghiDeXuat', label: 'Ý kiến kiến nghị đề xuất', type: 'textarea' },
];

const TRIEN_KHAI_FIELDS: Record<string, FieldDef[]> = {
  bang_tien_do_cung_cap: [], // attachment-only (no template)
  kiem_tra_dieu_kien: [
    ...KIEM_TRA_COMMON,
    { key: 'GioBatDauKiemTraDieuKienTrienKhai', label: 'Giờ bắt đầu KT ĐKTK' },
    { key: 'GioKetThucKiemTraDieuKienTrienKhai', label: 'Giờ kết thúc KT ĐKTK' },
    { key: 'NgayBatDauKiemTraDieuKienTrienKhai', label: 'Ngày bắt đầu KT ĐKTK' },
    { key: 'NgayKetThucKiemTraDieuKienTrienKhai', label: 'Ngày kết thúc KT ĐKTK' },
    { key: 'ThangBatDauKiemTraDieuKienTrienKhai', label: 'Tháng bắt đầu KT ĐKTK' },
    { key: 'ThangKetThucKiemTraDieuKienTrienKhai', label: 'Tháng kết thúc KT ĐKTK' },
    { key: 'NamBatDauKiemTraDieuKienTrienKhai', label: 'Năm bắt đầu KT ĐKTK' },
    { key: 'NamKetThucKiemTraDieuKienTrienKhai', label: 'Năm kết thúc KT ĐKTK' },
    { key: 'NoiDungHopDong', label: 'Nội dung hợp đồng', type: 'textarea' },
    { key: 'NoiDungHoSoThietKe', label: 'Nội dung hồ sơ thiết kế', type: 'textarea' },
    { key: 'NoiDungTienDoChiTiet', label: 'Nội dung tiến độ chi tiết', type: 'textarea' },
    { key: 'NoiDungMatBang', label: 'Nội dung mặt bằng', type: 'textarea' },
    { key: 'SoLuongBBKiemTraDieuKienTrienKhaiBenA', label: 'SL BB KT ĐKTK bên A' },
    { key: 'SoLuongBBKiemTraDieuKienTrienKhaiBenB', label: 'SL BB KT ĐKTK bên B' },
    { key: 'TongSoLuongBBKiemTraDieuKienTrienKhai', label: 'Tổng SL BB KT ĐKTK' },
  ],
  kiem_tra_nang_luc: [
    ...KIEM_TRA_COMMON,
    { key: 'GioBatDauKiemTraNangLucTrienKhai', label: 'Giờ bắt đầu KT năng lực' },
    { key: 'GioKetThucKiemTraNangLucTrienKhai', label: 'Giờ kết thúc KT năng lực' },
    { key: 'NgayBatDauKiemTraNangLucTrienKhai', label: 'Ngày bắt đầu KT năng lực' },
    { key: 'NgayKetThucKiemTraNangLucTrienKhai', label: 'Ngày kết thúc KT năng lực' },
    { key: 'ThangBatDauKiemTraNangLucTrienKhai', label: 'Tháng bắt đầu KT năng lực' },
    { key: 'ThangKetThucKiemTraNangLucTrienKhai', label: 'Tháng kết thúc KT năng lực' },
    { key: 'NamBatDauKiemTraNangLucTrienKhai', label: 'Năm bắt đầu KT năng lực' },
    { key: 'NamKetThucKiemTraNangLucTrienKhai', label: 'Năm kết thúc KT năng lực' },
    { key: 'NoiDungKiemTraNangLucTrienKhai', label: 'Nội dung KT năng lực', type: 'textarea' },
    { key: 'SoLuongBBKiemTraNangLucTrienKhaiBenA', label: 'SL BB KT NL bên A' },
    { key: 'SoLuongBBKiemTraNangLucTrienKhaiBenB', label: 'SL BB KT NL bên B' },
    { key: 'TongSoLuongBBKiemTraNangLucTrienKhai', label: 'Tổng SL BB KT NL' },
  ],
  kiem_tra_vat_tu: [
    ...KIEM_TRA_COMMON,
    { key: 'GioBatDauKiemTraVatTu', label: 'Giờ bắt đầu KT vật tư' },
    { key: 'GioKetThucKiemTraVatTu', label: 'Giờ kết thúc KT vật tư' },
    { key: 'NgayBatDauKiemTraVatTu', label: 'Ngày bắt đầu KT vật tư' },
    { key: 'NgayKetThucKiemTraVatTu', label: 'Ngày kết thúc KT vật tư' },
    { key: 'ThangBatDauKiemTraVatTu', label: 'Tháng bắt đầu KT vật tư' },
    { key: 'ThangKetThucKiemTraVatTu', label: 'Tháng kết thúc KT vật tư' },
    { key: 'NamBatDauKiemTraVatTu', label: 'Năm bắt đầu KT vật tư' },
    { key: 'NamKetThucKiemTraVatTu', label: 'Năm kết thúc KT vật tư' },
    { key: 'ThongTinChungTu', label: 'Thông tin chứng từ', type: 'textarea' },
    { key: 'ThongTinThongSoKyThuat', label: 'Thông tin thông số kỹ thuật', type: 'textarea' },
    { key: 'YeuCauSuaChuaKhac', label: 'Yêu cầu sửa chữa khác', type: 'textarea' },
    { key: 'SoLuongBBKiemTraVatTuBenA', label: 'SL BB KT vật tư bên A' },
    { key: 'SoLuongBBKiemTraVatTuBenB', label: 'SL BB KT vật tư bên B' },
    { key: 'TongSoLuongBBKiemTraVatTu', label: 'Tổng SL BB KT vật tư' },
  ],
  nghiem_thu_cai_dat: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị giám sát TK' },
    { key: 'DaiDienGiamSatTrienKhai', label: 'Đại diện GS TK' },
    { key: 'ChucVuDaiDienGiamSatTrienKhai', label: 'Chức vụ đại diện GS TK' },
    { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn TK' },
    { key: 'DaiDienTuVanThietKe', label: 'Đại diện TV TK' },
    { key: 'ChucVuDaiDienTuVanThietKe', label: 'Chức vụ đại diện TV TK' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'ChucVuDaiDienNhaThauTrienKhai', label: 'Chức vụ đại diện NT TK' },
    { key: 'DonViQuanLySuDung', label: 'Đơn vị quản lý sử dụng' },
    { key: 'DaiDienQuanLySuDung', label: 'Đại diện QLSD' },
    { key: 'ChucVuDaiDienQuanLySuDung', label: 'Chức vụ đại diện QLSD' },
    { key: 'DonViLienQuanKhac', label: 'Đơn vị liên quan khác' },
    { key: 'DaiDienDonViLienQuanKhac', label: 'Đại diện ĐV liên quan' },
    { key: 'ChucVuDaiDienDonViLienQuanKhac', label: 'Chức vụ đại diện ĐV LQ' },
    { key: 'DoiTuongNghiemThuCaiDat', label: 'Đối tượng NT cài đặt' },
    { key: 'GioBatDauNghiemThuCaiDat', label: 'Giờ bắt đầu NT cài đặt' },
    { key: 'GioKetThucNghiemThuCaiDat', label: 'Giờ kết thúc NT cài đặt' },
    { key: 'NgayBatDauNghiemThuCaiDat', label: 'Ngày bắt đầu NT cài đặt' },
    { key: 'NgayKetThucNghiemThuCaiDat', label: 'Ngày kết thúc NT cài đặt' },
    { key: 'ThangBatDauNghiemThuCaiDat', label: 'Tháng bắt đầu NT cài đặt' },
    { key: 'ThangKetThucNghiemThuCaiDat', label: 'Tháng kết thúc NT cài đặt' },
    { key: 'NamBatDauNghiemThuCaiDat', label: 'Năm bắt đầu NT cài đặt' },
    { key: 'NamKetThucNghiemThuCaiDat', label: 'Năm kết thúc NT cài đặt' },
    { key: 'TaiLieuCanCuNghiemThu', label: 'Tài liệu căn cứ NT', type: 'textarea' },
    { key: 'KetQuaNghiemThuKhoiLuong', label: 'KQ NT khối lượng', type: 'textarea' },
    { key: 'KetQuaNghiemThuChatLuong', label: 'KQ NT chất lượng', type: 'textarea' },
    { key: 'KetQuaNghiemThuTienDo', label: 'KQ NT tiến độ', type: 'textarea' },
    { key: 'CacYeuCauYKienKhac', label: 'Các yêu cầu ý kiến khác', type: 'textarea' },
    { key: 'KetLuanNghiemThu', label: 'Kết luận NT', type: 'textarea' },
    { key: 'SoLuongBBNghiemThuCaiDatBenA', label: 'SL BB NT CĐ bên A' },
    { key: 'SoLuongBBNghiemThuCaiDatBenB', label: 'SL BB NT CĐ bên B' },
    { key: 'TongSoLuongBBNghiemThuCaiDat', label: 'Tổng SL BB NT CĐ' },
  ],
  nghiem_thu_dao_tao: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị giám sát TK' },
    { key: 'DaiDienGiamSatTrienKhai', label: 'Đại diện GS TK' },
    { key: 'ChucVuDaiDienGiamSatTrienKhai', label: 'Chức vụ đại diện GS TK' },
    { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn TK' },
    { key: 'DaiDienTuVanThietKe', label: 'Đại diện TV TK' },
    { key: 'ChucVuDaiDienTuVanThietKe', label: 'Chức vụ đại diện TV TK' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'ChucVuDaiDienNhaThauTrienKhai', label: 'Chức vụ đại diện NT TK' },
    { key: 'DonViQuanLySuDung', label: 'Đơn vị QLSD' },
    { key: 'DaiDienQuanLySuDung', label: 'Đại diện QLSD' },
    { key: 'ChucVuDaiDienQuanLySuDung', label: 'Chức vụ đại diện QLSD' },
    { key: 'DonViLienQuanKhac', label: 'Đơn vị liên quan khác' },
    { key: 'DaiDienDonViLienQuanKhac', label: 'Đại diện ĐV liên quan' },
    { key: 'ChucVuDaiDienDonViLienQuanKhac', label: 'Chức vụ đại diện ĐV LQ' },
    { key: 'DoiTuongNghiemThuDaoTao', label: 'Đối tượng NT đào tạo' },
    { key: 'GioBatDauNghiemThuDaoTao', label: 'Giờ bắt đầu NT đào tạo' },
    { key: 'GioKetThucNghiemThuDaoTao', label: 'Giờ kết thúc NT đào tạo' },
    { key: 'NgayBatDauNghiemThuDaoTao', label: 'Ngày bắt đầu NT đào tạo' },
    { key: 'NgayKetThucNghiemThuDaoTao', label: 'Ngày kết thúc NT đào tạo' },
    { key: 'ThangBatDauNghiemThuDaoTao', label: 'Tháng bắt đầu NT ĐT' },
    { key: 'ThangKetThucNghiemThuDaoTao', label: 'Tháng kết thúc NT ĐT' },
    { key: 'NamBatDauNghiemThuDaoTao', label: 'Năm bắt đầu NT ĐT' },
    { key: 'NamKetThucNghiemThuDaoTao', label: 'Năm kết thúc NT ĐT' },
    { key: 'TaiLieuCanCuNghiemThuDaoTao', label: 'Tài liệu căn cứ NT ĐT', type: 'textarea' },
    { key: 'NghiemThuKhoiLuongDaoTao', label: 'NT khối lượng ĐT', type: 'textarea' },
    { key: 'NghiemThuChatLuongDaoTao', label: 'NT chất lượng ĐT', type: 'textarea' },
    { key: 'NghiemThuTienDoDaoTao', label: 'NT tiến độ ĐT', type: 'textarea' },
    { key: 'CacYeuCauYKienKhacDaoTao', label: 'Các yêu cầu ý kiến khác ĐT', type: 'textarea' },
    { key: 'KetLuanNghiemThuDaoTao', label: 'Kết luận NT ĐT', type: 'textarea' },
    { key: 'SoLuongBBNghiemThuDaoTaoBenA', label: 'SL BB NT ĐT bên A' },
    { key: 'SoLuongBBNghiemThuDaoTaoBenB', label: 'SL BB NT ĐT bên B' },
    { key: 'TongSoLuongBBNghiemThuDaoTao', label: 'Tổng SL BB NT ĐT' },
  ],
  van_hanh_thu: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị giám sát TK' },
    { key: 'DaiDienGiamSatTrienKhai', label: 'Đại diện GS TK' },
    { key: 'ChucVuDaiDienGiamSatTrienKhai', label: 'Chức vụ đại diện GS TK' },
    { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn TK' },
    { key: 'DaiDienTuVanThietKe', label: 'Đại diện TV TK' },
    { key: 'ChucVuDaiDienTuVanThietKe', label: 'Chức vụ đại diện TV TK' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'ChucVuDaiDienNhaThauTrienKhai', label: 'Chức vụ đại diện NT TK' },
    { key: 'DonViQuanLySuDung', label: 'Đơn vị quản lý sử dụng' },
    { key: 'DaiDienQuanLySuDung', label: 'Đại diện QLSD' },
    { key: 'ChucVuDaiDienQuanLySuDung', label: 'Chức vụ đại diện QLSD' },
    { key: 'DonViLienQuanKhac', label: 'Đơn vị liên quan khác' },
    { key: 'DaiDienDonViLienQuanKhac', label: 'Đại diện ĐV liên quan' },
    { key: 'ChucVuDaiDienDonViLienQuanKhac', label: 'Chức vụ đại diện ĐV LQ' },
    { key: 'GioBatDauNghiemThuVanHanhThu', label: 'Giờ bắt đầu NT VHT' },
    { key: 'GioKetThucNghiemThuVanHanhThu', label: 'Giờ kết thúc NT VHT' },
    { key: 'NgayBatDauNghiemThuVanHanhThu', label: 'Ngày bắt đầu NT VHT' },
    { key: 'NgayKetThucNghiemThuVanHanhThu', label: 'Ngày kết thúc NT VHT' },
    { key: 'ThangBatDauNghiemThuVanHanhThu', label: 'Tháng bắt đầu NT VHT' },
    { key: 'ThangKetThucNghiemThuVanHanhThu', label: 'Tháng kết thúc NT VHT' },
    { key: 'NamBatDauNghiemThuVanHanhThu', label: 'Năm bắt đầu NT VHT' },
    { key: 'NamKetThucNghiemThuVanHanhThu', label: 'Năm kết thúc NT VHT' },
    { key: 'TaiLieuCanCuVanHanhThu', label: 'Tài liệu căn cứ VHT', type: 'textarea' },
    { key: 'NghiemThuKhoiLuongVanHanhThu', label: 'NT khối lượng VHT', type: 'textarea' },
    { key: 'NghiemThuChatLuongVanHanhThu', label: 'NT chất lượng VHT', type: 'textarea' },
    { key: 'NghiemThuTienDoVanHanhThu', label: 'NT tiến độ VHT', type: 'textarea' },
    { key: 'NghiemThuCongSuatVanHanh', label: 'NT công suất VH', type: 'textarea' },
    { key: 'CacYKienKhacVanHanhThu', label: 'Các ý kiến khác VHT', type: 'textarea' },
    { key: 'KetLuanNghiemThuVanHanhThu', label: 'Kết luận NT VHT', type: 'textarea' },
    { key: 'SoLuongBBNghiemThuVanHanhThuBenA', label: 'SL BB NT VHT bên A' },
    { key: 'SoLuongBBNghiemThuVanHanhThuBenB', label: 'SL BB NT VHT bên B' },
    { key: 'TongSoLuongBBNghiemThuVanHanhThu', label: 'Tổng SL BB NT VHT' },
  ],
  nghiem_thu_tong_the: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị giám sát TK' },
    { key: 'DaiDienGiamSatTrienKhai', label: 'Đại diện GS TK' },
    { key: 'ChucVuDaiDienGiamSatTrienKhai', label: 'Chức vụ đại diện GS TK' },
    { key: 'DonViTuVanThietKe', label: 'Đơn vị tư vấn TK' },
    { key: 'DaiDienTuVanThietKe', label: 'Đại diện TV TK' },
    { key: 'ChucVuDaiDienTuVanThietKe', label: 'Chức vụ đại diện TV TK' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'ChucVuDaiDienNhaThauTrienKhai', label: 'Chức vụ đại diện NT TK' },
    { key: 'DonViQuanLySuDung', label: 'Đơn vị QLSD' },
    { key: 'DaiDienQuanLySuDung', label: 'Đại diện QLSD' },
    { key: 'ChucVuDaiDienQuanLySuDung', label: 'Chức vụ đại diện QLSD' },
    { key: 'DonViLienQuanKhac', label: 'Đơn vị liên quan khác' },
    { key: 'DaiDienDonViLienQuanKhac', label: 'Đại diện ĐV liên quan' },
    { key: 'ChucVuDaiDienDonViLienQuanKhac', label: 'Chức vụ đại diện ĐV LQ' },
    { key: 'GioBatDauNghiemThuTongThe', label: 'Giờ bắt đầu NT tổng thể' },
    { key: 'GioKetThucNghiemThuTongThe', label: 'Giờ kết thúc NT tổng thể' },
    { key: 'NgayBatDauNghiemThuTongThe', label: 'Ngày bắt đầu NT tổng thể' },
    { key: 'NgayKetThucNghiemThuTongThe', label: 'Ngày kết thúc NT tổng thể' },
    { key: 'ThangBatDauNghiemThuTongThe', label: 'Tháng bắt đầu NT tổng thể' },
    { key: 'ThangKetThucNghiemThuTongThe', label: 'Tháng kết thúc NT tổng thể' },
    { key: 'NamBatDauNghiemThuTongThe', label: 'Năm bắt đầu NT tổng thể' },
    { key: 'NamKetThucNghiemThuTongThe', label: 'Năm kết thúc NT tổng thể' },
    { key: 'TaiLieuCanCuNghiemThu', label: 'Tài liệu căn cứ NT', type: 'textarea' },
    { key: 'NghiemThuKhoiLuong', label: 'NT khối lượng', type: 'textarea' },
    { key: 'NghiemThuChatLuong', label: 'NT chất lượng', type: 'textarea' },
    { key: 'NghiemThuTienDo', label: 'NT tiến độ', type: 'textarea' },
    { key: 'CacYeuCauYKienKhac', label: 'Các yêu cầu ý kiến khác', type: 'textarea' },
    { key: 'KetLuanNghiemThuTongThe', label: 'Kết luận NT tổng thể', type: 'textarea' },
    { key: 'SoLuongBBNghiemThuTongTheBenA', label: 'SL BB NT tổng thể bên A' },
    { key: 'SoLuongBBNghiemThuTongTheBenB', label: 'SL BB NT tổng thể bên B' },
    { key: 'TongSoLuongBBNghiemThuTongThe', label: 'Tổng SL BB NT tổng thể' },
  ],
  nhat_ky_cong_tac: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'DiaDiemTrienKhai', label: 'Địa điểm triển khai' },
    { key: 'ThoiGianTrienKhai', label: 'Thời gian triển khai' },
    { key: 'NgayBatDauTrienKhaiTheoHD', label: 'Ngày bắt đầu TK theo HĐ' },
    { key: 'NgayKetThucTrienKhaiTheoHD', label: 'Ngày kết thúc TK theo HĐ' },
    { key: 'NgayBatDauTrienKhaiThucTe', label: 'Ngày bắt đầu TK thực tế' },
    { key: 'NgayKetThucTrienKhaiThucTe', label: 'Ngày kết thúc TK thực tế' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị GS triển khai' },
    { key: 'DaiDienDonViGiamSatTrienKhai', label: 'Đại diện ĐV GS TK' },
    { key: 'DaiDienDonViThietKeChiTiet', label: 'Đại diện ĐV thiết kế CT' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'DaiDienQLDA', label: 'Đại diện QLDA' },
    { key: 'NguoiPhuTrachTrienKhaiQuanLy', label: 'Người phụ trách TK quản lý' },
    { key: 'ThongTinBanQLDAHoacToChucTuVanQLDA', label: 'Thông tin ban QLDA/TV QLDA', type: 'textarea' },
    { key: 'STT', label: 'STT' },
    { key: 'NoiDungCongTac', label: 'Nội dung công tác', type: 'textarea' },
    { key: 'YKienGiamSatTacGia', label: 'Ý kiến giám sát tác giả', type: 'textarea' },
    { key: 'YKienGiamSatTrienKhai', label: 'Ý kiến giám sát triển khai', type: 'textarea' },
    { key: 'CacNoiDungKhac', label: 'Các nội dung khác', type: 'textarea' },
    { key: 'SoLuongTrangNhatKyCongTac', label: 'Số lượng trang nhật ký' },
    { key: 'SoTrangCuoiNhatKyCongTac', label: 'Số trang cuối nhật ký' },
  ],
  nhat_ky_giam_sat: [
    { key: 'DiaDanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuToan', label: 'Tên dự toán' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianTrienKhai', label: 'Thời gian triển khai' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DonViGiamSatTrienKhai', label: 'Đơn vị GS triển khai' },
    { key: 'DaiDienDonViGiamSatTrienKhai', label: 'Đại diện ĐV GS TK' },
    { key: 'NhaThauTrienKhai', label: 'Nhà thầu triển khai' },
    { key: 'DaiDienNhaThauTrienKhai', label: 'Đại diện NT triển khai' },
    { key: 'TenNhaThau', label: 'Tên nhà thầu' },
    { key: 'NguoiPhuTrachTrienKhai1', label: 'Người phụ trách TK 1' },
    { key: 'NguoiPhuTrachTrienKhai2', label: 'Người phụ trách TK 2' },
    { key: 'NgayKetThucTheoHD', label: 'Ngày kết thúc theo HĐ' },
    { key: 'NgayKetThucThucTe', label: 'Ngày kết thúc thực tế' },
    { key: 'NamNhatKycongTacTrienKhai', label: 'Năm nhật ký CT TK' },
    { key: 'ThoiGianLapNhatKyGiamSatTrienKhai', label: 'Thời gian lập NK GS TK' },
    { key: 'STT', label: 'STT' },
    { key: 'NoiDungGiamSatTrienKhai', label: 'Nội dung GS triển khai', type: 'textarea' },
    { key: 'CacNoiDungKhacNhatKyGiamSatCongTacTrienKhai', label: 'Các nội dung khác NK GS', type: 'textarea' },
  ],
  mau_08a: [
    { key: 'Diadanh', label: 'Địa danh' },
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHopDong', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHopDong', label: 'Thời gian ký hợp đồng', type: 'date' },
    { key: 'ThoiGianNghiemThu', label: 'Thời gian nghiệm thu', type: 'date' },
    { key: 'Ngay', label: 'Ngày', type: 'date' },
    { key: 'thang', label: 'Tháng' },
    { key: 'nam', label: 'Năm' },
    { key: 'So', label: 'Số' },
    { key: 'MaDonVi', label: 'Mã đơn vị' },
    { key: 'MaHieu', label: 'Mã hiệu' },
    { key: 'MaNguon', label: 'Mã nguồn' },
    { key: 'GiaHDBangSo', label: 'Giá HĐ bằng số', type: 'money' },
    { key: 'GiaHDBangChu', label: 'Giá HĐ bằng chữ', type: 'money-words' },
    { key: 'DonGiaHDBangSo', label: 'Đơn giá HĐ bằng số', type: 'money' },
    { key: 'GiaTriThanhToanTamUng', label: 'Giá trị thanh toán tạm ứng', type: 'money' },
    { key: 'GiaTriThanhToanTrucTiep', label: 'Giá trị thanh toán trực tiếp', type: 'money' },
    { key: 'SoDeNghiThanhToanKyNay', label: 'Số đề nghị TT kỳ này', type: 'money' },
    { key: 'SoDuTamUngKyTruoc', label: 'Số dư tạm ứng kỳ trước', type: 'money' },
  ],
  thanh_ly_hop_dong: [
    { key: 'ChuDauTu', label: 'Chủ đầu tư' },
    { key: 'NhaThau', label: 'Nhà thầu' },
    { key: 'TenGoiThau', label: 'Tên gói thầu' },
    { key: 'TenDuAn', label: 'Tên dự án' },
    { key: 'MaSoHD', label: 'Mã số hợp đồng' },
    { key: 'ThoiGianKyHD', label: 'Thời gian ký HĐ', type: 'date' },
    { key: 'ThoiGianBBBG', label: 'Thời gian BBBG', type: 'date' },
    { key: 'ThoiGianBBNT', label: 'Thời gian BBNT', type: 'date' },
    { key: 'ThoiGianBBTLHD', label: 'Thời gian BBTLHD' },
    { key: 'DaiDienChuDauTu', label: 'Đại diện CĐT' },
    { key: 'ChucVuDaiDienChuDauTu', label: 'Chức vụ đại diện CĐT' },
    { key: 'DiaChiChuDauTu', label: 'Địa chỉ CĐT' },
    { key: 'DienThoaiChuDauTu', label: 'Điện thoại CĐT' },
    { key: 'MaSoThueChuDauTu', label: 'MST CĐT' },
    { key: 'ThongTinTaiKhoanChuDauTu', label: 'TK CĐT' },
    { key: 'DaiDienNhaThau', label: 'Đại diện NT' },
    { key: 'ChucVuDaiDienNhaThau', label: 'Chức vụ đại diện NT' },
    { key: 'DiaChiNhaThau', label: 'Địa chỉ NT' },
    { key: 'DienThoaiNhaThau', label: 'Điện thoại NT' },
    { key: 'MaSoThueNhaThau', label: 'MST NT' },
    { key: 'ThongTinTaiKhoanNhaThau', label: 'TK NT' },
    { key: 'GiaTriThanhLyBangSo', label: 'Giá trị thanh lý bằng số', type: 'money' },
    { key: 'GiaTriThanhLyBangChu', label: 'Giá trị thanh lý bằng chữ', type: 'money-words' },
    { key: 'SoTienTamUngBangSo', label: 'Số tiền tạm ứng bằng số', type: 'money' },
    { key: 'SoLuongBBTLHDBenA', label: 'SL BBTLHD bên A' },
    { key: 'SoLuongBBTLHDBenB', label: 'SL BBTLHD bên B' },
    { key: 'TongSoLuongBBTLHD', label: 'Tổng SL BBTLHD' },
  ],
};

// Map package type → step fields
const ALL_STEP_FIELDS: Record<string, Record<string, FieldDef[]>> = {
  GOI_THAU_TU_VAN: TU_VAN_FIELDS,
  GOI_THAU_PHI_TU_VAN: PHI_TU_VAN_FIELDS,
  GOI_THAU_TRIEN_KHAI: TRIEN_KHAI_FIELDS,
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

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  GOI_THAU_TU_VAN: 'Gói thầu tư vấn',
  GOI_THAU_PHI_TU_VAN: 'Gói thầu phi tư vấn',
  GOI_THAU_TRIEN_KHAI: 'Gói thầu triển khai',
};

const ATTACHMENT_ONLY = new Set(['bang_tien_do_cung_cap']);

function displayFilename(path: string): string {
  const raw = path.split('/').pop() || path;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default function PaymentStepPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.paymentId as string;
  const stepId = params.stepId as string;

  const [payment, setPayment] = useState<any>(null);
  const [step, setStep] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [autoFillData, setAutoFillData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadGhiChu, setUploadGhiChu] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveLibraryModal, setShowSaveLibraryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectLibraryValue = (savedValue: SavedValue) => {
    const data = savedValue.duLieu || {};
    const newFormData = { ...formData };
    for (const [key, value] of Object.entries(data)) {
      const valStr = String(value ?? '');
      newFormData[key] = valStr;
      if (key === 'MaSoHopDong') {
        newFormData['MaSoHD'] = valStr;
      } else if (key === 'ThoiGianKyHopDong') {
        newFormData['ThoiGianKyHD'] = valStr;
      } else if (key === 'DiaDanh') {
        newFormData['Diadanh'] = valStr;
        newFormData['diaDanh'] = valStr;
      }
    }
    setFormData(newFormData);
    toast.success('Đã điền thông tin từ thư viện văn bản');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const stepData = await api.getPaymentStep(stepId);
      setStep(stepData);
      setPayment(stepData.payment);

      const rawData = (stepData.data || {}) as Record<string, any>;
      const stringData: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawData)) {
        if (k !== '_attachments') stringData[k] = String(v ?? '');
      }
      setFormData(stringData);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [stepId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-fill for new steps — also persist to DB so DOCX generation has the data
  useEffect(() => {
    if (!step || step.status === 'COMPLETED') return;
    api.getPaymentAutoFill(stepId).then(async (data) => {
      if (!data || Object.keys(data).length === 0) return;
      setAutoFillData(data);
      setFormData(prev => {
        const merged = { ...prev };
        for (const [key, val] of Object.entries(data)) {
          if (!merged[key] || merged[key].trim() === '') {
            merged[key] = String(val ?? '');
          }
        }
        return merged;
      });
      // Persist auto-fill data to DB immediately so it's available for DOCX generation
      try {
        const keysToUpdate: Record<string, string> = {};
        for (const [key, val] of Object.entries(data)) {
          const rawData = (step.data || {}) as Record<string, any>;
          const rawVal = String(rawData[key] ?? '');
          if (!rawVal || rawVal.trim() === '') {
            keysToUpdate[key] = String(val ?? '');
          }
        }
        if (Object.keys(keysToUpdate).length > 0) {
          await api.updatePaymentStep(stepId, keysToUpdate);
        }
      } catch { /* ignore - will be saved on explicit save */ }
    }).catch(() => {});
  }, [stepId, step]);

  const packageType = payment?.contractPackageType || '';
  const stepFields = ALL_STEP_FIELDS[packageType]?.[step?.stepKey] || [];
  const isAttachment = step ? ATTACHMENT_ONLY.has(step.stepKey) : false;
  const attachmentsRaw: any[] = (step?.data)?._attachments || [];
  const attachments = attachmentsRaw.map((att: any) => typeof att === 'string' ? { path: att, fileName: displayFilename(att), ghiChu: '' } : att);
  const canEdit = step && step.status !== 'COMPLETED';
  const canComplete = step && step.status !== 'COMPLETED';
  const dataEntries = Object.entries((step?.data || {}) as Record<string, any>).filter(([k]) => !k.startsWith('_'));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updatePaymentStep(stepId, formData);
      // Auto-generate DOCX after saving so user can download immediately
      if (!isAttachment) {
        try {
          await api.generatePaymentDocx(stepId);
        } catch { /* ignore DOCX gen errors on save */ }
      }
      toast.success('Đã lưu thông tin');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    try {
      // Save form data before completing
      await api.updatePaymentStep(stepId, formData);
      await api.completePaymentStep(stepId);
      toast.success('Đã hoàn thành bước');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReopen = async () => {
    try {
      await api.reopenPaymentStep(stepId);
      toast.success('Đã mở lại bước');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateDocx = async () => {
    setGenerating(true);
    try {
      // Always save current form data before generating DOCX
      await api.updatePaymentStep(stepId, formData);
      await api.generatePaymentDocx(stepId);
      toast.success('Đã tạo file DOCX');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setGenerating(false); }
  };

  const handleDownloadDocx = async () => {
    try {
      const res = await api.downloadPaymentStepDocx(stepId);
      if (!res.ok) { toast.error('Lỗi tải file'); return; }
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadPaymentAttachment(stepId, file);
      toast.success('Đã tải lên: ' + file.name);
      setUploadGhiChu('');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDeleteAttachment = async (path: string) => {
    try {
      await api.deletePaymentAttachment(stepId, path);
      toast.success('Đã xóa file');
      await loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePreviewFile = async (objectPath: string) => {
    try {
      const { url } = await api.getPaymentFileUrl(objectPath);
      window.open(url, '_blank');
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!step || !payment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy bước thanh toán</p>
        <button onClick={() => router.push('/dashboard/thanh-toan')}
          className="mt-3 text-primary-600 hover:text-primary-700">← Quay lại</button>
      </div>
    );
  }

  const tenGoiThau = payment.contractorSelection?.tenGoiThau || 'N/A';

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload}
        accept=".doc,.docx,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip,.rar" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push(`/dashboard/thanh-toan/${paymentId}`)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            ← Quay lại
          </button>
          <span className="text-xs text-gray-400">
            {PACKAGE_TYPE_LABELS[packageType] || packageType}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{step.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + STEP_STATUS_COLORS[step.status]}>
                {STEP_STATUS_LABELS[step.status]}
              </span>
              {step.completedAt && (
                <span className="text-xs text-gray-400">
                  Hoàn thành: {format(new Date(step.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              )}
              <span className="text-xs text-gray-400">
                Gói thầu: {tenGoiThau}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {payment.projectId && (
              <button
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border border-indigo-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lịch sử
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Library Integration */}
      {stepFields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Thư viện văn bản thanh toán</h3>
            <p className="text-xs text-gray-500">Sử dụng hoặc lưu lại mẫu điền thông tin đối tác/dự án cho thanh toán</p>
          </div>
          <LibraryPicker
            libraryType="THANH_TOAN"
            onSelect={handleSelectLibraryValue}
            onSaveToLibrary={() => setShowSaveLibraryModal(true)}
          />
        </div>
      )}

      {/* Auto-fill notice */}
      {Object.keys(autoFillData).length > 0 && step.status === 'NOT_STARTED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">💡</span>
            <p className="text-sm font-medium text-blue-800">Trường thông tin tự động điền</p>
          </div>
          <p className="text-xs text-blue-600">
            Các trường bên dưới được tự động điền từ hợp đồng và các bước trước. Bạn có thể chỉnh sửa nếu cần.
          </p>
        </div>
      )}

      {/* Form fields */}
      {stepFields.length > 0 && (
        <GroupedFieldRenderer
          fields={stepFields}
          formData={formData}
          autoFillData={autoFillData}
          canEdit={canEdit}
          onChange={(key, val) => setFormData({ ...formData, [key]: val })}
          onFormDataChange={setFormData}
        />
      )}

      {/* Attachment section (for attachment-only steps or general attachments) */}
      {(isAttachment || true) && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isAttachment ? 'Đính kèm file' : 'File đính kèm'}
          </h2>
          {attachments.length > 0 ? (
            <div className="space-y-2 mb-4">
              {attachments.map((att: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg px-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{att.fileName}</p>
                      {att.ghiChu && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">Ghi chú: {att.ghiChu}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <button onClick={() => handlePreviewFile(att.path)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium">Xem</button>
                      {canEdit && (
                        <button onClick={() => handleDeleteAttachment(att.path)}
                          className="text-xs text-red-500 hover:text-red-600 font-medium">Xóa</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">Chưa có file đính kèm.</p>
          )}
          {canEdit && (
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
              {uploading ? '⏳ Đang tải...' : '📤 Tải file lên'}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Save */}
        {canEdit && stepFields.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium text-sm">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thông tin'}
          </button>
        )}

        {/* Download DOCX (auto-generated on save) */}
        {!isAttachment && dataEntries.length > 0 && (
          <button onClick={handleDownloadDocx}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            📥 Tải DOCX
          </button>
        )}

        {/* Complete */}
        {canComplete && (
          <button onClick={handleComplete}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
            ✅ Hoàn thành bước
          </button>
        )}

        {/* Reopen */}
        {step.status === 'COMPLETED' && (
          <button onClick={handleReopen}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium text-sm">
            🔄 Mở lại để chỉnh sửa
          </button>
        )}
      </div>
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={payment.projectId}
        stepKey="payment"
        title="Lịch sử Thanh toán"
      />
      <SaveToLibraryModal
        isOpen={showSaveLibraryModal}
        onClose={() => setShowSaveLibraryModal(false)}
        libraryType="THANH_TOAN"
        formData={formData}
        formFieldKeys={stepFields.map((f: any) => f.key)}
        onSave={() => toast.success('Đã lưu mẫu thanh toán vào thư viện')}
      />
    </div>
  );
}
