import { PrismaClient, Role, LibraryType, FieldType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  const users = [
    { name: 'Admin', email: 'admin@qlda.vn', password: hash, role: Role.ADMIN, department: 'IT' },
    { name: 'Nguyen Van A', email: 'investor@qlda.vn', password: hash, role: Role.INVESTOR, department: 'Phòng Mua sắm' },
    { name: 'Tran Van B', email: 'head@qlda.vn', password: hash, role: Role.HEAD_OF_DEPARTMENT, department: 'Phòng Thẩm định' },
    { name: 'Le Van C', email: 'director@qlda.vn', password: hash, role: Role.DIRECTOR, department: 'Ban Giám đốc' },
    { name: 'Pham Thi D', email: 'investor2@qlda.vn', password: hash, role: Role.INVESTOR, department: 'Phòng Mua sắm' },
  ];

  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: u });
  }

  const permissions = [
    // INVESTOR
    { role: Role.INVESTOR, permissionKey: 'doc:create' },
    { role: Role.INVESTOR, permissionKey: 'doc:read' },
    { role: Role.INVESTOR, permissionKey: 'doc:edit' },
    // HEAD_OF_DEPARTMENT
    { role: Role.HEAD_OF_DEPARTMENT, permissionKey: 'doc:read' },
    { role: Role.HEAD_OF_DEPARTMENT, permissionKey: 'doc:create' },
    { role: Role.HEAD_OF_DEPARTMENT, permissionKey: 'doc:approve' },
    { role: Role.HEAD_OF_DEPARTMENT, permissionKey: 'doc:reject' },
    { role: Role.HEAD_OF_DEPARTMENT, permissionKey: 'doc:delegate' },
    // DIRECTOR
    { role: Role.DIRECTOR, permissionKey: 'doc:read' },
    { role: Role.DIRECTOR, permissionKey: 'doc:approve' },
    { role: Role.DIRECTOR, permissionKey: 'doc:reject' },
    // ADMIN
    { role: Role.ADMIN, permissionKey: 'admin:full' },
    { role: Role.ADMIN, permissionKey: 'doc:create' },
    { role: Role.ADMIN, permissionKey: 'doc:read' },
    { role: Role.ADMIN, permissionKey: 'doc:edit' },
    { role: Role.ADMIN, permissionKey: 'doc:approve' },
    { role: Role.ADMIN, permissionKey: 'doc:reject' },
    { role: Role.ADMIN, permissionKey: 'doc:delegate' },
    { role: Role.ADMIN, permissionKey: 'user:manage' },
  ];

  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: { role_permissionKey: { role: p.role, permissionKey: p.permissionKey } },
      update: {},
      create: p,
    });
  }

  // Document Library seed
  const existingOrgs = await prisma.organization.findMany();
  if (existingOrgs.length === 0) {
    const orgA = await prisma.organization.create({
      data: { ten: 'Tổ chức A - Chủ đầu tư', moTa: 'Tổ chức mặc định bên A (Chủ đầu tư)' },
    });
    const orgB = await prisma.organization.create({
      data: { ten: 'Tổ chức B - Nhà thầu', moTa: 'Tổ chức mặc định bên B (Nhà thầu)' },
    });

    const cdtFields = [
      { tenTruong: 'Tên công ty', khoa: 'cdt_ten_cong_ty', kieuDuLieu: FieldType.TEXT, thuTu: 1, nhom: 'Thông tin chung' },
      { tenTruong: 'Địa chỉ', khoa: 'cdt_dia_chi', kieuDuLieu: FieldType.TEXTAREA, thuTu: 2, nhom: 'Thông tin chung' },
      { tenTruong: 'Mã số thuế', khoa: 'cdt_ma_so_thue', kieuDuLieu: FieldType.TEXT, thuTu: 3, nhom: 'Thông tin chung' },
      { tenTruong: 'Số tài khoản', khoa: 'cdt_so_tai_khoan', kieuDuLieu: FieldType.TEXT, thuTu: 4, nhom: 'Tài khoản ngân hàng' },
      { tenTruong: 'Ngân hàng', khoa: 'cdt_ngan_hang', kieuDuLieu: FieldType.TEXT, thuTu: 5, nhom: 'Tài khoản ngân hàng' },
      { tenTruong: 'Đại diện theo pháp luật', khoa: 'cdt_dai_dien', kieuDuLieu: FieldType.TEXT, thuTu: 6, nhom: 'Người đại diện' },
      { tenTruong: 'Chức vụ', khoa: 'cdt_chuc_vu', kieuDuLieu: FieldType.TEXT, thuTu: 7, nhom: 'Người đại diện' },
      { tenTruong: 'Email', khoa: 'cdt_email', kieuDuLieu: FieldType.EMAIL, thuTu: 8, nhom: 'Liên hệ' },
      { tenTruong: 'Điện thoại', khoa: 'cdt_dien_thoai', kieuDuLieu: FieldType.PHONE, thuTu: 9, nhom: 'Liên hệ' },
    ];
    const ntFields = [
      { tenTruong: 'Tên công ty', khoa: 'nt_ten_cong_ty', kieuDuLieu: FieldType.TEXT, thuTu: 1, nhom: 'Thông tin chung' },
      { tenTruong: 'Địa chỉ', khoa: 'nt_dia_chi', kieuDuLieu: FieldType.TEXTAREA, thuTu: 2, nhom: 'Thông tin chung' },
      { tenTruong: 'Mã số thuế', khoa: 'nt_ma_so_thue', kieuDuLieu: FieldType.TEXT, thuTu: 3, nhom: 'Thông tin chung' },
      { tenTruong: 'Số tài khoản', khoa: 'nt_so_tai_khoan', kieuDuLieu: FieldType.TEXT, thuTu: 4, nhom: 'Tài khoản ngân hàng' },
      { tenTruong: 'Ngân hàng', khoa: 'nt_ngan_hang', kieuDuLieu: FieldType.TEXT, thuTu: 5, nhom: 'Tài khoản ngân hàng' },
      { tenTruong: 'Đại diện theo pháp luật', khoa: 'nt_dai_dien', kieuDuLieu: FieldType.TEXT, thuTu: 6, nhom: 'Người đại diện' },
      { tenTruong: 'Chức vụ', khoa: 'nt_chuc_vu', kieuDuLieu: FieldType.TEXT, thuTu: 7, nhom: 'Người đại diện' },
      { tenTruong: 'Email', khoa: 'nt_email', kieuDuLieu: FieldType.EMAIL, thuTu: 8, nhom: 'Liên hệ' },
      { tenTruong: 'Điện thoại', khoa: 'nt_dien_thoai', kieuDuLieu: FieldType.PHONE, thuTu: 9, nhom: 'Liên hệ' },
    ];
    const kyTuongCdtFields = [
      { tenTruong: 'Họ tên người ký', khoa: 'cdt_ky_ten', kieuDuLieu: FieldType.TEXT, thuTu: 1, nhom: 'Người ký' },
      { tenTruong: 'Chức vụ', khoa: 'cdt_ky_chuc_vu', kieuDuLieu: FieldType.TEXT, thuTu: 2, nhom: 'Người ký' },
    ];
    const kyTuongNtFields = [
      { tenTruong: 'Họ tên người ký', khoa: 'nt_ky_ten', kieuDuLieu: FieldType.TEXT, thuTu: 1, nhom: 'Người ký' },
      { tenTruong: 'Chức vụ', khoa: 'nt_ky_chuc_vu', kieuDuLieu: FieldType.TEXT, thuTu: 2, nhom: 'Người ký' },
    ];

    const libCdt = await prisma.library.create({ data: { ten: 'Thông tin Chủ đầu tư', loai: LibraryType.THONG_TIN_TO_CHUC, organizationId: orgA.id } });
    const libNt = await prisma.library.create({ data: { ten: 'Thông tin Nhà thầu', loai: LibraryType.THONG_TIN_NHA_THAU, organizationId: orgB.id } });
    const libKyCdt = await prisma.library.create({ data: { ten: 'Thông tin người ký CDT', loai: LibraryType.KY_TUONG, organizationId: orgA.id } });
    const libKyNt = await prisma.library.create({ data: { ten: 'Thông tin người ký NT', loai: LibraryType.KY_TUONG, organizationId: orgB.id } });

    await prisma.libraryField.createMany({ data: cdtFields.map(f => ({ ...f, libraryId: libCdt.id })) });
    await prisma.libraryField.createMany({ data: ntFields.map(f => ({ ...f, libraryId: libNt.id })) });
    await prisma.libraryField.createMany({ data: kyTuongCdtFields.map(f => ({ ...f, libraryId: libKyCdt.id })) });
    await prisma.libraryField.createMany({ data: kyTuongNtFields.map(f => ({ ...f, libraryId: libKyNt.id })) });

    console.log('[DocumentLibrary] Seed: 2 organizations, 4 libraries created.');
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
