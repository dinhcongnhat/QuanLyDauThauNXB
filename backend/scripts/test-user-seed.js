const { PrismaClient, Role, FieldType, LibraryType } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Create user nhat.var@gmail.com
  const hash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'nhat.var@gmail.com' },
    update: {},
    create: {
      name: 'Nhật Văn A',
      email: 'nhat.var@gmail.com',
      password: hash,
      role: Role.INVESTOR,
      department: 'Phòng Mua sắm',
    },
  });
  console.log('[User] Created/updated:', user.name, '|', user.email, '|', user.role);

  // Add permissions for INVESTOR
  const perms = [
    { role: Role.INVESTOR, permissionKey: 'doc:create' },
    { role: Role.INVESTOR, permissionKey: 'doc:read' },
    { role: Role.INVESTOR, permissionKey: 'doc:edit' },
    { role: Role.INVESTOR, permissionKey: 'doc:approve' },
    { role: Role.INVESTOR, permissionKey: 'doc:reject' },
    { role: Role.INVESTOR, permissionKey: 'doc:delegate' },
  ];
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionKey: { role: p.role, permissionKey: p.permissionKey } },
      update: {},
      create: p,
    });
  }
  console.log('[Permissions] INVESTOR permissions upserted.');

  // Seed document library if not exists
  const existingOrgs = await prisma.organization.findMany();
  if (existingOrgs.length === 0) {
    const orgA = await prisma.organization.create({ data: { ten: 'Tổ chức A - Chủ đầu tư', moTa: 'Tổ chức mặc định bên A (Chủ đầu tư)' } });
    const orgB = await prisma.organization.create({ data: { ten: 'Tổ chức B - Nhà thầu', moTa: 'Tổ chức mặc định bên B (Nhà thầu)' } });

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

    console.log('[DocumentLibrary] Seed: 2 orgs, 4 libs created.');
  } else {
    console.log('[DocumentLibrary] Already seeded, skipping.');
  }

  console.log('\nAll setup complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
