import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto, UpdatePermissionDto, SetPermissionsDto, SetUserRolesDto } from './dto/rbac.dto';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  // ====================== Roles ======================

  async findAllRoles() {
    return this.prisma.dynamicRole.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });
  }

  async findRoleById(id: string) {
    const role = await this.prisma.dynamicRole.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const exists = await this.prisma.dynamicRole.findUnique({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Role name already exists');

    return this.prisma.dynamicRole.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        priority: dto.priority ?? 0,
      },
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.dynamicRole.update({
      where: { id },
      data: {
        displayName: dto.displayName ?? role.displayName,
        description: dto.description ?? role.description,
        priority: dto.priority ?? role.priority,
        isActive: dto.isActive ?? role.isActive,
      },
    });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.dynamicRole.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Role deactivated' };
  }

  async getRoleUsers(roleId: string) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.userDynamicRole.findMany({
      where: { roleId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, department: true },
        },
      },
    });
  }

  // ====================== Permissions ======================

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async findPermissionsByCategory() {
    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });

    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    }

    return grouped;
  }

  async createPermission(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { key: dto.key } });
    if (exists) throw new BadRequestException('Permission key already exists');

    return this.prisma.permission.create({
      data: {
        key: dto.key,
        displayName: dto.displayName,
        description: dto.description,
        category: dto.category,
      },
    });
  }

  async updatePermission(id: string, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');

    return this.prisma.permission.update({
      where: { id },
      data: {
        displayName: dto.displayName ?? permission.displayName,
        description: dto.description ?? permission.description,
        isActive: dto.isActive ?? permission.isActive,
      },
    });
  }

  async deletePermission(id: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.prisma.permission.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Permission deactivated' };
  }

  // ====================== Role Permissions ======================

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const rolePermissions = await this.prisma.dynamicRolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  async setRolePermissions(roleId: string, dto: SetPermissionsDto) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });
    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Delete existing and create new
    await this.prisma.dynamicRolePermission.deleteMany({ where: { roleId } });

    const data = dto.permissionIds.map((permId) => ({
      roleId,
      permId,
    }));

    await this.prisma.dynamicRolePermission.createMany({ data });

    return this.getRolePermissions(roleId);
  }

  async addRolePermissions(roleId: string, dto: SetPermissionsDto) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });
    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Filter out already assigned
    const existing = await this.prisma.dynamicRolePermission.findMany({
      where: { roleId, permId: { in: dto.permissionIds } },
    });
    const existingPermIds = new Set(existing.map((e) => e.permId));
    const newPermIds = dto.permissionIds.filter((id) => !existingPermIds.has(id));

    if (newPermIds.length > 0) {
      const data = newPermIds.map((permId) => ({
        roleId,
        permId,
      }));
      await this.prisma.dynamicRolePermission.createMany({ data });
    }

    return this.getRolePermissions(roleId);
  }

  async removeRolePermission(roleId: string, permId: string) {
    const role = await this.prisma.dynamicRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const rolePermission = await this.prisma.dynamicRolePermission.findUnique({
      where: { roleId_permId: { roleId, permId } },
    });
    if (!rolePermission) throw new NotFoundException('Permission not assigned to role');

    await this.prisma.dynamicRolePermission.delete({
      where: { roleId_permId: { roleId, permId } },
    });

    return { message: 'Permission removed from role' };
  }

  // ====================== User Roles ======================

  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const userRoles = await this.prisma.userDynamicRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => ({
      roleId: ur.role.id,
      roleName: ur.role.name,
      displayName: ur.role.displayName,
      permissions: ur.role.permissions.map((rp) => rp.permission.key),
    }));
  }

  async setUserRoles(userId: string, dto: SetUserRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Verify all roles exist
    const roles = await this.prisma.dynamicRole.findMany({
      where: { id: { in: dto.roleIds } },
    });
    if (roles.length !== dto.roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Delete existing and create new
    await this.prisma.userDynamicRole.deleteMany({ where: { userId } });

    const data = dto.roleIds.map((roleId) => ({
      userId,
      roleId,
    }));

    await this.prisma.userDynamicRole.createMany({ data });

    return this.getUserRoles(userId);
  }

  async addUserRole(userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.dynamicRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.userDynamicRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (existing) throw new BadRequestException('User already has this role');

    await this.prisma.userDynamicRole.create({
      data: { userId, roleId },
    });

    return this.getUserRoles(userId);
  }

  async removeUserRole(userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const userRole = await this.prisma.userDynamicRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (!userRole) throw new NotFoundException('User does not have this role');

    await this.prisma.userDynamicRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    return { message: 'Role removed from user' };
  }

  // ====================== Effective Permissions ======================

  async getEffectivePermissions(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Get legacy permissions
    const legacyPerms = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
    });

    // Get dynamic permissions from user's dynamic roles
    const userDynamicRoles = await this.prisma.userDynamicRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const dynamicPermSet = new Set<string>();
    const dynamicRoleNames: string[] = [];
    for (const ur of userDynamicRoles) {
      dynamicRoleNames.push(ur.role.name);
      for (const rp of ur.role.permissions) {
        dynamicPermSet.add(rp.permission.key);
      }
    }

    return {
      userId: user.id,
      email: user.email,
      legacyRole: user.role,
      dynamicRoles: dynamicRoleNames,
      legacyPermissions: legacyPerms.map((p) => p.permissionKey),
      dynamicPermissions: Array.from(dynamicPermSet),
      effectivePermissions: [
        ...new Set([
          ...legacyPerms.map((p) => p.permissionKey),
          ...Array.from(dynamicPermSet),
        ]),
      ],
    };
  }
}
