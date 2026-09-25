import { Module } from '@nestjs/common';
import { ContractorSelectionService } from './contractor-selection.service';
import { ContractorSelectionController } from './contractor-selection.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, ApprovalsModule],
  controllers: [ContractorSelectionController],
  providers: [ContractorSelectionService],
})
export class ContractorSelectionModule {}
