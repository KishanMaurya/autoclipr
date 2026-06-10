import { Injectable } from '@nestjs/common';
import { resolvePhoneAvatar } from '../../common/phone-avatar';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class AuthService {
  constructor(private readonly usersRepo: UsersRepository) {}

  syncProfile(userId: string, email: string, fullName = '', avatarUrl = '', phone = '') {
    const resolvedAvatar = phone ? resolvePhoneAvatar(phone, avatarUrl) : avatarUrl;
    return this.usersRepo.upsertFromAuth(userId, email, fullName, resolvedAvatar, phone);
  }
}
