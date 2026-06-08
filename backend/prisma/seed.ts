import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create users
  const hash = await bcrypt.hash('10122002', 10);

  const users = [
    { name: 'Admin Hệ thống', email: 'dinhcongnhat.02@gmail.com', role: Role.ADMIN, department: 'Quản trị' },
    { name: 'Nguyễn Văn A', email: 'nvana@qlda.vn', role: Role.INVESTOR, department: 'Phòng Mua sắm', isInvestor: true },
    { name: 'Trần Văn B', email: 'tvb@qlda.vn', role: Role.HEAD_OF_DEPARTMENT, department: 'Phòng Kế hoạch' },
    { name: 'Lê Thị C', email: 'ltc@qlda.vn', role: Role.DIRECTOR, department: 'Ban Giám đốc' },
    { name: 'Phạm Văn D', email: 'pvd@qlda.vn', role: Role.INVESTOR, department: 'Phòng Tài chính', isInvestor: true },
    { name: 'Hoàng Thị E', email: 'hte@qlda.vn', role: Role.INVESTOR, department: 'Phòng Mua sắm', isInvestor: true },
    { name: 'Đặng Văn F', email: 'dvf@qlda.vn', role: Role.HEAD_OF_DEPARTMENT, department: 'Phòng Kỹ thuật' },
    { name: 'Vũ Thị G', email: 'vtg@qlda.vn', role: Role.INVESTOR, department: 'Phòng Hành chính', isInvestor: true },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hash,
        role: u.role,
        department: u.department,
        isInvestor: u.isInvestor || false,
      },
    });
    createdUsers[u.email] = user.id;
    console.log(`[User] ${u.name} (${u.role})`);
  }

  const adminId = createdUsers['dinhcongnhat.02@gmail.com'];

  // 2. Legacy permissions for admin (RolePermission table)
  const legacyPerms = [
    'admin:full', 'doc:create', 'doc:read', 'doc:edit', 'doc:delete',
    'doc:approve', 'doc:reject', 'doc:delegate',
    'user:manage',
  ];
  for (const key of legacyPerms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionKey: { role: Role.ADMIN, permissionKey: key } },
      update: {},
      create: { role: Role.ADMIN, permissionKey: key },
    });
  }
  console.log('[Legacy RBAC] Permissions seeded for ADMIN');

  // 3. Run rbac-seed
  const { seedRbac } = await import('./rbac-seed');
  await seedRbac(prisma, adminId);

  // 4. Run library seed
  const { seedLibraries } = await import('./seed-module-libraries');
  await seedLibraries(prisma);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
