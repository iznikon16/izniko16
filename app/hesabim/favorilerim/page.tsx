import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { addToCartAction, toggleFavoriteAction } from '@/lib/commerce/actions';
import { getFavoriteProducts, getProductHref, requireCustomerSession } from '@/lib/commerce/queries';

export const metadata: Metadata = { title: 'Favorilerim | İZNİKON' };
export const dynamic = 'force-dynamic';

export default async function CustomerFavoritesPage() {
  const session = await requireCustomerSession('/hesabim/favorilerim');
  const products = await getFavoriteProducts(session.user.id);

  return (
    <div>
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Kayıtlı ürünler</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Favorilerim</h1><p className="mt-2 text-sm text-slate-600">Daha sonra incelemek istediğiniz ürünlere hızlıca ulaşın.</p></div>
      {products.length === 0 ? (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><Heart className="mx-auto h-11 w-11 text-slate-300" /><h2 className="mt-4 text-xl font-black text-slate-900">Favori listeniz boş</h2><p className="mt-2 text-sm text-slate-500">Beğendiğiniz ürünleri favorilere ekleyerek burada saklayabilirsiniz.</p><Link href="/" className="mt-5 inline-flex rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white">Ürünleri keşfet</Link></div></section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Link href={getProductHref(product)} className="relative block aspect-[4/3] bg-slate-50"><Image src={product.featuredImageUrl || '/logo.png'} alt={product.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-contain p-5" /></Link>
              <div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{product.sku}</p><Link href={getProductHref(product)} className="mt-2 block line-clamp-2 min-h-12 font-black text-slate-900 hover:text-sky-700">{product.title}</Link><p className="mt-3 text-lg font-black text-sky-700">{product.priceLabel}</p>
                <div className="mt-5 flex gap-2">
                  <form action={addToCartAction} className="flex-1"><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="quantity" value="1" /><input type="hidden" name="redirect_to" value="/hesabim/favorilerim" /><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-sm font-black text-white hover:bg-sky-800"><ShoppingCart className="h-4 w-4" />Sepete ekle</button></form>
                  <form action={toggleFavoriteAction}><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="redirect_to" value="/hesabim/favorilerim" /><button type="submit" title="Favorilerden çıkar" className="grid h-11 w-11 place-items-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"><Heart className="h-5 w-5 fill-current" /></button></form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
