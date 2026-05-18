import { Module } from '@nestjs/common';
import { BidParticipationController } from './bid-participation.controller';
import { BidParticipationService } from './bid-participation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, MinioModule, NotificationsModule],
  controllers: [BidParticipationController],
  providers: [BidParticipationService],
})
export class BidParticipationModule {}
