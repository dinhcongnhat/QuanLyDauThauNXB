import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalGuard } from './approval.guard';
import {
  ApprovalDossiersController,
  ApprovalRequestDossierController,
} from './approval-dossiers.controller';
import { ApprovalDossiersService } from './approval-dossiers.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [
    ApprovalsController,
    ApprovalDossiersController,
    ApprovalRequestDossierController,
  ],
  providers: [ApprovalsService, ApprovalDossiersService, ApprovalGuard],
  exports: [ApprovalsService, ApprovalDossiersService, ApprovalGuard],
})
export class ApprovalsModule {}
