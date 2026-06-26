import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesRepository } from './affiliates.repository';
import { AffiliatesService } from './affiliates.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AffiliatesController],
  providers: [AffiliatesRepository, AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
