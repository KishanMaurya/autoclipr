import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { StorageService } from '../storage/storage.service';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InitAvatarUploadDto } from './dto/init-avatar-upload.dto';

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function avatarExtension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly config: ConfigService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly storage: StorageService,
  ) {}

  async getMe(userId: string) {
    const profile = await this.usersRepo.getById(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    return {
      ...profile,
      clip_credit_cost: this.config.get<number>('clipCreditCost') ?? 1,
    };
  }

  async getBilling(userId: string) {
    const profile = await this.getMe(userId);
    const subscription = await this.usersRepo.getSubscription(userId);
    return { profile, subscription, credits: profile.credits };
  }

  listPlans() {
    return this.usersRepo.listPlans();
  }

  async deleteAccount(userId: string) {
    const existing = await this.usersRepo.getById(userId);
    if (!existing) throw new NotFoundException('Profile not found');

    const { error } = await this.supabaseAdmin
      .getClient()
      .auth.admin.deleteUser(userId);

    if (error) throw new Error(error.message);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.usersRepo.getById(userId);
    if (!existing) throw new NotFoundException('Profile not found');

    const authUpdates: {
      email?: string;
      user_metadata?: Record<string, string>;
    } = {};

    const metadata: Record<string, string> = {};
    if (dto.full_name !== undefined) metadata.full_name = dto.full_name;
    if (dto.avatar_url !== undefined) {
      const trimmed = dto.avatar_url.trim();
      if (trimmed) {
        this.assertAvatarUrlAllowed(trimmed);
        metadata.avatar_url = trimmed;
      } else {
        metadata.avatar_url = '';
      }
    }
    if (Object.keys(metadata).length > 0) {
      authUpdates.user_metadata = metadata;
    }

    if (dto.email !== undefined && dto.email !== existing.email) {
      authUpdates.email = dto.email;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await this.supabaseAdmin
        .getClient()
        .auth.admin.updateUserById(userId, authUpdates);
      if (error) throw new Error(error.message);
    }

    return this.usersRepo.updateProfile(userId, {
      full_name: dto.full_name ?? existing.full_name ?? undefined,
      email: dto.email ?? existing.email,
      avatar_url:
        dto.avatar_url !== undefined
          ? dto.avatar_url.trim() || null
          : undefined,
      email_notifications_enabled: dto.email_notifications_enabled,
    });
  }

  async initAvatarUpload(userId: string, dto: InitAvatarUploadDto) {
    if (!AVATAR_MIME_TYPES.has(dto.mime_type)) {
      throw new BadRequestException('Use a JPEG, PNG, or WebP image');
    }
    if (dto.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException('Image must be 2 MB or smaller');
    }

    const bucket = this.storage.avatarsBucket();
    const objectPath = `${userId}/avatar.${avatarExtension(dto.mime_type)}`;
    const signed = await this.storage.createSignedUploadUrl(objectPath, bucket);

    return {
      upload_url: signed.signedUrl,
      avatar_url: this.storage.getPublicObjectUrl(bucket, objectPath),
    };
  }

  private assertAvatarUrlAllowed(url: string) {
    const supabaseUrl = (this.config.get<string>('supabaseUrl') ?? '').replace(/\/$/, '');
    const bucket = this.storage.avatarsBucket();
    const prefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
    if (!url.startsWith(prefix)) {
      throw new BadRequestException('Invalid avatar URL');
    }
  }
}
