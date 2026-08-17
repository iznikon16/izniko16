import { createAdminClient } from '@/lib/supabase/admin';
import type { ProductRow, StockMovementRow } from '@/lib/catalog/types';

/**
 * Stok domain katmanı. Güncel stok, products.stock_quantity üzerinde;
 * geçmiş, stock_movements ledger'ında tutulur (immutable).
 */

export type StockProduct = Pick<
  ProductRow,
  'id' | 'sku' | 'slug' | 'title' | 'stock_quantity' | 'critical_stock' | 'stock_status' | 'updated_at'
>;

export type CriticalStockProduct = StockProduct & {
  deficit: number;
};

export async function getAllStockProducts(search?: string): Promise<StockProduct[]> {
  const supabase = createAdminClient();
  let query = supabase.from('products').select('id, sku, slug, title, stock_quantity, critical_stock, stock_status, updated_at');

  if (search) {
    const term = search.replace(/[%_,]/g, ' ').trim();
    if (term) {
      query = query.or(`title.ilike.%${term}%,sku.ilike.%${term}%`);
    }
  }

  const { data, error } = await query.order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StockProduct[];
}

export async function getCriticalStockProducts(limit?: number): Promise<CriticalStockProduct[]> {
  const supabase = createAdminClient();
  let query = supabase.from('products').select('id, sku, slug, title, stock_quantity, critical_stock, stock_status, updated_at');

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const products = ((data ?? []) as StockProduct[]).filter((p) => Number(p.stock_quantity) <= Number(p.critical_stock));
  const result = products
    .map((p) => ({ ...p, deficit: Math.max(0, Number(p.critical_stock) - Number(p.stock_quantity)) }))
    .sort((a, b) => a.deficit - b.deficit || a.title.localeCompare(b.title, 'tr'));

  return limit ? result.slice(0, limit) : result;
}

export type StockMovementWithProduct = StockMovementRow & {
  product: Pick<ProductRow, 'id' | 'title' | 'sku'> | null;
};

export async function getStockMovements(limit = 300): Promise<StockMovementWithProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*, product:products(id, title, sku)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as StockMovementWithProduct[];
}

/**
 * Manuel stok düzeltmesi. apply_stock_change fonksiyonunu çağırır (idempotent).
 * quantityChange pozitif = giriş, negatif = çıkış.
 */
export async function applyManualStockChange(
  productId: string,
  quantityChange: number,
  type: 'manual_in' | 'manual_out',
  reference: string,
  idempotencyKey: string
): Promise<{ previousQuantity: number; resultingQuantity: number }> {
  const supabase = createAdminClient();

  if (quantityChange === 0) {
    throw new Error('Stok değişimi sıfır olamaz.');
  }

  if (type === 'manual_in' && quantityChange < 0) {
    throw new Error('Stok girişi pozitif değerde olmalıdır.');
  }

  if (type === 'manual_out' && quantityChange > 0) {
    throw new Error('Stok çıkışı negatif değerde olmalıdır.');
  }

  const newQuantityChange = Math.abs(quantityChange) * (type === 'manual_in' ? 1 : -1);

  const { data, error } = await supabase.rpc('apply_stock_change', {
    p_product_id: productId,
    p_quantity_change: newQuantityChange,
    p_type: type,
    p_reference: reference,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw new Error(error.message);
  const row = data?.[0];
  return {
    previousQuantity: row?.previous_quantity ?? 0,
    resultingQuantity: row?.resulting_quantity ?? 0,
  };
}
