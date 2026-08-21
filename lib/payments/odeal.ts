import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { decryptToken } from '@/lib/security/encryption';

/**
 * Ödeal Payment Provider abstraction.
 *
 * Bu mod, Ödeal'ın resmi API yapısına göre HAIR-HAZIR entegrasyon noktasıdır.
 * Ayarlar `odeal_settings` tablosundan okunur. Gerçek uç noktalar Ödeal
 * dokümantasyonundan teyit edildiğinde aşağıdaki sabitlere girilir.
 *
 * Konfigürasyon değerleri (dashboard > Entegrasyonlar > Ödeal):
 *   api_key, secret_key, is_test_mode, is_enabled
 */


export type OdealPaymentInitParams = {
  amountKurus: number; // kuruş
  currency: 'TRY';
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  callbackUrl: string;
  description?: string;
};

export type OdealPaymentInitResult = {
  redirectUrl: string;
  providerReference: string; // payment id
};

export type OdealProviderConfig = {
  apiKey?: string;
  secretKey?: string;
  isEnabled: boolean;
  isTestMode: boolean;
};

export async function getOdealConfig(): Promise<OdealProviderConfig | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('odeal_settings').select('*').eq('id', 'main').maybeSingle();
  if (!data) return null;
  const readSecret = (value: string) => {
    if (!value) return '';
    try { return decryptToken(value); } catch { return value; }
  };
  return {
    apiKey: readSecret(data.api_key ?? ''),
    secretKey: readSecret(data.secret_key ?? ''),
    isEnabled: data.is_enabled ?? false,
    isTestMode: data.is_test_mode ?? true,
  };
}

/**
 * Ödeal API sabitleri — resmi dokümantasyona göre doldurulacak.
 * (Test modu için sandbox base url kullanılır.)
 */
const ODEAL_API = {
  baseUrl: 'https://api.odeal.com',
  sandboxBaseUrl: 'https://api-stg.odeal.com',
  paymentInitPath: '/v1/payment/create',
  paymentDetailPath: '/v1/payment/detail',
  refundPath: '/v1/payment/refund',
} as const;

function getBaseUrl(config: OdealProviderConfig) {
  return config.isTestMode ? ODEAL_API.sandboxBaseUrl : ODEAL_API.baseUrl;
}

function buildAuthHeaders(config: OdealProviderConfig) {
  // Ödeal istekleri Authorization: Bearer <secret> veya API-Key ile imzalanır.
  // Resmi şemaya göre doldurulur.
  return {
    Authorization: `Bearer ${config.secretKey}`,
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey ?? '',
  };
}

/**
 * Ödeme başlat. provider_reference olarak dönen payment id daha sonra
 * doğrulama/refund için kullanılır.
 */
export async function odealInitiatePayment(
  config: OdealProviderConfig,
  params: OdealPaymentInitParams
): Promise<OdealPaymentInitResult> {
  if (!config.isEnabled || !config.apiKey || !config.secretKey) {
    throw new Error('Ödeal yapılandırılmamış. Dashboard > Entegrasyonlar > Ödeal.');
  }

  const body: Record<string, unknown> = {
    amount: params.amountKurus, // kuruş
    currency: params.currency,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    buyer: {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    description: params.description ?? 'Sipariş ödemesi',
    callbackUrl: params.callbackUrl,
  };

  const response = await fetch(`${getBaseUrl(config)}${ODEAL_API.paymentInitPath}`, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const payload = (await response.json().catch(() => null)) as {
    paymentId?: string;
    redirectUrl?: string;
    message?: string;
    paymentStatus?: string;
  } | null;

  if (!response.ok || !payload?.paymentId || !payload?.redirectUrl) {
    throw new Error(payload?.message || `Ödeal ödeme başlatılamadı (${response.status}).`);
  }

  return {
    redirectUrl: payload.redirectUrl,
    providerReference: payload.paymentId,
  };
}

export type OdealPaymentVerifyResult = {
  paid: boolean;
  providerReference: string;
  raw: Record<string, unknown>;
};

/**
 * Ödeme doğrula (webhook/callback'tan).
 */
export async function odealVerifyPayment(
  config: OdealProviderConfig,
  providerReference: string
): Promise<OdealPaymentVerifyResult> {
  const response = await fetch(`${getBaseUrl(config)}${ODEAL_API.paymentDetailPath}`, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify({ paymentId: providerReference }),
    signal: AbortSignal.timeout(30_000),
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    throw new Error('Ödeal ödeme doğrulanamadı.');
  }

  const status = String(payload.paymentStatus ?? payload.status ?? '');
  const paid = status.toLowerCase().includes('success') || status.toLowerCase().includes('paid') || status === 'approved';

  return {
    paid,
    providerReference,
    raw: payload,
  };
}

/**
 * İade/refund.
 */
export async function odealRefund(config: OdealProviderConfig, providerReference: string, amountKurus: number) {
  const response = await fetch(`${getBaseUrl(config)}${ODEAL_API.refundPath}`, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify({ paymentId: providerReference, amount: amountKurus }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message || `Ödeal iade başarısız (${response.status}).`);
  }
  return payload;
}

export { Database as _OdealDbTypes };
