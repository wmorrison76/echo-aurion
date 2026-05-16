export type FeatureFlags = {
  AUTH_ENABLE_TOTP: boolean;
  AUTH_ENABLE_WEBAUTHN: boolean;
  [flag: string]: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  AUTH_ENABLE_TOTP: false,
  AUTH_ENABLE_WEBAUTHN: false,
};

export function useFeatureFlags(): FeatureFlags {
  return DEFAULT_FLAGS;
}
