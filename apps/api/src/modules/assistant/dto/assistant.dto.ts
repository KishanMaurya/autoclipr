import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

class ChatTurnDto {
  /** 'system' is deliberately not accepted — that would be prompt injection. */
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @Length(1, 2000)
  content!: string;
}

class AssistantContextDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  page?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  pageTitle?: string;
}

export class AssistantChatDto {
  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  conversationId?: string;

  /** Bounded so a caller cannot replay a huge history and inflate cost. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantContextDto)
  context?: AssistantContextDto;
}
