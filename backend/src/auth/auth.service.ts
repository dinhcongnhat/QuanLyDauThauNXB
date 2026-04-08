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

    const permissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: permissions.map((p) => p.permissionKey),
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
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const permissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isInvestor: user.isInvestor,
      isContractor: user.isContractor,
      permissions: permissions.map((p) => p.permissionKey),
    };
  }
}
