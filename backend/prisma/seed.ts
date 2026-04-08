import { PrismaClient, Role } from '@prisma/client';
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

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
