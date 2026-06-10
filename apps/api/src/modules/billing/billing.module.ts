import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BillingController } from './billing.controller';

@Module({
  imports: [UsersModule],
  controllers: [BillingController],
})
export class BillingModule {}
