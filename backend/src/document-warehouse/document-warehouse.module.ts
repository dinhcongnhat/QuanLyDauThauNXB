import { Module } from '@nestjs/common';
import { DocumentWarehouseController } from './document-warehouse.controller';
import { DocumentWarehouseService } from './document-warehouse.service';

@Module({
  controllers: [DocumentWarehouseController],
  providers: [DocumentWarehouseService],
})
export class DocumentWarehouseModule {}
