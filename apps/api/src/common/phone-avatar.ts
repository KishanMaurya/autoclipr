export type PhoneAvatarGender = 'boy' | 'girl';

export function inferPhoneAvatarGender(phone: string): PhoneAvatarGender {
  const digits = phone.replace(/\D/g, '');
  const last = digits.at(-1);
  if (!last) return 'boy';
  return Number(last) % 2 === 0 ? 'girl' : 'boy';
}

export function resolvePhoneAvatar(phone: string, avatarUrl = ''): string {
  const trimmed = avatarUrl.trim();
  if (trimmed && trimmed !== '📱') return trimmed;

  return inferPhoneAvatarGender(phone) === 'girl' ? '👧' : '👦';
}
