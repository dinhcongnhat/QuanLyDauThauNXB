import { Module } from '@nestjs/common';
import { BidParticipationController } from './bid-participation.controller';
import { BidParticipationService } from './bid-participation.service';

@Module({
  controllers: [BidParticipationController],
  providers: [BidParticipationService],
})
export class BidParticipationModule {}
