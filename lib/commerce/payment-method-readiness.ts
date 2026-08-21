import type { Json } from '@/lib/supabase/database.types';

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasConfigText(config: Json, key: string) {
  if (!isRecord(config)) return false;
  return typeof config[key] === 'string' && config[key].trim().length > 0;
}

export function isCheckoutPaymentMethodReady(provider: string, integrationType: string, config: Json) {
  if (integrationType === 'manual' || provider === 'offline') return true;

  if (provider === 'paytr') {
    return hasConfigText(config, 'merchantId')
      && hasConfigText(config, 'merchantKey')
      && hasConfigText(config, 'merchantSalt');
  }

  if (provider === 'iyzico') {
    return hasConfigText(config, 'apiKey') && hasConfigText(config, 'secretKey');
  }

  return false;
}

export function isCardPaymentProvider(provider: string, integrationType: string) {
  return integrationType !== 'manual' && (provider === 'paytr' || provider === 'iyzico');
}
