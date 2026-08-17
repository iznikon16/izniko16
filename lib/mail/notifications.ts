import 'server-only';

import { formatCommercePrice } from '@/lib/commerce/format';
import { getSiteOrigin, sendTemplatedMail } from '@/lib/mail/mailer';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import type { OrderItemRow, OrderRow, PaymentMethodRow } from '@/lib/catalog/types';

type OrderEmailLine = {
  lineTotal: number;
  product: {
    title: string;
  };
  quantity: number;
};

type OrderEmailContext = {
  customerPhone?: string;
  order: OrderRow;
  orderLines: OrderEmailLine[];
  paymentInstructions?: string;
  paymentMethod?: Pick<PaymentMethodRow, 'config' | 'instructions' | 'name'> | null;
  shippingAddress?: Json;
};

const orderStatusLabels: Record<OrderRow['status'], string> = {
  pending_payment: 'Ödeme Bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Sevk Edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const paymentStatusLabels: Record<OrderRow['payment_status'], string> = {
  unpaid: 'Ödenmedi',
  pending: 'Beklemede',
  paid: 'Ödendi',
  failed: 'Başarısız',
  refunded: 'İade',
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getAddressText(address: Json | undefined) {
  if (!isRecord(address)) {
    return '';
  }

  return [
    address.address_line,
    address.neighborhood,
    address.district,
    address.city,
    address.postal_code,
  ]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .join(' / ');
}

function buildOrderItemsHtml(lines: OrderEmailLine[] | OrderItemRow[]) {
  if (lines.length === 0) {
    return '<p style="margin:0;color:#6d6861;">Ürün satırı bulunamadı.</p>';
  }

  return lines
    .map((line) => {
      const title = 'product' in line ? line.product.title : line.product_title;
      const total = 'lineTotal' in line ? line.lineTotal : line.line_total;

      return `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:8px;padding:12px;border:1px solid #eee7dd;border-radius:14px;background:#ffffff;">
        <span style="font-weight:700;color:#171513;">${escapeHtml(title)}</span>
        <span style="white-space:nowrap;color:#6d6861;">x${line.quantity} · ${formatCommercePrice(Number(total))}</span>
      </div>`;
    })
    .join('');
}

function getTextFromConfig(config: Json | undefined, key: string) {
  if (!isRecord(config)) {
    return '';
  }

  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

function buildPaymentInstructions(paymentMethod?: Pick<PaymentMethodRow, 'config' | 'instructions' | 'name'> | null, fallback = '') {
  if (!paymentMethod) {
    return fallback;
  }

  const iban = getTextFromConfig(paymentMethod.config, 'iban');
  const bankName = getTextFromConfig(paymentMethod.config, 'bankName');
  const accountOwner = getTextFromConfig(paymentMethod.config, 'accountOwner');
  const supportPhone = getTextFromConfig(paymentMethod.config, 'supportPhone');

  return [
    paymentMethod.instructions,
    bankName ? `Banka: ${bankName}` : null,
    accountOwner ? `Hesap sahibi: ${accountOwner}` : null,
    iban ? `IBAN: ${iban}` : null,
    supportPhone ? `Destek: ${supportPhone}` : null,
    fallback,
  ]
    .filter(Boolean)
    .join('\n');
}

async function getAdminNotificationEmail() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('smtp_settings')
    .select('admin_notification_email')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  return data?.admin_notification_email?.trim() ?? '';
}

function buildOrderVariables(context: OrderEmailContext) {
  const order = context.order;
  const siteOrigin = getSiteOrigin();
  const customerName = order.customer_name || order.customer_email || 'Müşteri';
  const shippingAddress = context.shippingAddress ?? order.shipping_address;

  return {
    admin_order_url: `${siteOrigin}/admin/orders?query=${encodeURIComponent(order.order_number)}`,
    customer_email: order.customer_email,
    customer_name: customerName,
    customer_phone: context.customerPhone || order.customer_phone,
    order_items: buildOrderItemsHtml(context.orderLines),
    order_number: order.order_number,
    order_status: orderStatusLabels[order.status],
    order_total: formatCommercePrice(Number(order.total)),
    orders_url: `${siteOrigin}/hesabim/siparislerim`,
    payment_instructions: buildPaymentInstructions(context.paymentMethod, context.paymentInstructions),
    payment_method: context.paymentMethod?.name ?? 'Belirtilmedi',
    payment_status: paymentStatusLabels[order.payment_status],
    shipping_address: getAddressText(shippingAddress),
    site_url: siteOrigin,
  };
}

export async function sendOrderCreatedEmails(context: OrderEmailContext) {
  const variables = buildOrderVariables(context);
  const adminEmail = await getAdminNotificationEmail();

  await Promise.allSettled([
    sendTemplatedMail({
      metadata: { orderId: context.order.id },
      rawHtmlVariables: ['order_items'],
      templateKey: 'customer_order_created',
      to: context.order.customer_email,
      variables,
    }),
    adminEmail
      ? sendTemplatedMail({
          metadata: { orderId: context.order.id },
          rawHtmlVariables: ['order_items'],
          templateKey: 'admin_order_created',
          to: adminEmail,
          variables,
        })
      : Promise.resolve(),
  ]);
}

async function getOrderEmailContext(orderId: string): Promise<OrderEmailContext | null> {
  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    return null;
  }

  const [{ data: items, error: itemsError }, { data: paymentMethod, error: paymentMethodError }] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    order.payment_method_id
      ? supabase.from('payment_methods').select('name, instructions, config').eq('id', order.payment_method_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (paymentMethodError) {
    throw new Error(paymentMethodError.message);
  }

  return {
    order,
    orderLines: ((items ?? []) as OrderItemRow[]).map((item) => ({
      lineTotal: item.line_total,
      product: { title: item.product_title },
      quantity: item.quantity,
    })),
    paymentMethod: paymentMethod as Pick<PaymentMethodRow, 'config' | 'instructions' | 'name'> | null,
  };
}

export async function sendOrderUpdateEmails({
  orderId,
  previousPaymentStatus,
  previousStatus,
}: {
  orderId: string;
  previousPaymentStatus: OrderRow['payment_status'];
  previousStatus: OrderRow['status'];
}) {
  const context = await getOrderEmailContext(orderId);

  if (!context?.order.customer_email) {
    return;
  }

  const variables = buildOrderVariables(context);
  const jobs: Array<Promise<unknown>> = [];

  if (previousStatus !== context.order.status) {
    jobs.push(
      sendTemplatedMail({
        metadata: { orderId: context.order.id, previousStatus },
        rawHtmlVariables: ['order_items'],
        templateKey: 'customer_order_status_updated',
        to: context.order.customer_email,
        variables,
      })
    );
  }

  if (previousPaymentStatus !== context.order.payment_status) {
    jobs.push(
      sendTemplatedMail({
        metadata: { orderId: context.order.id, previousPaymentStatus },
        rawHtmlVariables: ['order_items'],
        templateKey: 'customer_payment_status_updated',
        to: context.order.customer_email,
        variables,
      })
    );
  }

  await Promise.allSettled(jobs);
}
