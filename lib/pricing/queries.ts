import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { PriceListItemRow, ProductRow } from '@/lib/catalog/types';

/**
 * Merkezi PricingService.
 *
 * Fiyat öncelik zinciri (yüksekten düşüğe):
 *   1. Customer Product Special Price  (customer_product_prices)
 *   2. Customer Price List             (customer_price_lists -> price_list_items)
 *   3. Customer Discount               (customer_discounts %)
 *   4. Standard Price                  (products.price)
 *
 * Sipariş fiyatı asla frontend'den gelen değere güvenilerek oluşturulmaz;
 * bu servis üzerinden hesaplanır.
 */

export type ResolvedPrice = {
  price: number | null;
  source: 'customer_special' | 'price_list' | 'customer_discount' | 'standard';
  sourceLabel: string;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getCustomerPricingContext(customerId: string) {
  const authenticatedSupabase = await createServerClient();
  const { data: userData, error: userError } = await authenticatedSupabase.auth.getUser();
  if (userError || !userData.user || userData.user.id !== customerId) {
    throw new Error('Müşteri fiyatı doğrulanamadı.');
  }
  const supabase = createAdminClient();

  const [specialRes, listAssignRes, discountRes] = await Promise.all([
    supabase.from('customer_product_prices').select('product_id, price').eq('customer_id', customerId),
    supabase.from('customer_price_lists').select('price_list_id').eq('customer_id', customerId).maybeSingle(),
    supabase.from('customer_discounts').select('discount_percent').eq('customer_id', customerId).maybeSingle(),
  ]);

  if (specialRes.error) throw new Error(specialRes.error.message);
  if (listAssignRes.error) throw new Error(listAssignRes.error.message);
  if (discountRes.error) throw new Error(discountRes.error.message);

  const specialPrices = new Map<string, number>();
  for (const row of specialRes.data ?? []) {
    specialPrices.set(row.product_id, Number(row.price));
  }

  const priceListId = listAssignRes.data?.price_list_id ?? null;
  const discountPercent = discountRes.data ? Number(discountRes.data.discount_percent) || 0 : 0;

  let priceListItems = new Map<string, PriceListItemRow>();
  if (priceListId) {
    const { data: items, error } = await supabase
      .from('price_list_items')
      .select('*')
      .eq('price_list_id', priceListId);
    if (error) throw new Error(error.message);
    priceListItems = new Map((items ?? []).map((item) => [item.product_id, item as PriceListItemRow]));
  }

  return { specialPrices, discountPercent, priceListItems, priceListId };
}

type ResolveOptions = {
  /** Müşterinin katalogdaki standart fiyatı (products.price) */
  standardPrice: number | null;
  customerId: string;
  productId: string;
};

/**
 * Tek ürün için müşteriye özel fiyatı çözer.
 * @param context getCustomerPricingContext sonucu (performans için tek kez alınır)
 */
export function resolveProductPriceForCustomer(
  context: ReturnType<typeof getCustomerPricingContext> extends Promise<infer T> ? T : never,
  options: ResolveOptions
): ResolvedPrice {
  const { standardPrice, productId } = options;

  // 1. Müşteri özel ürün fiyatı
  const special = context.specialPrices.get(productId);
  if (special != null) {
    return { price: roundMoney(special), source: 'customer_special', sourceLabel: 'Müşteri Özel Fiyatı' };
  }

  // 2. Müşteri fiyat listesi
  const listItem = context.priceListItems.get(productId);
  if (listItem) {
    if (listItem.price != null) {
      return { price: roundMoney(Number(listItem.price)), source: 'price_list', sourceLabel: 'Fiyat Listesi' };
    }
    if (listItem.discount_percent != null && standardPrice != null) {
      const discounted = standardPrice * (1 - Number(listItem.discount_percent) / 100);
      return { price: roundMoney(discounted), source: 'price_list', sourceLabel: 'Fiyat Listesi (İndirim)' };
    }
  }

  // 3. Müşteri indirimi
  if (context.discountPercent > 0 && standardPrice != null) {
    const discounted = standardPrice * (1 - context.discountPercent / 100);
    return { price: roundMoney(discounted), source: 'customer_discount', sourceLabel: `%${context.discountPercent} İndirim` };
  }

  // 4. Standart fiyat
  if (standardPrice != null) {
    return { price: roundMoney(standardPrice), source: 'standard', sourceLabel: 'Standart Fiyat' };
  }

  return { price: null, source: 'standard', sourceLabel: 'Fiyat Yok' };
}

/**
 * Katalog ürün listesini müşteri fiyatlarıyla zenginleştirir (B2B katalog görünümü).
 */
export async function getCustomerPricedProducts<T extends Pick<ProductRow, 'id' | 'price'>>(customerId: string, products: T[]) {
  if (products.length === 0) return [];
  const supabase = createAdminClient();
  const [context, standardPriceResult] = await Promise.all([
    getCustomerPricingContext(customerId),
    supabase.from('products').select('id, price').in('id', products.map((product) => product.id)),
  ]);
  if (standardPriceResult.error) throw new Error(standardPriceResult.error.message);
  const standardPrices = new Map((standardPriceResult.data ?? []).map((product) => [product.id, product.price]));

  return products.map((product) => {
    const standardPrice = standardPrices.get(product.id);
    const resolved = resolveProductPriceForCustomer(context, {
      standardPrice: standardPrice != null ? Number(standardPrice) : null,
      customerId,
      productId: product.id,
    });
    return {
      ...product,
      customerPrice: resolved.price,
      customerPriceSource: resolved.sourceLabel,
    };
  });
}

/**
 * Toplu fiyat değişikliği (yüzde veya sabit). Admin araçları için.
 */
export async function applyBulkPriceChange(
  productIds: string[],
  mode: 'percent' | 'fixed',
  value: number,
  options: { onExisting?: boolean; direction?: 'increase' | 'decrease' } = {}
) {
  const supabase = createAdminClient();
  const { data: products, error } = await supabase.from('products').select('id, price').in('id', productIds);
  if (error) throw new Error(error.message);

  const updates = (products ?? []).map((p) => {
    if (mode === 'fixed') {
      return { id: p.id, price: roundMoney(Number(options.direction === 'decrease' ? -1 : 1) * Math.abs(value)) };
    }
    const current = Number(p.price) || 0;
    const delta = current * (value / 100) * (options.direction === 'decrease' ? -1 : 1);
    return { id: p.id, price: roundMoney(current + delta) };
  });

  for (const u of updates) {
    const { error: updateError } = await supabase.from('products').update({ price: u.price }).eq('id', u.id);
    if (updateError) throw new Error(updateError.message);
  }

  return updates.length;
}
