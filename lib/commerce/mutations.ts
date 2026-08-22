import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { assertOrderQuantity } from '@/lib/commerce/quantity';

function normalizeQuantity(value: number) {
  return Math.max(1, Math.min(value, 99));
}

async function requirePurchasableProduct(supabase: SupabaseClient<Database>, productId: string) {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, price, price_mode, stock_status, status, is_active, minimum_order_quantity, stock_quantity')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!product || product.status !== 'published' || !product.is_active || product.stock_status === 'out_of_stock' || product.price_mode !== 'fixed' || typeof product.price !== 'number') {
    throw new Error('Bu urun dogrudan sepete eklenemez. Teklif al akisini kullanin.');
  }
  return product;
}

export { requirePurchasableProduct };

export async function addProductToCart(supabase: SupabaseClient<Database>, userId: string, productId: string, quantity: number) {
  const product = await requirePurchasableProduct(supabase, productId);

  const { data: existingItem, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingItem) {
    const nextQuantity = existingItem.quantity + normalizeQuantity(quantity);
    assertOrderQuantity(product, nextQuantity);
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: normalizeQuantity(nextQuantity) })
      .eq('id', existingItem.id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const normalizedQuantity = normalizeQuantity(quantity);
  assertOrderQuantity(product, normalizedQuantity);
  const { error } = await supabase.from('cart_items').insert({
    product_id: productId,
    quantity: normalizedQuantity,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function setCartItemQuantity(supabase: SupabaseClient<Database>, userId: string, itemId: string, quantity: number) {
  if (quantity <= 0) {
    await removeCartItem(supabase, userId, itemId);
    return;
  }

  const { data: item, error: itemError } = await supabase.from('cart_items').select('product_id').eq('id', itemId).eq('user_id', userId).maybeSingle();
  if (itemError || !item) throw new Error(itemError?.message ?? 'Sepet ürünü bulunamadı.');
  const product = await requirePurchasableProduct(supabase, item.product_id);
  const normalizedQuantity = normalizeQuantity(quantity);
  assertOrderQuantity(product, normalizedQuantity);
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: normalizedQuantity })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeCartItem(supabase: SupabaseClient<Database>, userId: string, itemId: string) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function toggleFavorite(supabase: SupabaseClient<Database>, userId: string, productId: string) {
  const { data: favorite, error: favoriteError } = await supabase
    .from('customer_favorites')
    .select('product_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (favoriteError) {
    throw new Error(favoriteError.message);
  }

  if (favorite) {
    const { error } = await supabase
      .from('customer_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      throw new Error(error.message);
    }

    return false;
  }

  const { error } = await supabase.from('customer_favorites').insert({
    product_id: productId,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
