import { PrismaClient, LibraryType, FieldType } from '@prisma/client';

export async function seedLibraries(prisma: PrismaClient) {
  console.log('[Library] Seeding organizations and libraries...');

  const orgCdt = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ten: 'Tổ chức - Chủ đầu tư',
      moTa: 'Tổ chức mặc định bên A (Chủ đầu tư)',
    },
  });

  const orgNt = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      ten: 'Tổ chức - Nhà thầu',
      moTa: 'Tổ chức mặc định bên B (Nhà thầu)',
    },
  });

  console.log('[Library] Organizations created');

  // Library definitions with keys aligned to form field names
  const libraryDefs = [
    // ====== DAT SACH - GDN ======
    {
      name: 'Mẫu GDN Đặt sách',
      type: 'DAT_SACH_GDN' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'tenSach', tenTruong: 'Tên sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 1 },
        { khoa: 'tacGia', tenTruong: 'Tác giả', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 2 },
        { khoa: 'bbt', tenTruong: 'BBT (Ban Biên tập)', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 3 },
        { khoa: 'namXB', tenTruong: 'Năm xuất bản', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 4 },
        { khoa: 'soTrang', tenTruong: 'Số trang', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 5 },
        { khoa: 'khoSach', tenTruong: 'Khổ sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 6 },
        { khoa: 'giaBia', tenTruong: 'Giá bìa', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 7 },
        { khoa: 'soLuongTon', tenTruong: 'Số lượng tồn', kieuDuLieu: FieldType.NUMBER, nhom: 'Số lượng', thuTu: 8 },
        { khoa: 'thoiGianCanSach', tenTruong: 'Thời gian cần sách', kieuDuLieu: FieldType.TEXT, nhom: 'Yêu cầu', thuTu: 9 },
        { khoa: 'deNghiNoiIn', tenTruong: 'Đề nghị nơi in', kieuDuLieu: FieldType.TEXT, nhom: 'Yêu cầu', thuTu: 10 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Yêu cầu', thuTu: 11 },
        { khoa: 'vuKHTKBT', tenTruong: 'Vụ KH-TKBT (ký)', kieuDuLieu: FieldType.TEXT, nhom: 'Ký tên', thuTu: 12 },
        { khoa: 'banBienTap', tenTruong: 'Ban Biên tập (ký)', kieuDuLieu: FieldType.TEXT, nhom: 'Ký tên', thuTu: 13 },
      ],
    },
    // ====== DAT SACH - PCDI ======
    {
      name: 'Mẫu PCDI Đặt sách',
      type: 'DAT_SACH_PCDI' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'bbt', tenTruong: 'BBT (Ban Biên tập)', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 1 },
        { khoa: 'phuongThuc', tenTruong: 'Phương thức in', kieuDuLieu: FieldType.TEXT, nhom: 'Phương thức', thuTu: 2 },
        { khoa: 'tenSach', tenTruong: 'Tên sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 3 },
        { khoa: 'tacGia', tenTruong: 'Tác giả', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 4 },
        { khoa: 'soTrang', tenTruong: 'Số trang', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 5 },
        { khoa: 'khoSach', tenTruong: 'Khổ sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 6 },
        { khoa: 'soLuongIn', tenTruong: 'Số lượng in', kieuDuLieu: FieldType.NUMBER, nhom: 'Số lượng', thuTu: 7 },
        { khoa: 'giaTriHopDong', tenTruong: 'Giá trị hợp đồng', kieuDuLieu: FieldType.TEXT, nhom: 'Hợp đồng', thuTu: 8 },
        { khoa: 'coSoIn', tenTruong: 'Cơ sở in', kieuDuLieu: FieldType.TEXT, nhom: 'Cơ sở in', thuTu: 9 },
        { khoa: 'thongSoKyThuat', tenTruong: 'Thông số kỹ thuật', kieuDuLieu: FieldType.TEXT, nhom: 'Cơ sở in', thuTu: 10 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Yêu cầu', thuTu: 11 },
      ],
    },
    // ====== DAT SACH - QD ======
    {
      name: 'Mẫu QĐ Đặt sách',
      type: 'DAT_SACH_QD' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'tacGia', tenTruong: 'Tác giả', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 1 },
        { khoa: 'ngonNgu', tenTruong: 'Ngôn ngữ', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 2 },
        { khoa: 'khuonKho', tenTruong: 'Khổ sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 3 },
        { khoa: 'soTrangCuaXuatBanPhamIn', tenTruong: 'Số trang', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 4 },
        { khoa: 'soLuongIn', tenTruong: 'Số lượng in', kieuDuLieu: FieldType.NUMBER, nhom: 'Số lượng', thuTu: 5 },
        { khoa: 'doiTacLienKet', tenTruong: 'Đối tác liên kết', kieuDuLieu: FieldType.TEXT, nhom: 'Đối tác', thuTu: 6 },
        { khoa: 'tenBienTapVien', tenTruong: 'Tên biên tập viên', kieuDuLieu: FieldType.TEXT, nhom: 'Đối tác', thuTu: 7 },
        { khoa: 'coSoIn', tenTruong: 'Cơ sở in', kieuDuLieu: FieldType.TEXT, nhom: 'Cơ sở in', thuTu: 8 },
        { khoa: 'maSoISBN', tenTruong: 'ISBN', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin khác', thuTu: 9 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Yêu cầu', thuTu: 10 },
      ],
    },
    // ====== DUTOAN - TO TRINH ======
    {
      name: 'Mẫu Tờ trình Dự toán',
      type: 'DUTOAN_TT' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'TenDuAn', tenTruong: 'Tên dự án', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 1 },
        { khoa: 'ChuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 2 },
        { khoa: 'DiaDanh', tenTruong: 'Địa danh', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 3 },
        { khoa: 'DonViTrinh', tenTruong: 'Đơn vị trình', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin trình', thuTu: 4 },
        { khoa: 'NguonVon', tenTruong: 'Nguồn vốn', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 5 },
        { khoa: 'DiaDiemThucHien', tenTruong: 'Địa điểm thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 6 },
        { khoa: 'ThoiGianThucHien', tenTruong: 'Thời gian thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 7 },
        { khoa: 'DuToanBangSo', tenTruong: 'Giá trị dự toán bằng số', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 8 },
        { khoa: 'DuToanBangChu', tenTruong: 'Giá trị dự toán bằng chữ', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 9 },
        { khoa: 'SoToTrinh', tenTruong: 'Số tờ trình', kieuDuLieu: FieldType.TEXT, nhom: 'Số hiệu', thuTu: 10 },
        { khoa: 'NgayTrinh', tenTruong: 'Ngày trình', kieuDuLieu: FieldType.DATE, nhom: 'Số hiệu', thuTu: 11 },
        { khoa: 'GhiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Khác', thuTu: 12 },
      ],
    },
    // ====== DUTOAN - QUYET DINH ======
    {
      name: 'Mẫu QĐ Dự toán',
      type: 'DUTOAN_QD' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'TenDuAn', tenTruong: 'Tên dự án', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 1 },
        { khoa: 'SoQuyetDinh', tenTruong: 'Số quyết định', kieuDuLieu: FieldType.TEXT, nhom: 'Số hiệu', thuTu: 2 },
        { khoa: 'ChuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 3 },
        { khoa: 'NguonVon', tenTruong: 'Nguồn vốn', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 4 },
        { khoa: 'DiaDiemThucHien', tenTruong: 'Địa điểm thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 5 },
        { khoa: 'DuToanBangSo', tenTruong: 'Giá trị dự toán bằng số', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 6 },
        { khoa: 'DuToanBangChu', tenTruong: 'Giá trị dự toán bằng chữ', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 7 },
        { khoa: 'NgayKy', tenTruong: 'Ngày ký', kieuDuLieu: FieldType.DATE, nhom: 'Số hiệu', thuTu: 8 },
        { khoa: 'GhiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Khác', thuTu: 9 },
      ],
    },
    // ====== KHLCNT ======
    {
      name: 'Mẫu KHLCNT',
      type: 'KHLCNT' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'tenDuAn', tenTruong: 'Tên dự án / dự toán', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 1 },
        { khoa: 'chuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 2 },
        { khoa: 'nguonVon', tenTruong: 'Nguồn vốn', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 3 },
        { khoa: 'diaDanh', tenTruong: 'Địa danh', kieuDuLieu: FieldType.TEXT, nhom: 'Địa danh', thuTu: 4 },
        { khoa: 'donViTrinh', tenTruong: 'Đơn vị trình', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin trình', thuTu: 5 },
        { khoa: 'thoiGianThucHien', tenTruong: 'Thời gian thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 6 },
        { khoa: 'diaDiem', tenTruong: 'Địa điểm', kieuDuLieu: FieldType.TEXT, nhom: 'Địa điểm', thuTu: 7 },
        { khoa: 'quyMo', tenTruong: 'Quy mô', kieuDuLieu: FieldType.TEXT, nhom: 'Mô tả', thuTu: 8 },
        { khoa: 'coQuanPheDuyet', tenTruong: 'Cơ quan phê duyệt', kieuDuLieu: FieldType.TEXT, nhom: 'Phê duyệt', thuTu: 9 },
        { khoa: 'soQuyetDinh', tenTruong: 'Số quyết định', kieuDuLieu: FieldType.TEXT, nhom: 'Phê duyệt', thuTu: 10 },
        { khoa: 'nguoiPheDuyet', tenTruong: 'Người phê duyệt', kieuDuLieu: FieldType.TEXT, nhom: 'Phê duyệt', thuTu: 11 },
        { khoa: 'donViThamDinh', tenTruong: 'Đơn vị thẩm định', kieuDuLieu: FieldType.TEXT, nhom: 'Thẩm định', thuTu: 12 },
        { khoa: 'donViGiamSat', tenTruong: 'Đơn vị giám sát', kieuDuLieu: FieldType.TEXT, nhom: 'Giám sát', thuTu: 13 },
      ],
    },
    // ====== LCNT - CHU DAU TU ======
    {
      name: 'Mẫu Thông tin Chủ đầu tư LCNThau',
      type: 'LCNT_STEP' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'cdtTenCongTy', tenTruong: 'Tên công ty', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 1 },
        { khoa: 'cdtDiaChi', tenTruong: 'Địa chỉ', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Thông tin chung', thuTu: 2 },
        { khoa: 'cdtMaSoThue', tenTruong: 'Mã số thuế', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 3 },
        { khoa: 'cdtSoTaiKhoan', tenTruong: 'Số tài khoản', kieuDuLieu: FieldType.TEXT, nhom: 'Tài khoản', thuTu: 4 },
        { khoa: 'cdtNganHang', tenTruong: 'Ngân hàng', kieuDuLieu: FieldType.TEXT, nhom: 'Tài khoản', thuTu: 5 },
        { khoa: 'cdtDaiDien', tenTruong: 'Đại diện theo pháp luật', kieuDuLieu: FieldType.TEXT, nhom: 'Người đại diện', thuTu: 6 },
        { khoa: 'cdtChucVu', tenTruong: 'Chức vụ', kieuDuLieu: FieldType.TEXT, nhom: 'Người đại diện', thuTu: 7 },
        { khoa: 'cdtEmail', tenTruong: 'Email', kieuDuLieu: FieldType.EMAIL, nhom: 'Liên hệ', thuTu: 8 },
        { khoa: 'cdtDienThoai', tenTruong: 'Điện thoại', kieuDuLieu: FieldType.PHONE, nhom: 'Liên hệ', thuTu: 9 },
        { khoa: 'cdtKyTen', tenTruong: 'Họ tên người ký', kieuDuLieu: FieldType.TEXT, nhom: 'Ký tên', thuTu: 10 },
        { khoa: 'cdtKyChucVu', tenTruong: 'Chức vụ người ký', kieuDuLieu: FieldType.TEXT, nhom: 'Ký tên', thuTu: 11 },
      ],
    },
    // ====== LCNT - NHA THAU ======
    {
      name: 'Mẫu Thông tin Nhà thầu LCNThau',
      type: 'LCNT_STEP' as LibraryType,
      orgId: orgNt.id,
      fields: [
        { khoa: 'ntTenCongTy', tenTruong: 'Tên công ty', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 1 },
        { khoa: 'ntDiaChi', tenTruong: 'Địa chỉ', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Thông tin chung', thuTu: 2 },
        { khoa: 'ntMaSoThue', tenTruong: 'Mã số thuế', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 3 },
        { khoa: 'ntSoTaiKhoan', tenTruong: 'Số tài khoản', kieuDuLieu: FieldType.TEXT, nhom: 'Tài khoản', thuTu: 4 },
        { khoa: 'ntNganHang', tenTruong: 'Ngân hàng', kieuDuLieu: FieldType.TEXT, nhom: 'Tài khoản', thuTu: 5 },
        { khoa: 'ntDaiDien', tenTruong: 'Đại diện theo pháp luật', kieuDuLieu: FieldType.TEXT, nhom: 'Người đại diện', thuTu: 6 },
        { khoa: 'ntChucVu', tenTruong: 'Chức vụ', kieuDuLieu: FieldType.TEXT, nhom: 'Người đại diện', thuTu: 7 },
        { khoa: 'ntEmail', tenTruong: 'Email', kieuDuLieu: FieldType.EMAIL, nhom: 'Liên hệ', thuTu: 8 },
        { khoa: 'ntDienThoai', tenTruong: 'Điện thoại', kieuDuLieu: FieldType.PHONE, nhom: 'Liên hệ', thuTu: 9 },
        { khoa: 'ntKyTen', tenTruong: 'Họ tên người ký', kieuDuLieu: FieldType.TEXT, nhom: 'Ký tên', thuTu: 10 },
        { khoa: 'ntKyChucVu', tenTruong: 'Chức vụ người ký', kieuDuLieu: FieldType.TEXT, nhom: 'Ký tên', thuTu: 11 },
      ],
    },
    // ====== THANH TOAN ======
    {
      name: 'Mẫu Thông tin Thanh toán',
      type: 'THANH_TOAN' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'ChuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 1 },
        { khoa: 'NhaThau', tenTruong: 'Nhà thầu', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 2 },
        { khoa: 'TenGoiThau', tenTruong: 'Tên gói thầu', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 3 },
        { khoa: 'TenDuAn', tenTruong: 'Tên dự án', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 4 },
        { khoa: 'MaSoHopDong', tenTruong: 'Mã số hợp đồng', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 5 },
        { khoa: 'ThoiGianKyHopDong', tenTruong: 'Thời gian ký hợp đồng', kieuDuLieu: FieldType.DATE, nhom: 'Thông tin chung', thuTu: 6 },
        { khoa: 'DaiDienChuDauTu', tenTruong: 'Đại diện Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Đại diện CĐT', thuTu: 7 },
        { khoa: 'ChucVuDaiDienChuDauTu', tenTruong: 'Chức vụ đại diện CĐT', kieuDuLieu: FieldType.TEXT, nhom: 'Đại diện CĐT', thuTu: 8 },
        { khoa: 'DiaChiChuDauTu', tenTruong: 'Địa chỉ Chủ đầu tư', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Chi tiết CĐT', thuTu: 9 },
        { khoa: 'DienThoaiChuDauTu', tenTruong: 'Điện thoại Chủ đầu tư', kieuDuLieu: FieldType.PHONE, nhom: 'Chi tiết CĐT', thuTu: 10 },
        { khoa: 'MaSoThueChuDauTu', tenTruong: 'Mã số thuế Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Chi tiết CĐT', thuTu: 11 },
        { khoa: 'ThongTinTaiKhoanChuDauTu', tenTruong: 'Tài khoản Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Chi tiết CĐT', thuTu: 12 },
        { khoa: 'DaiDienNhaThau', tenTruong: 'Đại diện Nhà thầu', kieuDuLieu: FieldType.TEXT, nhom: 'Đại diện Nhà thầu', thuTu: 13 },
        { khoa: 'ChucVuDaiDienNhaThau', tenTruong: 'Chức vụ đại diện Nhà thầu', kieuDuLieu: FieldType.TEXT, nhom: 'Đại diện Nhà thầu', thuTu: 14 },
        { khoa: 'DiaChiNhaThau', tenTruong: 'Địa chỉ Nhà thầu', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Chi tiết Nhà thầu', thuTu: 15 },
        { khoa: 'SoDienThoaiNhaThau', tenTruong: 'Số điện thoại Nhà thầu', kieuDuLieu: FieldType.PHONE, nhom: 'Chi tiết Nhà thầu', thuTu: 16 },
        { khoa: 'MaSoThueNhaThau', tenTruong: 'Mã số thuế Nhà thầu', kieuDuLieu: FieldType.TEXT, nhom: 'Chi tiết Nhà thầu', thuTu: 17 },
        { khoa: 'ThongTinTaiKhoanNhaThau', tenTruong: 'Tài khoản Nhà thầu', kieuDuLieu: FieldType.TEXT, nhom: 'Chi tiết Nhà thầu', thuTu: 18 },
        { khoa: 'DiaDanh', tenTruong: 'Địa danh', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin chung', thuTu: 19 },
      ],
    },
  ];

  let libCount = 0;
  for (const libDef of libraryDefs) {
    const existingLib = await prisma.library.findFirst({
      where: { ten: libDef.name, organizationId: libDef.orgId },
    });

    let libId: string;
    if (!existingLib) {
      const lib = await prisma.library.create({
        data: {
          ten: libDef.name,
          loai: libDef.type,
          organizationId: libDef.orgId,
        },
      });
      libId = lib.id;
    } else {
      libId = existingLib.id;
      // Delete existing fields to re-seed
      await prisma.libraryField.deleteMany({ where: { libraryId: libId } });
    }

    const fieldData = libDef.fields.map(f => ({
      ...f,
      libraryId: libId,
    }));
    await prisma.libraryField.createMany({ data: fieldData });
    libCount++;
    console.log(`[Library] ${libDef.name}: ${libDef.fields.length} fields`);
  }

  console.log(`[Library] Seed completed! ${libCount} libraries created.`);
}
