import { Module } from '@nestjs/common';
import { DocumentLibraryController } from './document-library.controller';
import { DocumentLibraryService } from './document-library.service';

@Module({
  providers: [DocumentLibraryService],
  controllers: [DocumentLibraryController],
  exports: [DocumentLibraryService],
})
export class DocumentLibraryModule {}
