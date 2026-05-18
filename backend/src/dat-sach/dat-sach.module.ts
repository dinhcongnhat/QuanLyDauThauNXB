import { Module } from '@nestjs/common';
import { DatSachService } from './dat-sach.service';
import { DatSachController } from './dat-sach.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [DatSachController],
  providers: [DatSachService],
})
export class DatSachModule {}
