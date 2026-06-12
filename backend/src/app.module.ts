import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { ProjectModule } from './project/project.module';
import { DocumentLibraryModule } from './document-library/document-library.module';
import { RbacModule } from './rbac/rbac.module';
import { ChatModule } from './chat/chat.module';

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
    ProjectModule,
    DocumentLibraryModule,
    RbacModule,
    ChatModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: any) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          const msg = `[Request] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`;
          if (duration > 1000) {
            console.warn(`\x1b[33m${msg}\x1b[0m`);
          } else {
            console.log(msg);
          }
        });
        next();
      })
      .forRoutes('*');
  }
}
