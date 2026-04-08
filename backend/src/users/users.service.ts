import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isInvestor: true, isContractor: true, department: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRole(role: Role) {
    return this.prisma.user.findMany({
      where: { role },
      select: { id: true, name: true, email: true, role: true, isInvestor: true, isContractor: true, department: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isInvestor: true, isContractor: true, department: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: { name: string; email: string; password: string; role: Role; department?: string; isInvestor?: boolean; isContractor?: boolean }) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new BadRequestException('Email already exists');

    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { ...data, password: hash },
      select: { id: true, name: true, email: true, role: true, isInvestor: true, isContractor: true, department: true, createdAt: true },
    });
    return user;
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, isInvestor: true, isContractor: true, department: true },
    });
  }

  async updateUser(id: string, data: { name?: string; email?: string; department?: string; isInvestor?: boolean; isContractor?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (data.email && data.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (exists) throw new BadRequestException('Email already exists');
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isInvestor: true, isContractor: true, department: true, createdAt: true },
    });
  }

  async deleteUser(id: string, currentUserId: string) {
    if (id === currentUserId) throw new ForbiddenException('Cannot delete yourself');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.review.deleteMany({ where: { userId: id } });
    await this.prisma.document.updateMany({ where: { delegatedTo: id }, data: { delegatedTo: null } });
    await this.prisma.document.deleteMany({ where: { createdBy: id } });
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new BadRequestException('Mật khẩu cũ không đúng');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return { message: 'Password changed' };
  }

  async adminResetPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return { message: 'Password reset' };
  }

  async getPermissions(role: Role) {
    return this.prisma.rolePermission.findMany({ where: { role } });
  }

  async setPermissions(role: Role, permissionKeys: string[]) {
    await this.prisma.rolePermission.deleteMany({ where: { role } });
    const data = permissionKeys.map((key) => ({ role, permissionKey: key }));
    await this.prisma.rolePermission.createMany({ data });
    return this.prisma.rolePermission.findMany({ where: { role } });
  }
}
