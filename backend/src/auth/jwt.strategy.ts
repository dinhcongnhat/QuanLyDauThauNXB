import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EffectivePermissionsService } from './effective-permissions.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, canApprove: true },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
      );
    }

    const resolved = await this.effectivePermissions.resolve(user.id);
    const canFinalApprove =
      resolved.effectivePermissions.includes('approval:final');

    return {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: resolved.effectivePermissions,
      canApprove:
        canFinalApprove ||
        resolved.effectivePermissions.includes('approval:review') ||
        user.canApprove,
      canFinalApprove,
    };
  }
}
