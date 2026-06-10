import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class ConnectChannelDto {
  @IsUrl({}, { message: 'channel_url must be a valid URL' })
  channel_url!: string;

  @IsString()
  channel_name!: string;

  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @IsOptional()
  @IsBoolean()
  is_trial_channel?: boolean;
}
