import 'server-only';

import crypto from 'node:crypto';
import type { OrderItemRow, OrderRow, PaymentAttemptRow, PaymentMethodRow } from '@/lib/catalog/types';
import { getBankTransferDetails, mergeBankTransferDetails } from '@/lib/commerce/payment-display';
import type { Json } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { PAYMENT_PROVIDER_DEFINITIONS, type PaymentProviderKey } from '@/lib/commerce/payment-provider-presets';
import { decryptToken } from '@/lib/security/encryption';

type PaymentAttemptContext = {
  attempt: PaymentAttemptRow;
  items: OrderItemRow[];
  method: PaymentMethodRow;
  order: OrderRow;
};

type PaymentStartOptions = {
  origin: string;
  userIp: string;
};

type PaymentStartResult = {
  redirectTo: string;
};

type IyzicoRequestOptions = {
  apiKey: string;
  baseUrl: string;
  body: Record<string, unknown>;
  path: string;
  secretKey: string;
};

type IyzicoRetrieveResult = {
  errorMessage?: string;
  paymentId?: string;
  paymentStatus?: string;
  status?: string;
  token?: string;
};

type PaytrCallbackPayload = {
  failedReasonCode?: string;
  failedReasonMessage?: string;
  hash: string;
  merchantOid: string;
  status: string;
  totalAmount: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: Json | null | undefined) {
  return isRecord(value) ? value : {};
}

function getConfigString(method: PaymentMethodRow, key: string) {
  const value = asRecord(method.config)[key];
  if (typeof value !== 'string') return '';
  
  const trimmed = value.trim();
  if (!trimmed) return '';

  const providerDef = PAYMENT_PROVIDER_DEFINITIONS[method.provider as PaymentProviderKey];
  const fieldDef = providerDef?.configFields.find((f) => f.key === key);

  if (fieldDef?.secret) {
    try {
      return decryptToken(trimmed);
    } catch {
      // Fallback for unencrypted legacy secrets
      return trimmed;
    }
  }

  return trimmed;
}

function getConfigBoolean(method: PaymentMethodRow, key: string, fallback = false) {
  const value = asRecord(method.config)[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value === 'true';
  }

  return fallback;
}

function getConfigNumber(method: PaymentMethodRow, key: string, fallback: number) {
  const value = asRecord(method.config)[key];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireConfig(method: PaymentMethodRow, key: string, label: string) {
  const value = getConfigString(method, key);

  if (!value) {
    throw new Error(`${method.name} için ${label} alanı zorunludur.`);
  }

  return value;
}

function hmacSha256Base64(key: string, value: string) {
  return crypto.createHmac('sha256', key).update(value).digest('base64');
}

function hmacSha256Hex(key: string, value: string) {
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function formatMoney(value: number) {
  return Number(value).toFixed(2);
}

function formatIyzicoMoney(value: number) {
  return Number(value).toFixed(2);
}

function toKurus(value: number) {
  return Math.round(Number(value) * 100);
}

function getAddressLine(order: OrderRow) {
  const address = asRecord(order.shipping_address);
  return String(address.address_line ?? address.address ?? '').trim() || 'Adres bilgisi';
}

function getCity(order: OrderRow) {
  const address = asRecord(order.shipping_address);
  return String(address.city ?? '').trim() || 'Istanbul';
}

function getZipCode(order: OrderRow) {
  const address = asRecord(order.shipping_address);
  return String(address.postal_code ?? '').trim() || '34000';
}

function splitCustomerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] || 'Müşteri',
      lastName: 'Yedek Parça Garajı',
    };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1) ?? 'Yedek Parça Garajı',
  };
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();

  if (!trimmed) {
    return '+905555555555';
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.startsWith('90')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+9${digits}`;
  }

  return `+90${digits}`;
}

function allocateOrderItemTotals(items: OrderItemRow[], targetTotal: number) {
  const sourceTotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);

  if (sourceTotal <= 0) {
    return items.map((item) => ({
      item,
      total: 0,
    }));
  }

  let allocated = 0;

  return items.map((item, index) => {
    const total =
      index === items.length - 1
        ? Math.max(0, Number((targetTotal - allocated).toFixed(2)))
        : Number(((Number(item.line_total) / sourceTotal) * targetTotal).toFixed(2));

    allocated += total;

    return {
      item,
      total,
    };
  });
}

function buildPaytrBasket(items: OrderItemRow[], orderTotal: number) {
  return Buffer.from(
    JSON.stringify(
      allocateOrderItemTotals(items, orderTotal).map(({ item, total }) => [
        item.product_title,
        formatMoney(total / item.quantity),
        item.quantity,
      ])
    )
  ).toString('base64');
}

function buildIyzicoBasketItems(items: OrderItemRow[], orderTotal: number) {
  return allocateOrderItemTotals(items, orderTotal).map(({ item, total }) => ({
    category1: 'Yedek Parça Garajı',
    id: item.id,
    itemType: 'PHYSICAL',
    name: item.product_title.slice(0, 255),
    price: formatIyzicoMoney(total),
  }));
}

function buildIyzicoHeaders({ apiKey, body, path, secretKey }: IyzicoRequestOptions) {
  const bodyText = JSON.stringify(body);
  const randomKey = `${Date.now()}${crypto.randomInt(100000, 999999)}`;
  const signature = hmacSha256Hex(secretKey, `${randomKey}${path}${bodyText}`);
  const authorization = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`).toString('base64');

  return {
    authorization: `IYZWSv2 ${authorization}`,
    bodyText,
    randomKey,
  };
}

async function sendIyzicoRequest<T>(options: IyzicoRequestOptions) {
  const { authorization, bodyText, randomKey } = buildIyzicoHeaders(options);
  const response = await fetch(`${options.baseUrl}${options.path}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'x-iyzi-rnd': randomKey,
    },
    body: bodyText,
  });

  const payload = (await response.json().catch(() => null)) as T & { errorMessage?: string; status?: string } | null;

  if (!response.ok || !payload || payload.status === 'failure') {
    throw new Error(payload?.errorMessage ?? `iyzico isteği başarısız oldu (${response.status}).`);
  }

  return payload;
}

async function updateAttemptMetadata(attempt: PaymentAttemptRow, patch: Record<string, unknown>) {
  const supabase = createAdminClient();
  const metadata = {
    ...asRecord(attempt.metadata),
    ...patch,
  };

  const { error } = await supabase
    .from('payment_attempts')
    .update({
      metadata: metadata as Json,
    })
    .eq('id', attempt.id);

  if (error) {
    throw new Error(error.message);
  }
}

async function markPaymentResult({
  attempt,
  failureReason,
  paid,
  providerReference,
  raw,
}: {
  attempt: PaymentAttemptRow;
  failureReason?: string | null;
  paid: boolean;
  providerReference?: string | null;
  raw?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const status = paid ? 'paid' : 'failed';

  const { error: attemptError } = await supabase
    .from('payment_attempts')
    .update({
      failure_reason: failureReason ?? null,
      metadata: {
        ...asRecord(attempt.metadata),
        callback_received_at: new Date().toISOString(),
        callback_payload: raw ?? null,
      } as Json,
      provider_reference: providerReference ?? attempt.provider_reference,
      status,
    })
    .eq('id', attempt.id);

  if (attemptError) {
    throw new Error(attemptError.message);
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      payment_reference: providerReference ?? attempt.provider_reference,
      payment_status: status,
      status: paid ? 'confirmed' : 'pending_payment',
    })
    .eq('id', attempt.order_id)
    .select('id, user_id, total')
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  // Ödeme başarılıysa cariye borç işle (idempotent) + stok düşümü
  if (paid && order?.user_id && Number(order.total) > 0) {
    try {
      const { postOrderToAccount } = await import('@/lib/accounting/mutations');
      await postOrderToAccount(order.user_id, { id: order.id, total: Number(order.total) });

      // Stok düşümü
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id);
      for (const item of items ?? []) {
        if (!item.product_id) continue;
        const { error: stockError } = await supabase.rpc('apply_stock_change', {
          p_product_id: item.product_id,
          p_quantity_change: -Math.max(0, Number(item.quantity) || 0),
          p_type: 'order_out',
          p_reference: order.id,
          p_order_id: order.id,
          p_idempotency_key: `order-stock:${order.id}:${item.product_id}`,
        });
        // Stok yetersizse sessiz geç (sipariş zaten onaylandı)
        if (stockError) console.error(`Stok düşümü başarısız: ${item.product_id}`, stockError.message);
      }
    } catch (err) {
      console.error('Ödeme sonrası cari/stok güncellemesi başarısız:', err);
    }
  }
}

export async function getPaymentAttemptContext(attemptId: string): Promise<PaymentAttemptContext> {
  const supabase = createAdminClient();
  const { data: attempt, error: attemptError } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError) {
    throw new Error(attemptError.message);
  }

  if (!attempt) {
    throw new Error('Ödeme denemesi bulunamadı.');
  }

  const [{ data: order, error: orderError }, { data: items, error: itemsError }, { data: method, error: methodError }] =
    await Promise.all([
      supabase.from('orders').select('*').eq('id', attempt.order_id).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', attempt.order_id).order('created_at', { ascending: true }),
      attempt.payment_method_id
        ? supabase.from('payment_methods').select('*').eq('id', attempt.payment_method_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (methodError) {
    throw new Error(methodError.message);
  }

  if (!order || !method) {
    throw new Error('Ödeme kaydı eksik.');
  }

  return {
    attempt: attempt as PaymentAttemptRow,
    items: (items ?? []) as OrderItemRow[],
    method: method as PaymentMethodRow,
    order: order as OrderRow,
  };
}

async function startPaytrPayment(context: PaymentAttemptContext, options: PaymentStartOptions): Promise<PaymentStartResult> {
  const { attempt, items, method, order } = context;
  const merchantId = requireConfig(method, 'merchantId', 'Merchant ID');
  const merchantKey = requireConfig(method, 'merchantKey', 'Merchant key');
  const merchantSalt = requireConfig(method, 'merchantSalt', 'Merchant salt');
  const paymentAmount = String(toKurus(order.total));
  const userBasket = buildPaytrBasket(items, order.total);
  const noInstallment = String(getConfigNumber(method, 'noInstallment', 0));
  const maxInstallment = String(getConfigNumber(method, 'maxInstallment', 0));
  const currency = 'TL';
  const testMode = getConfigBoolean(method, 'testMode', false) ? '1' : '0';
  const timeoutLimit = String(getConfigNumber(method, 'timeoutLimit', 30));
  const hashString = `${merchantId}${options.userIp}${order.order_number}${order.customer_email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
  const token = hmacSha256Base64(merchantKey, `${hashString}${merchantSalt}`);
  const formData = new URLSearchParams({
    currency,
    debug_on: getConfigBoolean(method, 'debugOn', true) ? '1' : '0',
    email: order.customer_email,
    lang: 'tr',
    max_installment: maxInstallment,
    merchant_fail_url: `${options.origin}/odeme/sonuc?attempt=${attempt.id}&status=failed`,
    merchant_id: merchantId,
    merchant_oid: order.order_number,
    merchant_ok_url: `${options.origin}/odeme/sonuc?attempt=${attempt.id}&status=success`,
    no_installment: noInstallment,
    payment_amount: paymentAmount,
    paytr_token: token,
    test_mode: testMode,
    timeout_limit: timeoutLimit,
    user_address: getAddressLine(order).slice(0, 400),
    user_basket: userBasket,
    user_ip: options.userIp,
    user_name: order.customer_name.slice(0, 60),
    user_phone: order.customer_phone.slice(0, 20),
  });

  const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
    method: 'POST',
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as { reason?: string; status?: string; token?: string } | null;

  if (!response.ok || !payload || payload.status !== 'success' || !payload.token) {
    throw new Error(payload?.reason ?? `PayTR token alınamadı (${response.status}).`);
  }

  const iframeUrl = `https://www.paytr.com/odeme/guvenli/${payload.token}`;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('payment_attempts')
    .update({
      metadata: {
        ...asRecord(attempt.metadata),
        iframe_url: iframeUrl,
        paytr_callback_url: `${options.origin}/api/payments/paytr/callback`,
        paytr_merchant_oid: order.order_number,
        provider: 'paytr',
        started_at: new Date().toISOString(),
      } as Json,
      provider_reference: payload.token,
      status: 'pending',
    })
    .eq('id', attempt.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    redirectTo: `/odeme/islem/${attempt.id}`,
  };
}

async function startIyzicoPayment(context: PaymentAttemptContext, options: PaymentStartOptions): Promise<PaymentStartResult> {
  const { attempt, items, method, order } = context;
  const apiKey = requireConfig(method, 'apiKey', 'API key');
  const secretKey = requireConfig(method, 'secretKey', 'Secret key');
  const configuredBaseUrl = getConfigString(method, 'baseUrl');
  const baseUrl = configuredBaseUrl || (getConfigBoolean(method, 'testMode', false) ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com');
  const path = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
  const { firstName, lastName } = splitCustomerName(order.customer_name);
  const addressLine = getAddressLine(order);
  const city = getCity(order);
  const zipCode = getZipCode(order);
  const price = formatIyzicoMoney(order.total);
  const body = {
    basketId: order.order_number,
    basketItems: buildIyzicoBasketItems(items, order.total),
    billingAddress: {
      address: addressLine,
      city,
      contactName: order.customer_name,
      country: 'Turkey',
      zipCode,
    },
    buyer: {
      city,
      country: 'Turkey',
      email: order.customer_email,
      gsmNumber: normalizePhone(order.customer_phone),
      id: order.user_id,
      identityNumber: getConfigString(method, 'defaultIdentityNumber') || '11111111111',
      ip: options.userIp,
      name: firstName,
      registrationAddress: addressLine,
      surname: lastName,
      zipCode,
    },
    callbackUrl: `${options.origin}/api/payments/iyzico/callback`,
    conversationId: attempt.id,
    currency: 'TRY',
    enabledInstallments: [1, 2, 3, 4, 6, 9, 12],
    locale: 'tr',
    paidPrice: price,
    paymentGroup: 'PRODUCT',
    price,
    shippingAddress: {
      address: addressLine,
      city,
      contactName: order.customer_name,
      country: 'Turkey',
      zipCode,
    },
  };

  const payload = await sendIyzicoRequest<{ paymentPageUrl?: string; status?: string; token?: string }>({
    apiKey,
    baseUrl,
    body,
    path,
    secretKey,
  });

  if (!payload.token || !payload.paymentPageUrl) {
    throw new Error('iyzico ödeme sayfası başlatılamadı.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('payment_attempts')
    .update({
      metadata: {
        ...asRecord(attempt.metadata),
        iyzico_base_url: baseUrl,
        payment_page_url: payload.paymentPageUrl,
        provider: 'iyzico',
        started_at: new Date().toISOString(),
      } as Json,
      provider_reference: payload.token,
      status: 'pending',
    })
    .eq('id', attempt.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    redirectTo: payload.paymentPageUrl,
  };
}

export async function startPaymentAttempt(attemptId: string, options: PaymentStartOptions): Promise<PaymentStartResult> {
  const context = await getPaymentAttemptContext(attemptId);

  if (context.order.payment_status === 'paid') {
    return {
      redirectTo: `/odeme/sonuc?attempt=${context.attempt.id}&status=success`,
    };
  }

  if (context.method.integration_type === 'manual' || context.method.provider === 'offline') {
    await updateAttemptMetadata(context.attempt, {
      manual_redirected_at: new Date().toISOString(),
    });

    return {
      redirectTo: `/odeme/sonuc?attempt=${context.attempt.id}&status=manual`,
    };
  }

  if (context.method.provider === 'paytr') {
    return startPaytrPayment(context, options);
  }

  if (context.method.provider === 'iyzico') {
    return startIyzicoPayment(context, options);
  }

  throw new Error(`${context.method.name} için canlı ödeme adapteri henüz tanımlı değil.`);
}

export function getPaymentAttemptDisplayData(context: PaymentAttemptContext) {
  const metadata = asRecord(context.attempt.metadata);
  const bankDetails = mergeBankTransferDetails(getBankTransferDetails(metadata), getBankTransferDetails(context.method.config));

  return {
    bankDetails,
    iframeUrl: typeof metadata.iframe_url === 'string' ? metadata.iframe_url : null,
    instructions: typeof metadata.instructions === 'string' && metadata.instructions.trim() ? metadata.instructions.trim() : context.method.instructions,
    integrationType: context.method.integration_type,
    note: context.order.note,
    orderNumber: context.order.order_number,
    paymentPageUrl: typeof metadata.payment_page_url === 'string' ? metadata.payment_page_url : null,
    provider: context.method.provider,
    providerName: context.method.name,
    status: context.attempt.status,
    total: context.order.total,
  };
}

export async function handlePaytrCallback(payload: PaytrCallbackPayload) {
  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', payload.merchantOid)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order || !order.payment_method_id) {
    throw new Error('PayTR siparişi bulunamadı.');
  }

  const [{ data: method, error: methodError }, { data: attempt, error: attemptError }] = await Promise.all([
    supabase.from('payment_methods').select('*').eq('id', order.payment_method_id).maybeSingle(),
    supabase
      .from('payment_attempts')
      .select('*')
      .eq('order_id', order.id)
      .eq('provider', 'paytr')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (methodError) {
    throw new Error(methodError.message);
  }

  if (attemptError) {
    throw new Error(attemptError.message);
  }

  if (!method || !attempt) {
    throw new Error('PayTR ödeme kaydı bulunamadı.');
  }

  const merchantSalt = requireConfig(method as PaymentMethodRow, 'merchantSalt', 'Merchant salt');
  const merchantKey = requireConfig(method as PaymentMethodRow, 'merchantKey', 'Merchant key');
  const expectedHash = hmacSha256Base64(merchantKey, `${payload.merchantOid}${merchantSalt}${payload.status}${payload.totalAmount}`);

  if (!timingSafeEqual(expectedHash, payload.hash)) {
    throw new Error('PayTR callback hash doğrulanamadı.');
  }

  const expectedAmount = toKurus(Number(order.total));
  const receivedAmount = Number(payload.totalAmount);
  const paid = payload.status === 'success' && receivedAmount === expectedAmount;

  await markPaymentResult({
    attempt: attempt as PaymentAttemptRow,
    failureReason: paid ? null : payload.failedReasonMessage || `PayTR tutar veya durum uyumsuz. Beklenen ${expectedAmount}, gelen ${payload.totalAmount}`,
    paid,
    providerReference: payload.merchantOid,
    raw: {
      failed_reason_code: payload.failedReasonCode ?? null,
      failed_reason_msg: payload.failedReasonMessage ?? null,
      merchant_oid: payload.merchantOid,
      status: payload.status,
      total_amount: payload.totalAmount,
    },
  });
}

export async function handleIyzicoCallback(token: string) {
  const supabase = createAdminClient();
  const { data: attempt, error: attemptError } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('provider', 'iyzico')
    .eq('provider_reference', token)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attemptError) {
    throw new Error(attemptError.message);
  }

  if (!attempt || !attempt.payment_method_id) {
    throw new Error('iyzico ödeme kaydı bulunamadı.');
  }

  const [{ data: method, error: methodError }, { data: order, error: orderError }] = await Promise.all([
    supabase.from('payment_methods').select('*').eq('id', attempt.payment_method_id).maybeSingle(),
    supabase.from('orders').select('*').eq('id', attempt.order_id).maybeSingle(),
  ]);

  if (methodError) {
    throw new Error(methodError.message);
  }

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!method || !order) {
    throw new Error('iyzico ödeme yöntemi veya sipariş kaydı bulunamadı.');
  }

  const apiKey = requireConfig(method as PaymentMethodRow, 'apiKey', 'API key');
  const secretKey = requireConfig(method as PaymentMethodRow, 'secretKey', 'Secret key');
  const baseUrl = getConfigString(method as PaymentMethodRow, 'baseUrl') || (getConfigBoolean(method as PaymentMethodRow, 'testMode', false) ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com');
  const path = '/payment/iyzipos/checkoutform/auth/ecom/detail';
  const result = await sendIyzicoRequest<IyzicoRetrieveResult>({
    apiKey,
    baseUrl,
    body: {
      conversationId: attempt.id,
      locale: 'tr',
      token,
    },
    path,
    secretKey,
  });
  const paid = result.status === 'success' && result.paymentStatus === 'SUCCESS';

  await markPaymentResult({
    attempt: attempt as PaymentAttemptRow,
    failureReason: paid ? null : result.errorMessage ?? `iyzico ödeme durumu: ${result.paymentStatus ?? result.status ?? 'bilinmiyor'}`,
    paid,
    providerReference: result.paymentId ?? token,
    raw: result as Record<string, unknown>,
  });

  return {
    attemptId: attempt.id,
    paid,
  };
}
