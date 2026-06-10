"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { PhoneInput } from "@/components/auth/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getPasswordValidationRules,
  isExistingEmailSignup,
  mapAuthError,
  validateEmail,
  validateFullName,
  validatePassword,
  isPasswordRegistrationValid,
} from "@/lib/auth-validation";
import { DEFAULT_PHONE_DIAL } from "@/lib/phone-countries";
import {
  buildPhoneNumber,
  parsePhoneNumber,
  validatePhoneNumber,
} from "@/lib/phone-utils";
import {
  getPhoneAvatarEmoji,
  type PhoneAvatarGender,
} from "@/lib/user-avatar";

type Mode = "login" | "register";
type AuthTab = "email" | "phone";
type PhoneStep = "enter" | "verify";

const OTP_EXPIRY_SECONDS = 60;

function formatOtpCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function syncProfile(
  token: string,
  opts?: { full_name?: string; phone?: string; avatar_url?: string },
) {
  await apiFetch("/api/v1/auth/sync", {
    method: "POST",
    token,
    body: JSON.stringify({
      full_name: opts?.full_name ?? "",
      phone: opts?.phone ?? "",
      avatar_url: opts?.avatar_url ?? "",
    }),
  });
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/setup/platforms";

  const [tab, setTab] = useState<AuthTab>("email");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countryDial, setCountryDial] = useState(DEFAULT_PHONE_DIAL);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneAvatarGender, setPhoneAvatarGender] = useState<PhoneAvatarGender>("boy");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpTimerKey, setOtpTimerKey] = useState(0);

  const passwordValid =
    mode === "register" && isPasswordRegistrationValid(password, confirmPassword);
  const passwordInputClassName = cn(
    passwordValid &&
      "border-emerald-500/50 bg-emerald-950/20 focus-visible:border-emerald-500 focus-visible:bg-emerald-950/30 focus-visible:ring-emerald-500/30",
  );

  useEffect(() => {
    if (phoneStep !== "verify" || otpTimerKey === 0) return;

    setOtpSecondsLeft(OTP_EXPIRY_SECONDS);
    const id = window.setInterval(() => {
      setOtpSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [phoneStep, otpTimerKey]);

  function startOtpTimer() {
    setOtpTimerKey((key) => key + 1);
  }

  function clearOtpTimer() {
    setOtpTimerKey(0);
    setOtpSecondsLeft(0);
  }

  async function requestOtp(options?: { goToVerify?: boolean }) {
    if (mode === "register") {
      const nameError = validateFullName(name);
      if (nameError) {
        setError(nameError);
        return false;
      }
    }

    const normalized = buildPhoneNumber(countryDial, phoneLocal);
    const phoneError = validatePhoneNumber(normalized);
    if (phoneError) {
      setError(phoneError);
      return false;
    }

    const supabase = createClient();
    const otpMetadata: Record<string, string> = {};
    if (mode === "register") {
      otpMetadata.full_name = name.trim();
      otpMetadata.avatar_url = getPhoneAvatarEmoji(phoneAvatarGender);
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: {
        data: Object.keys(otpMetadata).length > 0 ? otpMetadata : undefined,
      },
    });

    if (otpError) {
      setError(mapAuthError(otpError.message));
      return false;
    }

    setVerifiedPhone(normalized);
    if (options?.goToVerify !== false) {
      setPhoneStep("verify");
    }
    setOtp("");
    setError(null);
    setInfo(
      `OTP sent to ${normalized}. Enter the code within ${formatOtpCountdown(OTP_EXPIRY_SECONDS)}.`,
    );
    startOtpTimer();
    return true;
  }

  async function finishAuth(
    accessToken?: string,
    opts?: { full_name?: string; phone?: string },
  ) {
    if (accessToken) {
      const phone = opts?.phone?.trim() ?? "";
      const avatarEmoji =
        phone && mode === "register" ? getPhoneAvatarEmoji(phoneAvatarGender) : "";

      await syncProfile(accessToken, {
        full_name: opts?.full_name ?? "",
        phone,
        avatar_url: avatarEmoji,
      });

      if (phone && avatarEmoji) {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: {
            full_name: opts?.full_name?.trim() || undefined,
            avatar_url: avatarEmoji,
          },
        });
      }
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

    if (mode === "register") {
      const nameError = validateFullName(name);
      if (nameError) {
        setError(nameError);
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        setError(`Password must include: ${passwordCheck.errors.join(", ")}.`);
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
            },
          });

    if (result.error) {
      setError(mapAuthError(result.error.message, result.error.status));
      setLoading(false);
      return;
    }

    if (mode === "register" && isExistingEmailSignup(result.data.user)) {
      setError("An account with this email already exists. Please sign in instead.");
      setLoading(false);
      return;
    }

    const session = result.data.session;
    if (session?.access_token) {
      await finishAuth(session.access_token, {
        full_name: mode === "register" ? name.trim() : undefined,
      });
    } else if (mode === "register") {
      setInfo("Check your email to confirm your account, then sign in.");
    }

    setLoading(false);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    await requestOtp();
    setLoading(false);
  }

  async function handleResendOtp() {
    if (otpSecondsLeft > 0 || loading) return;

    setLoading(true);
    setError(null);
    await requestOtp({ goToVerify: false });
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: verifiedPhone,
      token: otp.trim(),
      type: "sms",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    if (data.session?.access_token) {
      await finishAuth(data.session.access_token, {
        full_name: name.trim() || undefined,
        phone: verifiedPhone,
      });
    }

    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="gradient-border w-full max-w-md shadow-glow">
      <div className="p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to your AutoClipr dashboard"
              : "Start your free trial — add email later in Settings if you use phone login"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mb-4 w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="relative py-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-[#0a0618] px-3">or continue with</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.08]" />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-1">
          <button
            type="button"
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              tab === "email"
                ? "bg-gradient-brand text-white shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setTab("email");
              setError(null);
              setInfo(null);
            }}
          >
            Email
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              tab === "phone"
                ? "bg-gradient-brand text-white shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setTab("phone");
              setPhoneStep("enter");
              clearOtpTimer();
              setError(null);
              setInfo(null);
            }}
          >
            Mobile OTP
          </button>
        </div>

        {tab === "email" ? (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className={passwordInputClassName}
              />
              {mode === "register" && (
                <PasswordHints password={password} confirmPassword={confirmPassword} />
              )}
            </div>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className={passwordInputClassName}
                />
              </div>
            )}
            {error && <AuthMessage variant="error">{error}</AuthMessage>}
            {info && <AuthMessage variant="info">{info}</AuthMessage>}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
        ) : phoneStep === "enter" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="phone-name">Full name</Label>
                <Input
                  id="phone-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <PhoneInput
                countryDial={countryDial}
                localNumber={phoneLocal}
                onCountryDialChange={setCountryDial}
                onLocalNumberChange={setPhoneLocal}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Select your country code, then enter your mobile number. We&apos;ll text you a
                one-time login code.
              </p>
            </div>
            {mode === "register" && (
              <div className="space-y-2">
                <Label>Choose your avatar</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { gender: "boy" as const, label: "Boy" },
                      { gender: "girl" as const, label: "Girl" },
                    ] as const
                  ).map(({ gender, label }) => (
                    <button
                      key={gender}
                      type="button"
                      disabled={loading}
                      onClick={() => setPhoneAvatarGender(gender)}
                      className={cn(
                        "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all",
                        phoneAvatarGender === gender
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                          : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="text-xl">{getPhoneAvatarEmoji(gender)}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <AuthMessage variant="error">{error}</AuthMessage>}
            {info && <AuthMessage variant="info">{info}</AuthMessage>}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="relative space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="6-digit OTP"
                maxLength={6}
                disabled={loading}
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Verifying your code…
              </div>
            )}

            {info && !loading && <AuthMessage variant="info">{info}</AuthMessage>}

            {otpSecondsLeft > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-muted-foreground">Code expires in</span>
                <span
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    otpSecondsLeft <= 10 ? "text-amber-300" : "text-emerald-400",
                  )}
                >
                  {formatOtpCountdown(otpSecondsLeft)}
                </span>
              </div>
            )}

            {otpSecondsLeft === 0 && otpTimerKey > 0 && !loading && (
              <p className="text-center text-xs text-amber-300">
                Code expired. Tap resend to get a new OTP.
              </p>
            )}

            {error && <AuthMessage variant="error">{error}</AuthMessage>}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Verifying…
                </>
              ) : (
                "Verify & continue"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full text-sm"
              disabled={loading || otpSecondsLeft > 0}
              onClick={handleResendOtp}
            >
              {otpSecondsLeft > 0
                ? `Resend OTP in ${formatOtpCountdown(otpSecondsLeft)}`
                : "Resend OTP"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              disabled={loading}
              onClick={() => {
                const parsed = parsePhoneNumber(verifiedPhone);
                setCountryDial(parsed.dial);
                setPhoneLocal(parsed.local);
                setVerifiedPhone("");
                clearOtpTimer();
                setPhoneStep("enter");
                setOtp("");
                setError(null);
                setInfo(null);
              }}
            >
              Change number
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link href="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
                Sign up free
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AuthMessage({
  variant,
  children,
}: {
  variant: "error" | "info";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        variant === "error"
          ? "border-red-500/30 bg-red-950/40 text-red-400"
          : "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
      )}
    >
      {children}
    </p>
  );
}

function PasswordHints({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) {
  if (password.length === 0 && confirmPassword.length === 0) {
    return null;
  }

  const failedRules = getPasswordValidationRules(password, confirmPassword).filter(
    (rule) => !rule.ok,
  );

  if (failedRules.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1 text-xs">
      {failedRules.map((rule) => (
        <li key={rule.label} className="text-muted-foreground">
          ○ {rule.label}
        </li>
      ))}
    </ul>
  );
}
