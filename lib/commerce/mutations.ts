import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

function normalizeQuantity(value: number) {
  return Math.max(1, Math.min(value, 99));
}

async function requirePurchasableProduct(supabase: SupabaseClient<Database>, productId: string) {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, price, price_mode, stock_status, status, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!product || product.status !== 'published' || !product.is_active || product.stock_status === 'out_of_stock' || product.price_mode !== 'fixed' || typeof product.price !== 'number') {
    throw new Error('Bu urun dogrudan sepete eklenemez. Teklif al akisini kullanin.');
  }
}

export { requirePurchasableProduct };

export async function addProductToCart(supabase: SupabaseClient<Database>, userId: string, productId: string, quantity: number) {
  await requirePurchasableProduct(supabase, productId);

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
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: normalizeQuantity(existingItem.quantity + normalizeQuantity(quantity)) })
      .eq('id', existingItem.id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from('cart_items').insert({
    product_id: productId,
    quantity: normalizeQuantity(quantity),
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

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: normalizeQuantity(quantity) })
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
