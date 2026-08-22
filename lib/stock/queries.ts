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

export type StockPage<T> = {
  rows: T[];
  count: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

type StockPageFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

function normalizePage(value: number | undefined) {
  return Math.max(1, Math.trunc(value ?? 1));
}

function normalizePageSize(value: number | undefined) {
  return Math.min(100, Math.max(10, Math.trunc(value ?? 25)));
}

function sanitizeSearch(search?: string) {
  return search?.replace(/[%_,]/g, ' ').trim().slice(0, 100) ?? '';
}

export async function getStockProductsPage(filters: StockPageFilters = {}): Promise<StockPage<StockProduct>> {
  const supabase = createAdminClient();
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  const term = sanitizeSearch(filters.search);
  const start = (page - 1) * pageSize;
  let query = supabase
    .from('products')
    .select('id, sku, slug, title, stock_quantity, critical_stock, stock_status, updated_at', { count: 'exact' });

  if (term) query = query.or(`title.ilike.%${term}%,sku.ilike.%${term}%`);

  const { data, error, count } = await query.order('title', { ascending: true }).range(start, start + pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (page > pageCount) return getStockProductsPage({ ...filters, page: pageCount, pageSize });

  return { rows: (data ?? []) as StockProduct[], count: total, page, pageCount, pageSize };
}

export async function getStockSummary(search?: string) {
  const supabase = createAdminClient();
  const term = sanitizeSearch(search);
  let query = supabase.from('products').select('stock_quantity, critical_stock');
  if (term) query = query.or(`title.ilike.%${term}%,sku.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    totalProducts: rows.length,
    outOfStock: rows.filter((row) => Number(row.stock_quantity) <= 0).length,
    critical: rows.filter((row) => Number(row.stock_quantity) <= Number(row.critical_stock)).length,
  };
}

export async function getAllStockProducts(search?: string): Promise<StockProduct[]> {
  const supabase = createAdminClient();
  const query = supabase.from('products').select('id, sku, slug, title, stock_quantity, critical_stock, stock_status, updated_at');

  if (search) {
    const term = search.replace(/[%_,]/g, ' ').trim();
    if (term) {
      query.or(`title.ilike.%${term}%,sku.ilike.%${term}%`);
    }
  }

  const { data, error } = await query.order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StockProduct[];
}

export async function getCriticalStockProducts(limit?: number): Promise<CriticalStockProduct[]> {
  const supabase = createAdminClient();
  const query = supabase.from('products').select('id, sku, slug, title, stock_quantity, critical_stock, stock_status, updated_at');

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const products = ((data ?? []) as StockProduct[]).filter((p) => Number(p.stock_quantity) <= Number(p.critical_stock));
  const result = products
    .map((p) => ({ ...p, deficit: Math.max(0, Number(p.critical_stock) - Number(p.stock_quantity)) }))
    .sort((a, b) => a.deficit - b.deficit || a.title.localeCompare(b.title, 'tr'));

  return limit ? result.slice(0, limit) : result;
}

export async function getCriticalStockProductsPage(page = 1, pageSize = 25): Promise<StockPage<CriticalStockProduct>> {
  const safePage = normalizePage(page);
  const safePageSize = normalizePageSize(pageSize);
  const products = await getCriticalStockProducts();
  const count = products.length;
  const pageCount = Math.max(1, Math.ceil(count / safePageSize));
  const resolvedPage = Math.min(safePage, pageCount);
  const start = (resolvedPage - 1) * safePageSize;
  return { rows: products.slice(start, start + safePageSize), count, page: resolvedPage, pageCount, pageSize: safePageSize };
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

export async function getStockMovementsPage(page = 1, pageSize = 25): Promise<StockPage<StockMovementWithProduct>> {
  const supabase = createAdminClient();
  const safePage = normalizePage(page);
  const safePageSize = normalizePageSize(pageSize);
  const start = (safePage - 1) * safePageSize;
  const { data, error, count } = await supabase
    .from('stock_movements')
    .select('*, product:products(id, title, sku)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, start + safePageSize - 1);

  if (error) throw new Error(error.message);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  if (safePage > pageCount) return getStockMovementsPage(pageCount, safePageSize);

  return { rows: (data ?? []) as StockMovementWithProduct[], count: total, page: safePage, pageCount, pageSize: safePageSize };
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
  idempotencyKey: string,
  actorUserId?: string | null
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

  const { data, error } = await supabase.rpc('apply_stock_change', buildManualStockChangeArgs({
    actorUserId,
    idempotencyKey,
    productId,
    quantityChange: newQuantityChange,
    reference,
    type,
  }));

  if (error) throw new Error(error.message);
  const row = data?.[0];
  return {
    previousQuantity: row?.previous_quantity ?? 0,
    resultingQuantity: row?.resulting_quantity ?? 0,
  };
}

export function buildManualStockChangeArgs({
  actorUserId,
  idempotencyKey,
  productId,
  quantityChange,
  reference,
  type,
}: {
  actorUserId?: string | null;
  idempotencyKey: string;
  productId: string;
  quantityChange: number;
  reference: string;
  type: 'manual_in' | 'manual_out';
}) {
  return {
    p_actor_user_id: actorUserId ?? null,
    p_idempotency_key: idempotencyKey,
    p_order_id: null,
    p_product_id: productId,
    p_quantity_change: quantityChange,
    p_reference: reference,
    p_type: type,
  };
}
