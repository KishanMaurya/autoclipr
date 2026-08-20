import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  /** Where the signup happened, for attribution (e.g. "footer", "blog"). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  /** Page the consent was given on — part of the consent trail. */
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  page_url?: string;
}
