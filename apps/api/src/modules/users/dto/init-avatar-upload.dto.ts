import { IsInt, IsString, Max, Min } from 'class-validator';

export class InitAvatarUploadDto {
  @IsString()
  filename!: string;

  @IsString()
  mime_type!: string;

  @IsInt()
  @Min(1)
  @Max(2 * 1024 * 1024)
  size!: number;
}
