import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { LlmProvider } from './llm-provider';

@Module({
  imports: [UsersModule],
  providers: [AssistantService, LlmProvider],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
