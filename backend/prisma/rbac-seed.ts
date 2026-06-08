import { PrismaClient, Prisma } from '@prisma/client';

const permissionData = [
  // Documents
  { key: 'doc:create', displayName: 'Tạo tài liệu', description: 'Tạo tờ trình, quyết định, báo cáo', category: 'documents' },
  { key: 'doc:read', displayName: 'Xem tài liệu', description: 'Xem danh sách và chi tiết tài liệu', category: 'documents' },
  { key: 'doc:edit', displayName: 'Sửa tài liệu', description: 'Chỉnh sửa tài liệu', category: 'documents' },
  { key: 'doc:delete', displayName: 'Xóa tài liệu', description: 'Xóa tài liệu', category: 'documents' },
  { key: 'doc:approve', displayName: 'Phê duyệt tài liệu', description: 'Phê duyệt tài liệu chờ duyệt', category: 'documents' },
  { key: 'doc:reject', displayName: 'Từ chối tài liệu', description: 'Từ chối tài liệu', category: 'documents' },
  { key: 'doc:delegate', displayName: 'Ủy quyền', description: 'Ủy quyền tạo QĐ KHLCNT', category: 'documents' },
  // Budget / Dự toán
  { key: 'budget:create', displayName: 'Tạo dự toán', description: 'Tạo dự toán', category: 'budget' },
  { key: 'budget:read', displayName: 'Xem dự toán', description: 'Xem dự toán', category: 'budget' },
  { key: 'budget:approve', displayName: 'Duyệt dự toán', description: 'Duyệt dự toán', category: 'budget' },
  { key: 'budget:reject', displayName: 'Từ chối dự toán', description: 'Từ chối dự toán', category: 'budget' },
  // Plan / KHLCNT
  { key: 'plan:create', displayName: 'Tạo KH LCNT', description: 'Tạo kế hoạch lựa chọn nhà thầu', category: 'plan' },
  { key: 'plan:read', displayName: 'Xem KH LCNT', description: 'Xem kế hoạch lựa chọn nhà thầu', category: 'plan' },
  { key: 'plan:review', displayName: 'Thẩm định KH LCNT', description: 'Thẩm định kế hoạch', category: 'plan' },
  { key: 'plan:approve', displayName: 'Duyệt KH LCNT', description: 'Phê duyệt kế hoạch', category: 'plan' },
  { key: 'plan:reject', displayName: 'Từ chối KH LCNT', description: 'Từ chối kế hoạch', category: 'plan' },
  // Users
  { key: 'user:create', displayName: 'Tạo người dùng', description: 'Tạo tài khoản mới', category: 'users' },
  { key: 'user:read', displayName: 'Xem người dùng', description: 'Xem danh sách người dùng', category: 'users' },
  { key: 'user:edit', displayName: 'Sửa người dùng', description: 'Chỉnh sửa thông tin người dùng', category: 'users' },
  { key: 'user:delete', displayName: 'Xóa người dùng', description: 'Xóa tài khoản người dùng', category: 'users' },
  // Roles
  { key: 'role:manage', displayName: 'Quản lý vai trò', description: 'Tạo/sửa/xóa vai trò và phân quyền', category: 'roles' },
  // Đặt sách
  { key: 'datsach:create', displayName: 'Tạo dự án đặt sách', description: 'Tạo dự án đặt sách', category: 'dat-sach' },
  { key: 'datsach:read', displayName: 'Xem đặt sách', description: 'Xem danh sách đặt sách', category: 'dat-sach' },
  { key: 'datsach:approve', displayName: 'Duyệt đặt sách', description: 'Duyệt GDN, PCDI, QĐ', category: 'dat-sach' },
  // Thanh toán
  { key: 'payment:create', displayName: 'Tạo thanh toán', description: 'Tạo yêu cầu thanh toán', category: 'payment' },
  { key: 'payment:read', displayName: 'Xem thanh toán', description: 'Xem danh sách thanh toán', category: 'payment' },
  { key: 'payment:approve', displayName: 'Duyệt thanh toán', description: 'Duyệt thanh toán', category: 'payment' },
  // Admin
  { key: 'admin:full', displayName: 'Toàn quyền admin', description: 'Toàn quyền quản trị hệ thống', category: 'admin' },
];

const roleData = [
  { name: 'giam_doc', displayName: 'Giám đốc', description: 'Giám đốc công ty', priority: 90 },
  { name: 'ke_toan', displayName: 'Kế toán', description: 'Nhân viên kế toán', priority: 50 },
  { name: 'chu_dau_tu', displayName: 'Chủ đầu tư', description: 'Chủ đầu tư', priority: 40 },
  { name: 'truong_phong', displayName: 'Trưởng phòng', description: 'Trưởng các phòng ban', priority: 70 },
  { name: 'pho_phong', displayName: 'Phó phòng', description: 'Phó phòng ban', priority: 60 },
  { name: 'nhan_vien', displayName: 'Nhân viên', description: 'Nhân viên thường', priority: 20 },
  { name: 'quan_ly_du_an', displayName: 'Quản lý dự án', description: 'Quản lý dự án mua sắm', priority: 30 },
  { name: 'tham_dinh_vien', displayName: 'Thẩm định viên', description: 'Thẩm định viên', priority: 35 },
];

const rolePermissions: Record<string, string[]> = {
  giam_doc: [
    'doc:read', 'doc:approve', 'doc:reject',
    'budget:read', 'budget:approve', 'budget:reject',
    'plan:read', 'plan:approve', 'plan:reject',
    'datsach:read', 'datsach:approve',
    'payment:read', 'payment:approve',
  ],
  truong_phong: [
    'doc:read', 'doc:create', 'doc:approve', 'doc:reject', 'doc:delegate',
    'budget:read', 'budget:approve', 'budget:reject',
    'plan:read', 'plan:review', 'plan:approve', 'plan:reject',
    'datsach:read', 'datsach:approve',
    'payment:read', 'payment:approve',
  ],
  pho_phong: [
    'doc:read', 'doc:create', 'doc:edit', 'doc:approve', 'doc:reject',
    'budget:read', 'budget:create', 'budget:approve', 'budget:reject',
    'plan:read', 'plan:create', 'plan:review', 'plan:approve', 'plan:reject',
    'datsach:read', 'datsach:approve',
    'payment:read', 'payment:approve',
  ],
  ke_toan: [
    'doc:read', 'budget:read', 'budget:create', 'payment:read', 'payment:create', 'payment:approve',
  ],
  chu_dau_tu: [
    'doc:read', 'doc:create', 'doc:edit', 'budget:read', 'budget:create',
    'plan:read', 'plan:create', 'datsach:read', 'datsach:create',
    'payment:read', 'payment:create',
  ],
  nhan_vien: [
    'doc:read', 'budget:read', 'plan:read', 'datsach:read',
  ],
  quan_ly_du_an: [
    'doc:read', 'doc:create', 'budget:read', 'budget:create',
    'plan:read', 'plan:create', 'datsach:read', 'datsach:create',
    'payment:read', 'payment:create',
  ],
  tham_dinh_vien: [
    'doc:read', 'budget:read', 'plan:read', 'plan:review',
    'datsach:read', 'payment:read',
  ],
};

export async function seedRbac(prisma: PrismaClient, adminId?: string) {
  console.log('[RBAC] Seeding permissions...');

  const createdPermissions: Record<string, string> = {};
  for (const perm of permissionData) {
    const existing = await prisma.permission.findUnique({ where: { key: perm.key } });
    if (!existing) {
      const created = await prisma.permission.create({ data: perm });
      createdPermissions[perm.key] = created.id;
    } else {
      createdPermissions[perm.key] = existing.id;
    }
  }
  console.log(`[RBAC] ${Object.keys(createdPermissions).length} permissions ready`);

  console.log('[RBAC] Seeding roles...');
  const createdRoles: Record<string, string> = {};
  for (const role of roleData) {
    const existing = await prisma.dynamicRole.findUnique({ where: { name: role.name } });
    if (!existing) {
      const created = await prisma.dynamicRole.create({ data: role });
      createdRoles[role.name] = created.id;
    } else {
      createdRoles[role.name] = existing.id;
    }
  }
  console.log(`[RBAC] ${roleData.length} roles ready`);

  console.log('[RBAC] Assigning permissions to roles...');
  for (const [roleName, permKeys] of Object.entries(rolePermissions)) {
    const roleId = createdRoles[roleName];
    if (!roleId) continue;

    for (const permKey of permKeys) {
      const permId = createdPermissions[permKey];
      if (!permId) continue;

      await prisma.dynamicRolePermission.upsert({
        where: { roleId_permId: { roleId, permId } },
        update: {},
        create: { roleId, permId },
      });
    }
  }
  console.log('[RBAC] Permissions assigned to roles');

  if (adminId) {
    console.log('[RBAC] Assigning dynamic roles to admin...');
    const adminRoleIds = [createdRoles['giam_doc'], createdRoles['ke_toan'], createdRoles['nhan_vien']].filter(Boolean);
    for (const roleId of adminRoleIds) {
      await prisma.userDynamicRole.upsert({
        where: { userId_roleId: { userId: adminId, roleId } },
        update: {},
        create: { userId: adminId, roleId },
      });
    }
    console.log('[RBAC] Admin assigned to giam_doc + ke_toan + nhan_vien');
  }

  console.log('[RBAC] Seed completed!');
}
