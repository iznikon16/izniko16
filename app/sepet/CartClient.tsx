"use client";

import Link from "next/link";
import { CreditCard, Minus, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { prepareCheckoutAction } from "@/lib/commerce/actions";
import { StorefrontAccountAction } from "@/components/storefront/storefront-account-action";
import { useCart } from "@/context/CartContext";
import { useEffect } from "react";
import { syncCartPricesAction } from "@/lib/commerce/actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
}

export default function CartClient({
  isAuthenticated,
}: {
  customerDisplayName?: string;
  isAuthenticated: boolean;
}) {
  const {
    cart,
    clearCart,
    isHydrated,
    itemCount,
    removeFromCart,
    subtotal,
    total,
    updateQuantity,
    updatePrice,
    vatAmount,
  } = useCart();
  const serverCartPayload = JSON.stringify(
    cart.map((item) => ({ productId: String(item.id), quantity: item.quantity }))
  );

  useEffect(() => {
    if (!isAuthenticated || !isHydrated || cart.length === 0) return;

    let isMounted = true;
    const syncPrices = async () => {
      try {
        const productIds = cart.map(item => String(item.id));
        const updatedPrices = await syncCartPricesAction(productIds);

        if (!isMounted) return;

        updatedPrices.forEach(updated => {
          const item = cart.find(c => String(c.id) === updated.id);
          if (item && updated.customerPrice !== null && updated.customerPrice !== item.numericPrice) {
             updatePrice(item.id, updated.customerPrice);
          }
        });
      } catch (err) {
        console.error("Fiyat güncelleme hatası:", err);
      }
    };

    syncPrices();

    return () => { isMounted = false; };
  // We intentionally omit cart and updatePrice to avoid infinite loops, we only want to sync once when cart is loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isHydrated]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-white/10 bg-slate-950 text-white">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="İZNİKON ana sayfası">
            {/* eslint-disable-next-line @next/next/no-img-element -- storefront logo keeps its native aspect ratio */}
            <img src="/logo.png" alt="İZNİKON" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <StorefrontAccountAction
              isAuthenticated={isAuthenticated}
              nextPath="/sepet"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold leading-none text-white transition-colors hover:bg-white/10"
            />
            <Link href="/" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold leading-none text-white transition-colors hover:bg-white/10">
              Alışverişe devam et
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-600">Güvenli sepet</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Siparişinizi gözden geçirin</h1>
            <p className="mt-2 text-sm text-slate-600">Ödeme öncesinde fiyat ve stok bilgileri sunucuda yeniden doğrulanır.</p>
          </div>
          {cart.length > 0 && (
            <button type="button" onClick={clearCart} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Sepeti temizle
            </button>
          )}
        </div>

        {!isHydrated ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">Sepet yükleniyor…</div>
        ) : cart.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <ShoppingCart className="mx-auto h-14 w-14 text-slate-300" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-black text-slate-900">Sepetiniz boş</h2>
            <p className="mt-2 text-sm text-slate-500">Katalogdan ürün ekleyerek güvenli sipariş akışına başlayabilirsiniz.</p>
            <Link href="/" className="mt-6 inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">
              Ürünlere dön
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-3" aria-label="Sepet ürünleri">
              {cart.map((item) => (
                <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- legacy catalog images may come from configured supplier URLs */}
                  <img src={item.img || "/logo.png"} alt="" className="h-24 w-24 rounded-xl bg-slate-100 object-contain p-2" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.code} · {item.unit}</p>
                    <p className="mt-3 text-sm font-black text-sky-700">{formatCurrency(item.numericPrice)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button type="button" disabled={item.quantity <= item.minimumOrderQuantity} aria-label={`${item.name} adedini azalt`} onClick={() => updateQuantity(item.id, item.quantity - 1)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-black">{item.quantity}</span>
                      <button type="button" aria-label={`${item.name} adedini artır`} onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="w-28 text-right text-sm font-black text-slate-900">{formatCurrency(item.numericPrice * item.quantity)}</p>
                    <button type="button" aria-label={`${item.name} ürününü sepetten çıkar`} onClick={() => removeFromCart(item.id)} className="grid h-10 w-10 place-items-center rounded-xl text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.minimumOrderQuantity > 1 ? <p className="text-xs font-semibold text-amber-700">Minimum: {item.minimumOrderQuantity} adet</p> : null}
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-lg font-black text-slate-950">Sipariş özeti</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Ürün adedi</dt><dd className="font-bold">{itemCount}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">KDV dahil ara toplam</dt><dd className="font-bold">{formatCurrency(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Dahil olan KDV</dt><dd className={`font-bold ${vatAmount == null ? 'text-amber-700' : ''}`}>{vatAmount == null ? 'Ödemede doğrulanacak' : formatCurrency(vatAmount)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-4 text-lg"><dt className="font-black">Toplam</dt><dd className="font-black text-sky-700">{formatCurrency(total)}</dd></div>
              </dl>

              <form action={prepareCheckoutAction} className="mt-6">
                <input type="hidden" name="guest_cart" value={serverCartPayload} />
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-600/20 hover:bg-sky-700">
                  <CreditCard className="h-5 w-5" aria-hidden="true" /> Güvenli ödemeye geç
                </button>
              </form>
              {!isAuthenticated && (
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">Ödeme adımında güvenli müşteri hesabı oluşturmanız istenir.</p>
              )}
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Fiyat, müşteri yetkisi, risk limiti ve ödeme yöntemi sunucu tarafında doğrulanır.
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
