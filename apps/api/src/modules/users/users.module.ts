import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { StorageService } from '../storage/storage.service';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [DatabaseModule],
  providers: [UsersRepository, UsersService, StorageService],
  controllers: [UsersController],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
