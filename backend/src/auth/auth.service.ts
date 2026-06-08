import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

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

    // Union of legacy + dynamic permissions
    const effectivePermissions = [
      ...new Set([
        ...legacyPerms.map((p) => p.permissionKey),
        ...Array.from(dynamicPermSet),
      ]),
    ];

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: effectivePermissions,
      dynamicRoles: dynamicRoleNames,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isInvestor: user.isInvestor,
        isContractor: user.isContractor,
        dynamicRoles: dynamicRoleNames,
        permissions: effectivePermissions,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

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

    // Union of legacy + dynamic permissions
    const effectivePermissions = [
      ...new Set([
        ...legacyPerms.map((p) => p.permissionKey),
        ...Array.from(dynamicPermSet),
      ]),
    ];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isInvestor: user.isInvestor,
      isContractor: user.isContractor,
      dynamicRoles: dynamicRoleNames,
      permissions: effectivePermissions,
    };
  }
}
