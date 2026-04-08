import { Module } from '@nestjs/common';
import { ContractorSelectionService } from './contractor-selection.service';
import { ContractorSelectionController } from './contractor-selection.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ContractorSelectionController],
  providers: [ContractorSelectionService],
})
export class ContractorSelectionModule {}
