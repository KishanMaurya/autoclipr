import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly config: ConfigService,
    private readonly supabaseAdmin: SupabaseAdminService,
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

    if (dto.full_name !== undefined) {
      authUpdates.user_metadata = { full_name: dto.full_name };
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
    });
  }
}
