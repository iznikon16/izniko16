import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Image from 'next/image';
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Store } from 'lucide-react';
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
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex w-fit items-center gap-4" aria-label="İznikon mağaza ana sayfası">
              <Image src="/logo.png" alt="İznikon Nalbur ve Hırdavat" width={1024} height={712} priority className="h-16 w-auto object-contain" />
              <span className="border-l border-slate-200 pl-4"><strong className="block text-sm font-black text-slate-950">Güvenli Ödeme</strong><span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Şifreli ve doğrulanmış işlem</span></span>
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"><Store className="h-4 w-4" />Mağazaya Dön</Link>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-semibold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" />Teslimat ve ödeme bilgilerinizi güvenle tamamlayın.</div>
        </header>
        <CheckoutForm
          addresses={addresses}
          cart={serializeCommerceCart(cart)}
          checkoutIdempotencyKey={randomUUID()}
          customer={{
            accountType: session.profile.account_type,
            companyTitle: session.profile.company_title,
            email: session.profile.email || session.user.email || "",
            fullName: session.profile.full_name,
            phone: session.profile.phone,
            taxNumber: session.profile.tax_number,
            taxOffice: session.profile.tax_office,
          }}
          paymentMethods={paymentMethods}
          accountStatus={accountStatus}
        />
      </div>
    </main>
  );
}
