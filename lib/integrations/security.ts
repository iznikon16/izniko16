import {
  PAYMENT_PROVIDER_DEFINITIONS,
  type PaymentProviderKey,
} from '@/lib/commerce/payment-provider-presets';

export const SECRET_MASK = '******';
const SECRET_KEY_PATTERN = /(api.?key|secret|token|password|passphrase|salt|credential|private.?key)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function isSecretLikeKey(key: string) {
  return SECRET_KEY_PATTERN.test(key);
}

export function getPaymentSecretKeys(provider: PaymentProviderKey) {
  return new Set(
    PAYMENT_PROVIDER_DEFINITIONS[provider].configFields
      .filter((field) => field.secret || isSecretLikeKey(field.key))
      .map((field) => field.key)
  );
}

export function maskPaymentConfig(provider: PaymentProviderKey, config: unknown) {
  if (!isRecord(config)) return {};

  const secretKeys = getPaymentSecretKeys(provider);
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      (secretKeys.has(key) || isSecretLikeKey(key)) && value ? SECRET_MASK : value,
    ])
  );
}

export function assertNoUnknownSecrets(provider: PaymentProviderKey, config: Record<string, unknown>) {
  const knownKeys = new Set(PAYMENT_PROVIDER_DEFINITIONS[provider].configFields.map((field) => field.key));
  const unsafeKey = Object.keys(config).find((key) => !knownKeys.has(key) && isSecretLikeKey(key));
  if (unsafeKey) {
    throw new Error(`Ek JSON icinde gizli bilgi alani kullanilamaz: ${unsafeKey}`);
  }
}
