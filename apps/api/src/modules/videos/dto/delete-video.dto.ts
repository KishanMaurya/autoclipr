import { IsUUID } from 'class-validator';

export class DeleteVideoDto {
  @IsUUID('4')
  video_id!: string;
}
