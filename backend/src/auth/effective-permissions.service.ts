import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EffectivePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        canApprove: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [legacyPerms, userDynamicRoles, directPermissions] =
      await Promise.all([
        this.prisma.rolePermission.findMany({
          where: { role: user.role },
          select: { permissionKey: true },
        }),
        this.prisma.userDynamicRole.findMany({
          where: { userId: user.id, role: { isActive: true } },
          include: {
            role: {
              include: {
                permissions: {
                  where: { permission: { isActive: true } },
                  include: { permission: true },
                },
              },
            },
          },
        }),
        this.prisma.userPermission.findMany({
          where: { userId: user.id, permission: { isActive: true } },
          include: { permission: true },
        }),
      ]);

    const legacyPermissions = legacyPerms.map((item) => item.permissionKey);
    const dynamicPermissions = userDynamicRoles.flatMap((item) =>
      item.role.permissions.map((rolePermission) => rolePermission.permission.key),
    );
    const directPermissionKeys = directPermissions.map(
      (item) => item.permission.key,
    );
    const effectivePermissions = [
      ...new Set([
        ...legacyPermissions,
        ...dynamicPermissions,
        ...directPermissionKeys,
      ]),
    ];

    return {
      user,
      dynamicRoles: userDynamicRoles.map((item) => item.role.name),
      legacyPermissions,
      dynamicPermissions: [...new Set(dynamicPermissions)],
      directPermissions: [...new Set(directPermissionKeys)],
      effectivePermissions,
    };
  }

  async has(userId: string, permission: string) {
    const resolved = await this.resolve(userId);
    return resolved.effectivePermissions.includes(permission);
  }
}
