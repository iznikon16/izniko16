import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PriceListRow, PriceListItemRow, ProductRow } from '@/lib/catalog/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import {
  savePriceListAction,
  deletePriceListAction,
  savePriceListItemAction,
  removePriceListItemAction,
  bulkUpdatePricesAction,
} from '@/app/admin/(panel)/pricing/actions';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { ArrowLeftRight, ListPlus, ListTree } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PriceListsPage() {
  await requireAdminSession();
  const supabase = createAdminClient();

  const [listsRes, itemsRes, productsRes] = await Promise.all([
    supabase.from('price_lists').select('*').order('name', { ascending: true }),
    supabase.from('price_list_items').select('*'),
    supabase.from('products').select('id, title, sku, price').order('title', { ascending: true }).limit(300),
  ]);

  if (listsRes.error) throw new Error(listsRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const lists = (listsRes.data ?? []) as PriceListRow[];
  const items = (itemsRes.data ?? []) as PriceListItemRow[];
  const products = (productsRes.data ?? []) as Pick<ProductRow, 'id' | 'title' | 'sku' | 'price'>[];

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Fiyatlandırma</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Fiyat Listeleri</h1><p className="mt-2 text-sm text-slate-500">Bayi, toptancı ve perakende fiyat listelerini güvenli biçimde yönetin.</p></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"><ListTree className="size-6 text-sky-500" /><div><p className="text-2xl font-semibold text-slate-950">{lists.length}</p><p className="text-xs text-slate-500">fiyat listesi</p></div></div>
      </header>

      {/* Yeni liste */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-900"><ListPlus className="size-5 text-sky-500" /> Yeni Fiyat Listesi</h2>
        <ToastActionForm action={savePriceListAction} successMessage="Fiyat listesi oluşturuldu." errorMessage="Fiyat listesi oluşturulamadı." className="grid gap-4 sm:grid-cols-4">
          <input type="hidden" name="id" value="" />
          <Input type="text" name="name" required placeholder="Liste adı (örn. Bayi A)" />
          <Input type="text" name="code" required placeholder="Kod (örn. BAYIA)" />
          <div className="flex items-center gap-2">
            <Checkbox name="is_default" id="is_default" />
            <Label htmlFor="is_default" className="cursor-pointer">Varsayılan</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox name="is_active" id="is_active" defaultChecked />
            <Label htmlFor="is_active" className="cursor-pointer">Aktif</Label>
          </div>
          <div className="flex justify-end sm:col-span-4">
            <Button>Oluştur</Button>
          </div>
        </ToastActionForm>
      </section>

      {/* Toplu fiyat değişikliği */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-900"><ArrowLeftRight className="size-5 text-amber-500" /> Toplu Fiyat Değişikliği</h2>
        <ToastActionForm action={bulkUpdatePricesAction} successMessage="Toplu fiyat değişikliği uygulandı." errorMessage="Toplu fiyat değişikliği uygulanamadı." className="grid gap-4 sm:grid-cols-5">
          <Input
            type="text"
            name="product_ids"
            required
            placeholder="Ürün ID'leri (virgülle)"
            className="sm:col-span-2"
          />
          <Select name="mode">
            <option value="percent">Yüzde (%)</option>
            <option value="fixed">Sabit (₺)</option>
          </Select>
          <Select name="direction">
            <option value="increase">Artır</option>
            <option value="decrease">Azalt</option>
          </Select>
          <Input type="number" name="value" required step="0.01" min="0" placeholder="Değer" />
          <div className="flex justify-end sm:col-span-5">
            <Button>Uygula</Button>
          </div>
        </ToastActionForm>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Toplu değişiklik yalnızca girdiğiniz ürün kimliklerine uygulanır.</p>
      </section>

      {/* Listeler */}
      <div className="space-y-4">
        {lists.map((list) => {
          const listItems = items.filter((i) => i.price_list_id === list.id);
          return (
            <div key={list.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{list.name}</h3>
                  <p className="text-xs text-gray-500">
                    {list.code}
                    {list.is_default && ' · Varsayılan'}
                    {list.is_active ? ' · Aktif' : ' · Pasif'}
                  </p>
                </div>
                <ToastActionForm action={deletePriceListAction} successMessage="Fiyat listesi silindi." errorMessage="Fiyat listesi silinemedi.">
                  <input type="hidden" name="id" value={list.id} />
                  <button className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Sil</button>
                </ToastActionForm>
              </div>
              <div className="p-5">
                <ToastActionForm action={savePriceListItemAction} successMessage="Ürün fiyat listesine eklendi." errorMessage="Ürün fiyat listesine eklenemedi." className="mb-3 grid gap-2 sm:grid-cols-4">
                  <input type="hidden" name="price_list_id" value={list.id} />
                  <Select name="product_id" required className="sm:col-span-2">
                    <option value="">Ürün seç</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.sku})</option>
                    ))}
                  </Select>
                  <Input type="number" name="price" step="0.01" min="0" placeholder="Fiyat ₺" />
                  <Input type="number" name="discount_percent" step="0.01" min="0" placeholder="İndirim %" />
                  <div className="flex justify-end sm:col-span-4">
                    <Button>Ekle</Button>
                  </div>
                </ToastActionForm>
                {listItems.length > 0 && (
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {listItems.map((item) => {
                        const product = products.find((p) => p.id === item.product_id);
                        return (
                          <tr key={item.id}>
                            <td className="py-2 text-gray-700">{product?.title || item.product_id}</td>
                            <td className="py-2 text-right text-gray-600">
                              {item.price != null ? formatCommercePrice(Number(item.price)) : '—'}
                              {item.discount_percent != null && Number(item.discount_percent) > 0 && ` (%${item.discount_percent})`}
                            </td>
                            <td className="py-2 text-right">
                              <ToastActionForm action={removePriceListItemAction} successMessage="Ürün fiyat listesinden kaldırıldı." errorMessage="Ürün fiyat listesinden kaldırılamadı." className="inline">
                                <input type="hidden" name="id" value={item.id} />
                                <button className="text-xs font-medium text-rose-500 hover:underline">Kaldır</button>
                              </ToastActionForm>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {listItems.length === 0 && <p className="text-xs text-gray-500">Henüz ürün eklenmemiş.</p>}
              </div>
            </div>
          );
        })}
        {lists.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">Fiyat listesi oluşturulmadı.</div>
        )}
      </div>
    </div>
  );
}
