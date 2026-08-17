import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerProfileRow, PriceListRow, CustomerProductPriceRow, CustomerDiscountRow } from '@/lib/catalog/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import {
  assignCustomerPriceListAction,
  saveCustomerDiscountAction,
  saveCustomerProductPriceAction,
  removeCustomerProductPriceAction,
} from '@/app/admin/(panel)/pricing/actions';

export const dynamic = 'force-dynamic';

export default async function CustomerPricingPage() {
  await requireAdminSession();
  const supabase = createAdminClient();

  const [customersRes, listsRes, specialRes, discountsRes, productsRes] = await Promise.all([
    supabase.from('customer_profiles').select('user_id, full_name, email').order('full_name', { ascending: true }),
    supabase.from('price_lists').select('*').order('name', { ascending: true }),
    supabase.from('customer_product_prices').select('*'),
    supabase.from('customer_discounts').select('*'),
    supabase.from('products').select('id, title, sku').order('title', { ascending: true }).limit(300),
  ]);

  if (customersRes.error) throw new Error(customersRes.error.message);
  if (listsRes.error) throw new Error(listsRes.error.message);
  if (specialRes.error) throw new Error(specialRes.error.message);
  if (discountsRes.error) throw new Error(discountsRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const customers = (customersRes.data ?? []) as Pick<CustomerProfileRow, 'user_id' | 'full_name' | 'email'>[];
  const lists = (listsRes.data ?? []) as PriceListRow[];
  const specialPrices = (specialRes.data ?? []) as CustomerProductPriceRow[];
  const discounts = (discountsRes.data ?? []) as CustomerDiscountRow[];
  const products = productsRes.data ?? [];

  // Müşteri -> fiyat listesi ataması
  const { data: assignments } = await supabase.from('customer_price_lists').select('*');
  const assignmentByCustomer = new Map((assignments ?? []).map((a) => [a.customer_id, a.price_list_id]));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Müşteri Fiyatları</h1>
        <p className="mt-1 text-gray-500">Müşteri bazında fiyat listesi, özel indirim ve özel ürün fiyatı yönetimi.</p>
      </div>

      <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fiyat Listesi</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">İndirim %</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Özel Ürün Fiyatları</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => {
                const customerSpecial = specialPrices.filter((s) => s.customer_id === customer.user_id);
                const customerDiscount = discounts.find((d) => d.customer_id === customer.user_id);
                const assignedListId = assignmentByCustomer.get(customer.user_id);

                return (
                  <tr key={customer.user_id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{customer.full_name || '—'}</span>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <form action={assignCustomerPriceListAction} className="flex items-center gap-2">
                        <input type="hidden" name="customer_id" value={customer.user_id} />
                        <select name="price_list_id" defaultValue={assignedListId ?? ''} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs">
                          <option value="">Yok</option>
                          {lists.map((list) => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                          ))}
                        </select>
                        <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Ata</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={saveCustomerDiscountAction} className="flex items-center gap-2">
                        <input type="hidden" name="customer_id" value={customer.user_id} />
                        <input
                          type="number"
                          name="discount_percent"
                          defaultValue={customerDiscount?.discount_percent ?? ''}
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-right"
                        />
                        <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">%</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={saveCustomerProductPriceAction} className="mb-2 grid grid-cols-[1fr_90px_auto] gap-1">
                        <input type="hidden" name="customer_id" value={customer.user_id} />
                        <select name="product_id" className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                          <option value="">Ürün seç</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                        <input type="number" name="price" step="0.01" min="0" placeholder="₺" className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-right" />
                        <button className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">Ekle</button>
                      </form>
                      {customerSpecial.length > 0 && (
                        <div className="space-y-1">
                          {customerSpecial.slice(0, 3).map((sp) => {
                            const product = products.find((p) => p.id === sp.product_id);
                            return (
                              <div key={sp.id} className="flex items-center justify-between rounded bg-blue-50/60 px-2 py-1 text-xs">
                                <span className="truncate text-gray-600">{product?.title || sp.product_id}</span>
                                <span className="ml-2 font-semibold text-blue-700">{formatCommercePrice(Number(sp.price))}</span>
                                <form action={removeCustomerProductPriceAction} className="ml-1">
                                  <input type="hidden" name="customer_id" value={customer.user_id} />
                                  <input type="hidden" name="product_id" value={sp.product_id} />
                                  <button className="text-red-400 hover:text-red-600">×</button>
                                </form>
                              </div>
                            );
                          })}
                          {customerSpecial.length > 3 && (
                            <p className="text-xs text-gray-500">+{customerSpecial.length - 3} özel fiyat daha</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">Müşteri bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
