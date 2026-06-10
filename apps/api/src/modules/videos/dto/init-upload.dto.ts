import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InitUploadDto {
  @IsString()
  title!: string;

  @IsString()
  filename!: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;
}
