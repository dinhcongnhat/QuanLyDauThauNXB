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
  // LCNT / Contractor Selection
  { key: 'lcnt:create', displayName: 'Tạo LCNT', description: 'Tạo quy trình lựa chọn nhà thầu', category: 'lcnt' },
  { key: 'lcnt:read', displayName: 'Xem LCNT', description: 'Xem quy trình lựa chọn nhà thầu', category: 'lcnt' },
  { key: 'lcnt:approve', displayName: 'Duyệt LCNT', description: 'Duyệt các bước LCNT', category: 'lcnt' },
  { key: 'lcnt:reject', displayName: 'Từ chối LCNT', description: 'Từ chối các bước LCNT', category: 'lcnt' },
];

const roleData = [
  // Dynamic roles - Super Admin được cấp quyền tự do
  { name: 'admin', displayName: 'Quản trị viên', description: 'Quản trị hệ thống - toàn quyền', priority: 100 },
  { name: 'ke_toan', displayName: 'Kế toán', description: 'Nhân viên kế toán', priority: 50 },
  { name: 'du_toan', displayName: 'Dự toán', description: 'Phụ trách dự toán', priority: 50 },
  { name: 'nhan_vien', displayName: 'Nhân viên', description: 'Nhân viên thường', priority: 20 },
  { name: 'quan_ly_du_an', displayName: 'Quản lý dự án', description: 'Quản lý dự án mua sắm', priority: 30 },
  { name: 'thau_thiet_bi', displayName: 'Thầu thiết bị', description: 'Phụ trách thầu thiết bị', priority: 40 },
  { name: 'thau_sach', displayName: 'Thầu sách', description: 'Phụ trách thầu sách', priority: 40 },
];

const rolePermissions: Record<string, string[]> = {
  admin: [
    'admin:full',
    'doc:create', 'doc:read', 'doc:edit', 'doc:delete', 'doc:approve', 'doc:reject', 'doc:delegate',
    'budget:create', 'budget:read', 'budget:approve', 'budget:reject',
    'plan:create', 'plan:read', 'plan:review', 'plan:approve', 'plan:reject',
    'user:create', 'user:read', 'user:edit', 'user:delete',
    'role:manage',
    'datsach:create', 'datsach:read', 'datsach:approve',
    'payment:create', 'payment:read', 'payment:approve',
    'lcnt:create', 'lcnt:read', 'lcnt:approve', 'lcnt:reject',
  ],
  ke_toan: [
    'doc:read', 'budget:read', 'budget:create', 'payment:read', 'payment:create', 'payment:approve',
    'datsach:read',
  ],
  du_toan: [
    'doc:read', 'doc:create', 'doc:edit',
    'budget:read', 'budget:create', 'budget:approve', 'budget:reject',
    'plan:read', 'plan:create',
    'datsach:read', 'datsach:create',
    'lcnt:read', 'lcnt:create',
  ],
  nhan_vien: [
    'doc:read', 'budget:read', 'plan:read', 'datsach:read',
    'payment:read',
  ],
  quan_ly_du_an: [
    'doc:read', 'doc:create', 'doc:edit',
    'budget:read', 'budget:create',
    'plan:read', 'plan:create',
    'datsach:read', 'datsach:create',
    'payment:read', 'payment:create',
    'lcnt:read', 'lcnt:create',
  ],
  thau_thiet_bi: [
    'doc:read', 'doc:create', 'doc:edit',
    'budget:read', 'budget:create',
    'plan:read', 'plan:create',
    'datsach:read',
    'payment:read', 'payment:create',
    'lcnt:read', 'lcnt:create',
  ],
  thau_sach: [
    'doc:read', 'doc:create', 'doc:edit',
    'budget:read', 'budget:create',
    'plan:read', 'plan:create',
    'datsach:read', 'datsach:create',
    'payment:read', 'payment:create',
    'lcnt:read', 'lcnt:create',
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
    const adminRoleIds = [createdRoles['admin'], createdRoles['ke_toan'], createdRoles['nhan_vien']].filter(Boolean);
    for (const roleId of adminRoleIds) {
      await prisma.userDynamicRole.upsert({
        where: { userId_roleId: { userId: adminId, roleId } },
        update: {},
        create: { userId: adminId, roleId },
      });
    }
    console.log('[RBAC] Admin assigned to admin + ke_toan + nhan_vien');
  }

  console.log('[RBAC] Seed completed!');
}
