import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsArray, IsBoolean } from 'class-validator';

class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsBoolean() isInvestor?: boolean;
  @IsOptional() @IsBoolean() isContractor?: boolean;
}

class UpdateRoleDto {
  @IsEnum(Role) role: Role;
}

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsBoolean() isInvestor?: boolean;
  @IsOptional() @IsBoolean() isContractor?: boolean;
}

class ChangePasswordDto {
  @IsString() @MinLength(6) oldPassword: string;
  @IsString() @MinLength(6) newPassword: string;
}

class AdminChangePasswordDto {
  @IsString() @MinLength(6) newPassword: string;
}

class SetPermissionsDto {
  @IsEnum(Role) role: Role;
  @IsArray() @IsString({ each: true }) permissionKeys: string[];
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.HEAD_OF_DEPARTMENT)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('by-role/:role')
  findByRole(@Param('role') role: Role) {
    return this.usersService.findByRole(role);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('permissions/:role')
  @Roles(Role.ADMIN)
  getPermissions(@Param('role') role: Role) {
    return this.usersService.getPermissions(role);
  }

  @Post('change-password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.sub, dto.oldPassword, dto.newPassword);
  }

  @Post('permissions')
  @Roles(Role.ADMIN)
  setPermissions(@Body() dto: SetPermissionsDto) {
    return this.usersService.setPermissions(dto.role, dto.permissionKeys);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  adminResetPassword(@Param('id') id: string, @Body() dto: AdminChangePasswordDto) {
    return this.usersService.adminResetPassword(id, dto.newPassword);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deleteUser(@Param('id') id: string, @Request() req: any) {
    return this.usersService.deleteUser(id, req.user.sub);
  }
}
