import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type AdminSearchGroup = 'customers' | 'products' | 'orders' | 'accounting';

export type AdminSearchResult = {
  id: string;
  group: AdminSearchGroup;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
};

export type AdminSearchResponse = {
  query: string;
  results: AdminSearchResult[];
};

const GROUP_PERMISSION: Record<AdminSearchGroup, string> = {
  customers: 'customer.view',
  products: 'product.view',
  orders: 'order.view',
  accounting: 'account.view',
};

export function normalizeAdminSearchQuery(value: string | null | undefined) {
  return (value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64);
}

function postgrestSearchTerm(value: string) {
  return value.replace(/[%_,()\"\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function canSearch(permissions: Set<string>, group: AdminSearchGroup) {
  return permissions.has('*') || permissions.has(GROUP_PERMISSION[group]);
}

function empty<T>() {
  return Promise.resolve({ data: [] as T[], error: null });
}

export async function searchAdminGlobal(rawQuery: string, permissions: Set<string>): Promise<AdminSearchResponse> {
  const query = normalizeAdminSearchQuery(rawQuery);
  if (query.length < 2) return { query, results: [] };
  const term = postgrestSearchTerm(query);
  if (term.length < 2) return { query, results: [] };

  const supabase = createAdminClient();
  const customerQuery = canSearch(permissions, 'customers')
    ? supabase.from('customer_profiles').select('user_id, full_name, email').or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`).limit(5)
    : empty<{ user_id: string; full_name: string; email: string }>();
  const productQuery = canSearch(permissions, 'products')
    ? supabase.from('products').select('id, title, sku, status').or(`title.ilike.%${term}%,sku.ilike.%${term}%,slug.ilike.%${term}%`).limit(5)
    : empty<{ id: string; title: string; sku: string; status: string }>();
  const orderQuery = canSearch(permissions, 'orders')
    ? supabase.from('orders').select('id, order_number, customer_name, customer_email, status').or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`).order('created_at', { ascending: false }).limit(5)
    : empty<{ id: string; order_number: string; customer_name: string; customer_email: string; status: string }>();
  const ledgerQuery = canSearch(permissions, 'accounting')
    ? supabase.from('account_transaction_ledger').select('transaction_id, customer_id, reference, description, type, order_number').ilike('search_text', `%${term}%`).order('created_at', { ascending: false }).limit(5)
    : empty<{ transaction_id: string | null; customer_id: string | null; reference: string | null; description: string | null; type: string | null; order_number: string | null }>();

  const [customers, products, orders, ledger] = await Promise.all([customerQuery, productQuery, orderQuery, ledgerQuery]);
  if (customers.error || products.error || orders.error || ledger.error) throw new Error('Global arama tamamlanamadı.');

  const results: AdminSearchResult[] = [];
  for (const customer of customers.data ?? []) {
    results.push({
      id: `customer:${customer.user_id}`, group: 'customers', title: customer.full_name || customer.email || 'İsimsiz müşteri',
      subtitle: customer.email || '', badge: 'Müşteri', href: `/admin/customers?query=${encodeURIComponent(customer.email || customer.full_name)}`,
    });
  }
  for (const product of products.data ?? []) {
    results.push({
      id: `product:${product.id}`, group: 'products', title: product.title, subtitle: `SKU: ${product.sku}`,
      badge: product.status === 'active' ? 'Aktif ürün' : 'Ürün', href: `/admin/products/${encodeURIComponent(product.id)}`,
    });
  }
  for (const order of orders.data ?? []) {
    results.push({
      id: `order:${order.id}`, group: 'orders', title: order.order_number,
      subtitle: order.customer_name || order.customer_email || 'İsimsiz müşteri', badge: 'Sipariş',
      href: `/admin/orders?query=${encodeURIComponent(order.order_number)}`,
    });
  }
  for (const transaction of ledger.data ?? []) {
    if (!transaction.transaction_id || !transaction.customer_id) continue;
    const transactionNumber = `CHR-${transaction.transaction_id.slice(0, 8).toUpperCase()}`;
    results.push({
      id: `accounting:${transaction.transaction_id}`, group: 'accounting', title: transactionNumber,
      subtitle: transaction.description || transaction.reference || transaction.order_number || 'Cari hareket',
      badge: 'Cari hareket',
      href: `/admin/accounting/${encodeURIComponent(transaction.customer_id)}?tab=transactions&ledgerQuery=${encodeURIComponent(transactionNumber)}`,
    });
  }
  return { query, results };
}
