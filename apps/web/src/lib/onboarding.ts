const ONBOARDING_KEY = "autoclipr_onboarding_complete";

export function markOnboardingComplete() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "1");
  document.cookie = `${ONBOARDING_KEY}=1; path=/; max-age=31536000; SameSite=Lax`;
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(ONBOARDING_KEY) === "1") return true;
  return document.cookie.includes(`${ONBOARDING_KEY}=1`);
}

export const TRIAL_SETUP_PATH = "/setup/platforms";
export const DASHBOARD_CHANNEL_PATH = "/channels";
export const DASHBOARD_PLATFORM_PATH = "/setup/platforms?from=dashboard";
