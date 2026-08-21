import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCheckoutPaymentMethods } from "@/lib/admin/commerce-queries";
import { getStoredGuestCartItems } from "@/lib/commerce/guest-cart";
import { getCart, getCustomerAddresses, requireCustomerSession } from "@/lib/commerce/queries";
import { serializeCommerceCart } from "@/lib/commerce/snapshot";
import { getCheckoutAccountStatus } from '@/lib/accounting/checkout';
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Güvenli Ödeme | İZNİKON",
};

export default async function CheckoutPage() {
  const session = await requireCustomerSession("/odeme");
  const guestItems = await getStoredGuestCartItems();
  const [cart, addresses, paymentMethods] = await Promise.all([
    getCart(session.user.id, undefined, guestItems),
    getCustomerAddresses(session.user.id),
    getCheckoutPaymentMethods(),
  ]);

  if (cart.lines.length === 0) redirect("/sepet");

  const accountStatus = paymentMethods.some((method) => method.code === 'cari-bakiye')
    ? await getCheckoutAccountStatus(session.user.id, cart.total)
    : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div><Link href="/" className="text-lg font-black text-slate-950">İZNİKON</Link><p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Güvenli ödeme</p></div>
          <Link href="/sepet" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">Sepete dön</Link>
        </div>
        <CheckoutForm
          addresses={addresses}
          cart={serializeCommerceCart(cart)}
          checkoutIdempotencyKey={randomUUID()}
          customer={{
            email: session.profile.email || session.user.email || "",
            fullName: session.profile.full_name,
            phone: session.profile.phone,
          }}
          paymentMethods={paymentMethods}
          accountStatus={accountStatus}
        />
      </div>
    </main>
  );
}
