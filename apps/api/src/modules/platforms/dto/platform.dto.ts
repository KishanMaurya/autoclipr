import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export const SUPPORTED_PLATFORMS = ['youtube', 'instagram', 'facebook', 'tiktok'] as const;
export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number];

export class ConnectPlatformDto {
  @IsString()
  @IsIn(SUPPORTED_PLATFORMS)
  platform!: PlatformId;

  @IsOptional()
  @IsString()
  account_name?: string;
}

export class PublishClipDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(SUPPORTED_PLATFORMS, { each: true })
  platforms!: PlatformId[];
}
