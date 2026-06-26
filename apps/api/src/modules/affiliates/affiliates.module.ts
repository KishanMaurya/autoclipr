import { Module } from '@nestjs/common';
import { EmailModule } from '@autoclipr/emails';
import { DatabaseModule } from '../../database/database.module';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesRepository } from './affiliates.repository';
import { AffiliatesService } from './affiliates.service';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [AffiliatesController],
  providers: [AffiliatesRepository, AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
