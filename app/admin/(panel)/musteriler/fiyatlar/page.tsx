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
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { BadgeTurkishLira, Users } from 'lucide-react';

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
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Fiyatlandırma</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Müşteri Fiyatları</h1>
        <p className="mt-2 text-sm text-slate-500">Müşteri bazında fiyat listesi, özel indirim ve özel ürün fiyatı yönetimi.</p>
        <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><Users className="size-5 text-sky-500" /><span className="font-medium text-slate-700">{customers.length} müşteri</span></div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                      <ToastActionForm action={assignCustomerPriceListAction} successMessage="Müşteri fiyat listesi güncellendi." errorMessage="Müşteri fiyat listesi güncellenemedi." className="flex items-center gap-2">
                        <input type="hidden" name="customer_id" value={customer.user_id} />
                        <select name="price_list_id" defaultValue={assignedListId ?? ''} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs">
                          <option value="">Yok</option>
                          {lists.map((list) => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                          ))}
                        </select>
                        <button className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50">Ata</button>
                      </ToastActionForm>
                    </td>
                    <td className="px-4 py-3">
                      <ToastActionForm action={saveCustomerDiscountAction} successMessage="Müşteri indirimi güncellendi." errorMessage="Müşteri indirimi güncellenemedi." className="flex items-center gap-2">
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
                        <button aria-label="İndirimi kaydet" className="grid size-8 place-items-center rounded-lg bg-sky-500 text-white transition hover:bg-sky-600"><BadgeTurkishLira className="size-4" /></button>
                      </ToastActionForm>
                    </td>
                    <td className="px-4 py-3">
                      <ToastActionForm action={saveCustomerProductPriceAction} successMessage="Müşteriye özel fiyat kaydedildi." errorMessage="Müşteriye özel fiyat kaydedilemedi." className="mb-2 grid grid-cols-[1fr_90px_auto] gap-1">
                        <input type="hidden" name="customer_id" value={customer.user_id} />
                        <select name="product_id" className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                          <option value="">Ürün seç</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                        <input type="number" name="price" step="0.01" min="0" placeholder="₺" className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-right" />
                        <button className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600">Ekle</button>
                      </ToastActionForm>
                      {customerSpecial.length > 0 && (
                        <div className="space-y-1">
                          {customerSpecial.slice(0, 3).map((sp) => {
                            const product = products.find((p) => p.id === sp.product_id);
                            return (
                              <div key={sp.id} className="flex items-center justify-between rounded bg-sky-50/60 px-2 py-1 text-xs">
                                <span className="truncate text-gray-600">{product?.title || sp.product_id}</span>
                                <span className="ml-2 font-semibold text-sky-600">{formatCommercePrice(Number(sp.price))}</span>
                                <ToastActionForm action={removeCustomerProductPriceAction} successMessage="Özel fiyat kaldırıldı." errorMessage="Özel fiyat kaldırılamadı." className="ml-1">
                                  <input type="hidden" name="customer_id" value={customer.user_id} />
                                  <input type="hidden" name="product_id" value={sp.product_id} />
                                  <button className="text-rose-400 hover:text-rose-600">×</button>
                                </ToastActionForm>
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
