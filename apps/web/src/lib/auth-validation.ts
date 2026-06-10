export type PasswordValidation = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/\d/.test(password)) {
    errors.push("At least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one special character");
  }

  return { valid: errors.length === 0, errors };
}

export type PasswordRule = {
  label: string;
  ok: boolean;
};

export function getPasswordValidationRules(
  password: string,
  confirmPassword: string,
): PasswordRule[] {
  return [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
    {
      label: "Passwords match",
      ok:
        password.length > 0 &&
        confirmPassword.length > 0 &&
        password === confirmPassword,
    },
  ];
}

export function isPasswordRegistrationValid(
  password: string,
  confirmPassword: string,
): boolean {
  return getPasswordValidationRules(password, confirmPassword).every((rule) => rule.ok);
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Please enter your full name.";
  if (trimmed.length < 3) return "Full name must be at least 3 characters.";
  return null;
}

export function mapAuthError(message: string, status?: number): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already") ||
    status === 422
  ) {
    return "An account with this email already exists. Please sign in instead.";
  }

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Incorrect email or password. Please try again.";
  }

  if (lower.includes("password") && lower.includes("weak")) {
    return "Password is too weak. Use 8+ characters with a number and special character.";
  }

  if (lower.includes("database error saving new user")) {
    return "Could not create your account. If this keeps happening, contact support.";
  }

  if (
    lower.includes("sms_send_failed") ||
    lower.includes("invalid from number") ||
    lower.includes("21212") ||
    lower.includes("error sending confirmation otp")
  ) {
    return "SMS could not be sent — Twilio is misconfigured in Supabase. Use your Twilio Message Service SID (starts with MG…) or a verified sender number (+…), not your Account SID (AC…). Fix it under Supabase → Authentication → Providers → Phone.";
  }

  return message;
}

export function isExistingEmailSignup(user: {
  identities?: Array<{ id: string }> | null;
} | null): boolean {
  return !!user && (!user.identities || user.identities.length === 0);
}
