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
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fiyat Listeleri</h1>
        <p className="mt-1 text-gray-500">Bayi/toptancı/perakende fiyat listeleri ve toplu fiyat güncelleme.</p>
      </div>

      {/* Yeni liste */}
      <div className="mb-6 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <h2 className="mb-4 font-semibold text-gray-900">Yeni Fiyat Listesi</h2>
        <form action={savePriceListAction} className="grid gap-4 sm:grid-cols-4">
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
        </form>
      </div>

      {/* Toplu fiyat değişikliği */}
      <div className="mb-6 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <h2 className="mb-4 font-semibold text-gray-900">Toplu Fiyat Değişikliği</h2>
        <form action={bulkUpdatePricesAction} className="grid gap-4 sm:grid-cols-5">
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
            <Button className="bg-amber-500 hover:bg-amber-600">Uygula</Button>
          </div>
        </form>
      </div>

      {/* Listeler */}
      <div className="space-y-4">
        {lists.map((list) => {
          const listItems = items.filter((i) => i.price_list_id === list.id);
          return (
            <div key={list.id} className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{list.name}</h3>
                  <p className="text-xs text-gray-500">
                    {list.code}
                    {list.is_default && ' · Varsayılan'}
                    {list.is_active ? ' · Aktif' : ' · Pasif'}
                  </p>
                </div>
                <form action={deletePriceListAction}>
                  <input type="hidden" name="id" value={list.id} />
                  <button className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Sil</button>
                </form>
              </div>
              <div className="p-5">
                <form action={savePriceListItemAction} className="mb-3 grid gap-2 sm:grid-cols-4">
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
                </form>
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
                              <form action={removePriceListItemAction} className="inline">
                                <input type="hidden" name="id" value={item.id} />
                                <button className="text-xs font-medium text-red-500 hover:underline">Kaldır</button>
                              </form>
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
