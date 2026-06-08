import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto, UpdatePermissionDto, SetPermissionsDto, SetUserRolesDto } from './dto/rbac.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ====================== Roles ======================

  @Get('roles')
  async findAllRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('roles/:id')
  async findRoleById(@Param('id') id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Patch('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  @Get('roles/:id/users')
  async getRoleUsers(@Param('id') id: string) {
    return this.rbacService.getRoleUsers(id);
  }

  // ====================== Permissions ======================

  @Get('permissions')
  async findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Get('permissions/categories')
  async findPermissionsByCategory() {
    return this.rbacService.findPermissionsByCategory();
  }

  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Patch('permissions/:id')
  async updatePermission(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.rbacService.updatePermission(id, dto);
  }

  @Delete('permissions/:id')
  async deletePermission(@Param('id') id: string) {
    return this.rbacService.deletePermission(id);
  }

  // ====================== Role Permissions ======================

  @Get('roles/:id/permissions')
  async getRolePermissions(@Param('id') id: string) {
    return this.rbacService.getRolePermissions(id);
  }

  @Put('roles/:id/permissions')
  async setRolePermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.rbacService.setRolePermissions(id, dto);
  }

  @Delete('roles/:id/permissions/:permId')
  async removeRolePermission(@Param('id') id: string, @Param('permId') permId: string) {
    return this.rbacService.removeRolePermission(id, permId);
  }

  // ====================== User Roles ======================

  @Get('users/:id/roles')
  async getUserRoles(@Param('id') id: string) {
    return this.rbacService.getUserRoles(id);
  }

  @Put('users/:id/roles')
  async setUserRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto) {
    return this.rbacService.setUserRoles(id, dto);
  }

  @Post('users/:id/roles')
  async addUserRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.rbacService.addUserRole(id, body.roleId);
  }

  @Delete('users/:id/roles/:roleId')
  async removeUserRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.rbacService.removeUserRole(id, roleId);
  }

  // ====================== Effective Permissions ======================

  @Get('users/:id/effective-permissions')
  async getEffectivePermissions(@Param('id') id: string) {
    return this.rbacService.getEffectivePermissions(id);
  }
}
