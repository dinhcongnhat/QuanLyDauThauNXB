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
        { khoa: 'soLuong', tenTruong: 'Số lượng tồn', kieuDuLieu: FieldType.NUMBER, nhom: 'Số lượng', thuTu: 8 },
        { khoa: 'thoiGianCan', tenTruong: 'Thời gian cần sách', kieuDuLieu: FieldType.TEXT, nhom: 'Yêu cầu', thuTu: 9 },
        { khoa: 'noiIn', tenTruong: 'Đề nghị nơi in', kieuDuLieu: FieldType.TEXT, nhom: 'Yêu cầu', thuTu: 10 },
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
        { khoa: 'phuongThucIn', tenTruong: 'Phương thức in', kieuDuLieu: FieldType.TEXT, nhom: 'Phương thức', thuTu: 2 },
        { khoa: 'tenSach', tenTruong: 'Tên sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 3 },
        { khoa: 'tacGia', tenTruong: 'Tác giả', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 4 },
        { khoa: 'soTrang', tenTruong: 'Số trang', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 5 },
        { khoa: 'khoSach', tenTruong: 'Khổ sách', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 6 },
        { khoa: 'soLuongIn', tenTruong: 'Số lượng in', kieuDuLieu: FieldType.NUMBER, nhom: 'Số lượng', thuTu: 7 },
        { khoa: 'giaTriHD', tenTruong: 'Giá trị hợp đồng', kieuDuLieu: FieldType.TEXT, nhom: 'Hợp đồng', thuTu: 8 },
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
        { khoa: 'soTrang', tenTruong: 'Số trang', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin sách', thuTu: 4 },
        { khoa: 'soLuongIn', tenTruong: 'Số lượng in', kieuDuLieu: FieldType.NUMBER, nhom: 'Số lượng', thuTu: 5 },
        { khoa: 'doiTac', tenTruong: 'Đối tác liên kết', kieuDuLieu: FieldType.TEXT, nhom: 'Đối tác', thuTu: 6 },
        { khoa: 'bienTapVien', tenTruong: 'Tên biên tập viên', kieuDuLieu: FieldType.TEXT, nhom: 'Đối tác', thuTu: 7 },
        { khoa: 'coSoIn', tenTruong: 'Cơ sở in', kieuDuLieu: FieldType.TEXT, nhom: 'Cơ sở in', thuTu: 8 },
        { khoa: 'isbn', tenTruong: 'ISBN', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin khác', thuTu: 9 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Yêu cầu', thuTu: 10 },
      ],
    },
    // ====== DUTOAN - TO TRINH ======
    {
      name: 'Mẫu Tờ trình Dự toán',
      type: 'DUTOAN_TT' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'tenDuAn', tenTruong: 'Tên dự án', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 1 },
        { khoa: 'chuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 2 },
        { khoa: 'diaDanh', tenTruong: 'Địa danh', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 3 },
        { khoa: 'donViTrinh', tenTruong: 'Đơn vị trình', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin trình', thuTu: 4 },
        { khoa: 'nguonVon', tenTruong: 'Nguồn vốn', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 5 },
        { khoa: 'diaDiemThucHien', tenTruong: 'Địa điểm thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 6 },
        { khoa: 'thoiGianThucHien', tenTruong: 'Thời gian thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 7 },
        { khoa: 'tongMucDauTu', tenTruong: 'Tổng mức đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 8 },
        { khoa: 'soToTrinh', tenTruong: 'Số tờ trình', kieuDuLieu: FieldType.TEXT, nhom: 'Số hiệu', thuTu: 9 },
        { khoa: 'ngayTrinh', tenTruong: 'Ngày trình', kieuDuLieu: FieldType.DATE, nhom: 'Số hiệu', thuTu: 10 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Khác', thuTu: 11 },
      ],
    },
    // ====== DUTOAN - QUYET DINH ======
    {
      name: 'Mẫu QĐ Dự toán',
      type: 'DUTOAN_QD' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'tenDuAn', tenTruong: 'Tên dự án', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 1 },
        { khoa: 'soQuyetDinh', tenTruong: 'Số quyết định', kieuDuLieu: FieldType.TEXT, nhom: 'Số hiệu', thuTu: 2 },
        { khoa: 'chuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 3 },
        { khoa: 'nguonVon', tenTruong: 'Nguồn vốn', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 4 },
        { khoa: 'diaDiemThucHien', tenTruong: 'Địa điểm thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 5 },
        { khoa: 'tongMucDauTu', tenTruong: 'Tổng mức đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 6 },
        { khoa: 'ngayKy', tenTruong: 'Ngày ký', kieuDuLieu: FieldType.DATE, nhom: 'Số hiệu', thuTu: 7 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Khác', thuTu: 8 },
      ],
    },
    // ====== KHLCNT ======
    {
      name: 'Mẫu KHLCNT',
      type: 'KHLCNT' as LibraryType,
      orgId: orgCdt.id,
      fields: [
        { khoa: 'tenDuAn', tenTruong: 'Tên dự án', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 1 },
        { khoa: 'chuDauTu', tenTruong: 'Chủ đầu tư', kieuDuLieu: FieldType.TEXT, nhom: 'Thông tin dự án', thuTu: 2 },
        { khoa: 'nguonVon', tenTruong: 'Nguồn vốn', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 3 },
        { khoa: 'diaDiemThucHien', tenTruong: 'Địa điểm thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 4 },
        { khoa: 'giaTriHopDong', tenTruong: 'Giá trị hợp đồng', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 5 },
        { khoa: 'hinhThucLuaChon', tenTruong: 'Hình thức lựa chọn', kieuDuLieu: FieldType.TEXT, nhom: 'Phương thức', thuTu: 6 },
        { khoa: 'thoiGianThucHien', tenTruong: 'Thời gian thực hiện', kieuDuLieu: FieldType.TEXT, nhom: 'Tài chính', thuTu: 7 },
        { khoa: 'ghiChu', tenTruong: 'Ghi chú', kieuDuLieu: FieldType.TEXTAREA, nhom: 'Khác', thuTu: 8 },
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
