import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { EffectivePermissionsService } from './effective-permissions.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private effectivePermissions: EffectivePermissionsService,
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

    const resolved = await this.effectivePermissions.resolve(user.id);
    const effectivePermissions = resolved.effectivePermissions;
    const canFinalApprove = effectivePermissions.includes('approval:final');
    const canApprove =
      canFinalApprove ||
      effectivePermissions.includes('approval:review') ||
      user.canApprove;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: effectivePermissions,
      dynamicRoles: resolved.dynamicRoles,
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
        canApprove,
        canFinalApprove,
        position: user.position,
        dynamicRoles: resolved.dynamicRoles,
        permissions: effectivePermissions,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const resolved = await this.effectivePermissions.resolve(user.id);
    const effectivePermissions = resolved.effectivePermissions;
    const canFinalApprove = effectivePermissions.includes('approval:final');
    const canApprove =
      canFinalApprove ||
      effectivePermissions.includes('approval:review') ||
      user.canApprove;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isInvestor: user.isInvestor,
      isContractor: user.isContractor,
      canApprove,
      canFinalApprove,
      position: user.position,
      dynamicRoles: resolved.dynamicRoles,
      permissions: effectivePermissions,
    };
  }
}
