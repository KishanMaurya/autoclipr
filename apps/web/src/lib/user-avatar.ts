export const BOY_PHONE_AVATAR = "👦";
export const GIRL_PHONE_AVATAR = "👧";

export type PhoneAvatarGender = "boy" | "girl";

export function getPhoneAvatarEmoji(gender: PhoneAvatarGender): string {
  return gender === "girl" ? GIRL_PHONE_AVATAR : BOY_PHONE_AVATAR;
}

export function inferPhoneAvatarGender(phone: string): PhoneAvatarGender {
  const digits = phone.replace(/\D/g, "");
  const last = digits.at(-1);
  if (!last) return "boy";
  return Number(last) % 2 === 0 ? "girl" : "boy";
}

export function resolvePhoneAvatar(phone: string, gender?: PhoneAvatarGender): string {
  return getPhoneAvatarEmoji(gender ?? inferPhoneAvatarGender(phone));
}

export function isPhoneOnlyUser(
  email?: string | null,
  phone?: string | null,
): boolean {
  return !!phone?.trim() && !email?.trim();
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeStoredAvatar(avatar?: string | null, phone?: string | null): string | null {
  const value = avatar?.trim();
  if (!value || value === "📱") {
    return phone?.trim() ? resolvePhoneAvatar(phone) : null;
  }
  // OAuth providers store image URLs in avatar_url — not display text.
  if (isHttpUrl(value)) return null;
  return value;
}

export function resolveUserFullName(
  metadata?: Record<string, unknown> | null,
): string | null {
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();

  const name = metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();

  return null;
}

export function getUserAvatarImageUrl(avatarUrl?: string | null): string | null {
  const value = avatarUrl?.trim();
  if (!value || !isHttpUrl(value)) return null;
  return value;
}

export function getUserAvatarFallback(opts: {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}): string {
  const avatar = normalizeStoredAvatar(opts.avatarUrl, opts.phone);
  if (avatar) return avatar;

  if (isPhoneOnlyUser(opts.email, opts.phone)) {
    return resolvePhoneAvatar(opts.phone ?? "");
  }

  const name = opts.fullName?.trim();
  if (name) return name.charAt(0).toUpperCase();

  const email = opts.email?.trim();
  if (email) return email.charAt(0).toUpperCase();

  return "?";
}

export function getUserDisplayLabel(opts: {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
}): string {
  const name = opts.fullName?.trim();
  if (name) return name;

  const email = opts.email?.trim();
  if (email) return email;

  const phone = opts.phone?.trim();
  if (phone) return phone;

  return "Account";
}

export function isEmojiAvatar(value: string): boolean {
  return /\p{Extended_Pictographic}/u.test(value);
}
