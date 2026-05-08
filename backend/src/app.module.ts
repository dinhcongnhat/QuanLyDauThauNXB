import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { ContractorSelectionModule } from './contractor-selection/contractor-selection.module';
import { MinioModule } from './minio/minio.module';
import { PaymentModule } from './payment/payment.module';
import { BidParticipationModule } from './bid-participation/bid-participation.module';
import { DatSachModule } from './dat-sach/dat-sach.module';

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    DocumentsModule,
    ContractorSelectionModule,
    PaymentModule,
    BidParticipationModule,
    DatSachModule,
  ],
})
export class AppModule {}
