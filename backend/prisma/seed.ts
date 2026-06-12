import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create only 1 admin account
  const hash = await bcrypt.hash('10122002', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'dinhcongnhat.02@gmail.com' },
    update: {},
    create: {
      name: 'Admin Hệ thống',
      email: 'dinhcongnhat.02@gmail.com',
      password: hash,
      role: Role.ADMIN,
      department: 'Quản trị',
      position: 'Quản trị viên',
      canApprove: true,
    },
  });
  console.log(`[User] ${admin.name} (${admin.role}, canApprove: ${admin.canApprove})`);

  // Legacy permissions for admin (RolePermission table)
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

  // Run rbac-seed
  const { seedRbac } = await import('./rbac-seed');
  await seedRbac(prisma, admin.id);

  // Run library seed
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
