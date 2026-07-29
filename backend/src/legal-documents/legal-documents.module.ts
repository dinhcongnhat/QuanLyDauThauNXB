import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';

@Module({
  controllers: [LegalDocumentsController],
  providers: [LegalDocumentsService, RolesGuard],
  exports: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
