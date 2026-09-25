import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.permissions) {
      throw new ForbiddenException('No permissions found');
    }

    if (user.role === 'ADMIN' || user.permissions.includes('admin:full')) {
      return true;
    }

    const hasPermission = requiredPermissions.some((p) =>
      user.permissions.includes(p),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền truy cập chức năng này');
    }
    return true;
  }
}
