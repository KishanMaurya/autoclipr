import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SupabaseAdminService } from './supabase-admin.service';

@Global()
@Module({
  providers: [DatabaseService, SupabaseAdminService],
  exports: [DatabaseService, SupabaseAdminService],
})
export class DatabaseModule {}
