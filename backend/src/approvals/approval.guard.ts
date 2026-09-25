import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EffectivePermissionsService } from '../auth/effective-permissions.service';

@Injectable()
export class ApprovalGuard implements CanActivate {
  constructor(
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Bạn chưa đăng nhập');
    }

    const resolved = await this.effectivePermissions.resolve(userId);
    if (
      !resolved.user.canApprove &&
      resolved.user.role !== 'ADMIN' &&
      !resolved.effectivePermissions.includes('approval:review') &&
      !resolved.effectivePermissions.includes('approval:final')
    ) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt');
    }
    return true;
  }
}
