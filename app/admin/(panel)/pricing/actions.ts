'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}
function getNumber(formData: FormData, key: string) {
  const v = getText(formData, key).replace(',', '.');
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function revalidatePricing() {
  revalidatePath('/admin');
  revalidatePath('/admin/katalog/fiyat-listeleri');
  revalidatePath('/admin/musteriler/fiyatlar');
  revalidatePath('/admin/products');
}

export async function savePriceListAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');
  const code = getText(formData, 'code');
  if (!name || !code) throw new Error('Fiyat listesi adı ve kodu zorunludur.');

  const payload = {
    name,
    code: code.toUpperCase().replace(/\s+/g, '_'),
    is_active: formData.get('is_active') === 'on',
    is_default: formData.get('is_default') === 'on',
  };

  if (payload.is_default) {
    await supabase.from('price_lists').update({ is_default: false }).neq('code', payload.code);
  }

  const { error } = id
    ? await supabase.from('price_lists').update(payload).eq('id', id)
    : await supabase.from('price_lists').insert(payload);
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function deletePriceListAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const id = getText(formData, 'id');
  if (!id) return;
  const { error } = await supabase.from('price_lists').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function savePriceListItemAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const priceListId = getText(formData, 'price_list_id');
  const productId = getText(formData, 'product_id');
  const price = getNumber(formData, 'price');
  const discountPercent = getNumber(formData, 'discount_percent');
  if (!priceListId || !productId) throw new Error('Fiyat listesi ve ürün zorunludur.');

  const payload = {
    price_list_id: priceListId,
    product_id: productId,
    price: price > 0 ? price : null,
    discount_percent: discountPercent > 0 ? discountPercent : null,
  };

  const { error } = await supabase
    .from('price_list_items')
    .upsert(payload, { onConflict: 'price_list_id,product_id' });
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function removePriceListItemAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const id = getText(formData, 'id');
  if (!id) return;
  const { error } = await supabase.from('price_list_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function assignCustomerPriceListAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const customerId = getText(formData, 'customer_id');
  const priceListId = getText(formData, 'price_list_id');
  if (!customerId || !priceListId) throw new Error('Müşteri ve fiyat listesi zorunludur.');

  await supabase.from('customer_price_lists').delete().eq('customer_id', customerId);
  const { error } = await supabase.from('customer_price_lists').insert({ customer_id: customerId, price_list_id: priceListId });
  if (error) throw new Error(error.message);
  revalidatePricing();
  revalidatePath('/admin/musteriler'); // eslint-disable-line react-hooks/rules-of-hooks -- server action
}

export async function saveCustomerDiscountAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const customerId = getText(formData, 'customer_id');
  const discountPercent = getNumber(formData, 'discount_percent');
  if (!customerId) throw new Error('Müşteri zorunludur.');

  const { error } = await supabase
    .from('customer_discounts')
    .upsert({ customer_id: customerId, discount_percent: discountPercent }, { onConflict: 'customer_id' });
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function saveCustomerProductPriceAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const customerId = getText(formData, 'customer_id');
  const productId = getText(formData, 'product_id');
  const price = getNumber(formData, 'price');
  if (!customerId || !productId || price <= 0) throw new Error('Müşteri, ürün ve fiyat zorunludur.');

  const { error } = await supabase
    .from('customer_product_prices')
    .upsert({ customer_id: customerId, product_id: productId, price }, { onConflict: 'customer_id,product_id' });
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function removeCustomerProductPriceAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const customerId = getText(formData, 'customer_id');
  const productId = getText(formData, 'product_id');
  if (!customerId || !productId) return;
  const { error } = await supabase
    .from('customer_product_prices')
    .delete()
    .eq('customer_id', customerId)
    .eq('product_id', productId);
  if (error) throw new Error(error.message);
  revalidatePricing();
}

export async function bulkUpdatePricesAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.managePrice');
  const supabase = createAdminClient();
  const productIds = (formData.get('product_ids')?.toString() ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const mode = getText(formData, 'mode');
  const value = getNumber(formData, 'value');
  const direction = getText(formData, 'direction');
  if (productIds.length === 0 || value <= 0 || (mode !== 'percent' && mode !== 'fixed')) {
    throw new Error('Ürün seçimi, mod ve değer zorunludur.');
  }

  const { data: products, error: fetchError } = await supabase.from('products').select('id, price').in('id', productIds);
  if (fetchError) throw new Error(fetchError.message);

  for (const p of products ?? []) {
    let newPrice: number;
    if (mode === 'fixed') {
      newPrice = direction === 'decrease' ? Math.max(0, (Number(p.price) || 0) - value) : (Number(p.price) || 0) + value;
    } else {
      const delta = (Number(p.price) || 0) * (value / 100) * (direction === 'decrease' ? -1 : 1);
      newPrice = Math.max(0, (Number(p.price) || 0) + delta);
    }
    const { error } = await supabase.from('products').update({ price: Math.round(newPrice * 100) / 100 }).eq('id', p.id);
    if (error) throw new Error(error.message);
  }

  revalidatePricing();
}
