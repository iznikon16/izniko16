import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getCustomerAccessStatus } from '@/lib/auth/customer-access';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import type { CatalogProduct, CustomerAddressRow, CustomerProfileRow, OrderItemRow, OrderRow, PaymentAttemptRow, PaymentMethodRow, ShipmentItemRow, ShipmentRecord, ShipmentStatusHistoryRow } from '@/lib/catalog/types';
import type { ResolvedCommerceCoupon } from '@/lib/commerce/coupons';
import type { GuestCartItem } from '@/lib/commerce/guest-cart';
import type { BankTransferDetails } from '@/lib/commerce/payment-display';
import { getBankTransferDetails } from '@/lib/commerce/payment-display';
import { getProductCheckoutPrice, getProductHref } from '@/lib/commerce/product';
import { resolveStoredCommerceCoupon } from '@/lib/commerce/coupons';
import { getPublicProductsByIds } from '@/lib/catalog/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import { getOrderQuantityError } from '@/lib/commerce/quantity';
export { formatCommercePrice } from '@/lib/commerce/format';
export { getProductCheckoutPrice, getProductHref } from '@/lib/commerce/product';

export type CommerceCartLine = {
  id: string;
  lineTotal: number;
  product: CatalogProduct & { customerPrice?: number | null; customerPriceSource?: string };
  productHref: string;
  quantity: number;
  taxAmount: number | null;
  taxRate: number | null;
  unitPrice: number | null;
};

export type CommerceCart = {
  checkoutReady: boolean;
  coupon: ResolvedCommerceCoupon | null;
  discountTotal: number;
  itemCount: number;
  lines: CommerceCartLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
};

type CommerceCartEntry = {
  id: string;
  productId: string;
  quantity: number;
};

export type CustomerSession = {
  profile: CustomerProfileRow;
  user: User;
};

export type CustomerOrder = OrderRow & {
  items: OrderItemRow[];
  paymentAttempt: Pick<PaymentAttemptRow, 'id' | 'metadata' | 'provider_reference' | 'status'> | null;
  paymentMethod: (Pick<PaymentMethodRow, 'code' | 'description' | 'id' | 'instructions' | 'integration_type' | 'name' | 'provider'> & {
    bankDetails: BankTransferDetails;
  }) | null;
};

export type CustomerOrderDetail = CustomerOrder & { shipments: ShipmentRecord[] };

export async function getCustomerSession() {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.warn('Supabase auth error in customer session:', error instanceof Error ? error.message : error);
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('Müşteri oturumu doğrulanamadı.');
  }

  const accessStatus = getCustomerAccessStatus(profile);

  if (accessStatus === 'missing_profile' || accessStatus === 'unverified' || !profile) {
    return null;
  }

  if (accessStatus === 'blocked') {
    await supabase.auth.signOut({ scope: 'global' });
    return null;
  }

  return {
    profile,
    user,
  } satisfies CustomerSession;
}

export async function requireCustomerSession(next = '/hesabim') {
  const session = await getCustomerSession();

  if (!session) {
    const safeNext = getSafeCustomerRedirectPath(next);
    redirect(`/giris?next=${encodeURIComponent(safeNext)}`);
  }

  return session;
}

export async function ensureCustomerProfile(user: User) {
  const supabase = createAdminClient();
  const email = user.email ?? '';
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const marketingConsent = user.user_metadata?.marketing_consent === true || user.user_metadata?.marketing_consent === 'true';

  const { data: profile, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (profile) {
    return profile;
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('customer_profiles')
    .insert({
      user_id: user.id,
      email,
      full_name: fullName,
      marketing_consent: marketingConsent,
    })
    .select()
    .single();

  if (createError || !createdProfile) {
    throw new Error(createError?.message ?? 'Müşteri profili oluşturulamadı.');
  }

  return createdProfile;
}

export async function getCustomerAddresses(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CustomerAddressRow[];
}

function normalizeCartQuantity(value: number) {
  return Math.max(1, Math.min(Math.trunc(value) || 1, 99));
}

function normalizeCartEntries(entries: CommerceCartEntry[]) {
  const entriesByProductId = new Map<string, CommerceCartEntry>();

  for (const entry of entries) {
    const productId = entry.productId.trim();

    if (!productId) {
      continue;
    }

    const quantity = normalizeCartQuantity(entry.quantity);
    const existingEntry = entriesByProductId.get(productId);

    if (existingEntry) {
      existingEntry.quantity = normalizeCartQuantity(existingEntry.quantity + quantity);
      continue;
    }

    entriesByProductId.set(productId, {
      id: entry.id,
      productId,
      quantity,
    });
  }

  return [...entriesByProductId.values()];
}

async function buildCommerceCart(entries: CommerceCartEntry[], options?: { couponCode?: string | null }, customerId?: string): Promise<CommerceCart> {
  const normalizedEntries = normalizeCartEntries(entries);
  const productIds = normalizedEntries.map((entry) => entry.productId);
  const publicProducts = await getPublicProductsByIds(productIds);
  const products = customerId
    ? await getCustomerPricedProducts(customerId, publicProducts)
    : publicProducts;
  const productsById = new Map(products.map((product) => [product.id, product]));
  const lines = normalizedEntries
    .map((entry) => {
      const product = productsById.get(entry.productId);

      if (!product) {
        return null;
      }

      const unitPrice = getProductCheckoutPrice(product);
      const lineTotal = (unitPrice ?? 0) * entry.quantity;
      const taxRate = product.tax_rate;
      const taxAmount = unitPrice == null || taxRate == null
        ? null
        : lineTotal - (lineTotal / (1 + taxRate / 100));

      return {
        id: entry.id,
        lineTotal,
        product,
        productHref: getProductHref(product),
        quantity: entry.quantity,
        taxAmount,
        taxRate,
        unitPrice,
      } satisfies CommerceCartLine;
    })
    .filter((line): line is CommerceCartLine => Boolean(line));

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const coupon = await resolveStoredCommerceCoupon(
    subtotal,
    options && Object.prototype.hasOwnProperty.call(options, 'couponCode') ? options.couponCode ?? '' : undefined
  );
  const discountTotal = coupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discountTotal);
  const includedTaxBeforeDiscount = lines.reduce((sum, line) => sum + (line.taxAmount ?? 0), 0);
  const taxTotal = subtotal > 0 ? includedTaxBeforeDiscount * (total / subtotal) : 0;

  return {
    checkoutReady: lines.length > 0 && lines.every((line) => line.unitPrice != null && line.taxRate != null && !getOrderQuantityError(line.product, line.quantity)),
    coupon,
    discountTotal,
    itemCount,
    lines,
    subtotal,
    taxTotal,
    total,
  };
}

export async function getGuestCart(guestItems: GuestCartItem[], options?: { couponCode?: string | null }) {
  return buildCommerceCart(
    guestItems.map((item) => ({
      id: `guest:${item.productId}`,
      productId: item.productId,
      quantity: item.quantity,
    })),
    options,
  );
}

export async function getCart(userId: string, options?: { couponCode?: string | null }, guestItems: GuestCartItem[] = []): Promise<CommerceCart> {
  const supabase = await createClient();
  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const storedEntries: CommerceCartEntry[] = (cartItems ?? []).map((item) => ({
    id: item.id,
    productId: item.product_id,
    quantity: item.quantity,
  }));

  return buildCommerceCart(
    [
      ...storedEntries,
      ...guestItems.map((item) => ({
        id: `guest:${item.productId}`,
        productId: item.productId,
        quantity: item.quantity,
      })),
    ],
    options,
    userId,
  );
}

export async function getFavoriteProducts(userId: string) {
  const supabase = await createClient();
  const { data: favorites, error } = await supabase
    .from('customer_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const productIds = (favorites ?? []).map((favorite) => favorite.product_id);
  return getPublicProductsByIds(productIds);
}

export async function getFavoriteProductIds(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_favorites')
    .select('product_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((favorite) => favorite.product_id));
}

export async function getCustomerOrders(userId: string): Promise<CustomerOrder[]> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const paymentMethodIds = [...new Set(orders.map((order) => order.payment_method_id).filter(Boolean))] as string[];
  const [
    { data: orderItems, error: orderItemsError },
    { data: paymentAttempts, error: paymentAttemptsError },
    { data: paymentMethods, error: paymentMethodsError },
  ] = await Promise.all([
    supabase.from('order_items').select('*').in('order_id', orderIds).order('created_at', { ascending: true }),
    supabase.from('payment_attempts').select('id, order_id, metadata, provider_reference, status').in('order_id', orderIds).order('created_at', { ascending: false }),
    paymentMethodIds.length > 0
      ? adminSupabase
          .from('payment_methods')
          .select('id, code, name, description, instructions, provider, integration_type, config')
          .in('id', paymentMethodIds)
      : Promise.resolve({
          data: [] as Pick<PaymentMethodRow, 'code' | 'config' | 'description' | 'id' | 'instructions' | 'integration_type' | 'name' | 'provider'>[],
          error: null,
        }),
  ]);

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  if (paymentAttemptsError) {
    throw new Error(paymentAttemptsError.message);
  }

  if (paymentMethodsError) {
    throw new Error(paymentMethodsError.message);
  }

  const itemsByOrderId = new Map<string, OrderItemRow[]>();
  for (const item of orderItems ?? []) {
    const items = itemsByOrderId.get(item.order_id) ?? [];
    items.push(item);
    itemsByOrderId.set(item.order_id, items);
  }

  const attemptsByOrderId = new Map<string, Pick<PaymentAttemptRow, 'id' | 'metadata' | 'provider_reference' | 'status'>>();
  for (const attempt of paymentAttempts ?? []) {
    if (!attemptsByOrderId.has(attempt.order_id)) {
      attemptsByOrderId.set(attempt.order_id, attempt as Pick<PaymentAttemptRow, 'id' | 'metadata' | 'provider_reference' | 'status'>);
    }
  }

  const methodsById = new Map(
    (paymentMethods ?? []).map((method) => [
      method.id,
      {
        bankDetails: getBankTransferDetails(method.config),
        code: method.code,
        description: method.description,
        id: method.id,
        instructions: method.instructions,
        integration_type: method.integration_type,
        name: method.name,
        provider: method.provider,
      },
    ])
  );

  return orders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
    paymentAttempt: attemptsByOrderId.get(order.id) ?? null,
    paymentMethod: order.payment_method_id ? methodsById.get(order.payment_method_id) ?? null : null,
  }));
}

export async function getCustomerOrderDetail(userId: string, orderId: string): Promise<CustomerOrderDetail | null> {
  const orders = await getCustomerOrders(userId);
  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order) return null;

  const supabase = await createClient();
  const { data: shipments, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const shipmentIds = (shipments ?? []).map((shipment) => shipment.id);
  if (shipmentIds.length === 0) return { ...order, shipments: [] };

  const [{ data: shipmentItems, error: itemsError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from('shipment_items').select('*').in('shipment_id', shipmentIds),
    supabase.from('shipment_status_history').select('*').in('shipment_id', shipmentIds).order('created_at', { ascending: false }),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (historyError) throw new Error(historyError.message);

  const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
  return {
    ...order,
    shipments: (shipments ?? []).map((shipment) => ({
      ...shipment,
      history: (history ?? []).filter((entry: ShipmentStatusHistoryRow) => entry.shipment_id === shipment.id),
      items: (shipmentItems ?? [])
        .filter((item: ShipmentItemRow) => item.shipment_id === shipment.id)
        .map((item: ShipmentItemRow) => ({ ...item, orderItem: orderItemsById.get(item.order_item_id) ?? null })),
    })),
  };
}
