import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, Clock3, XCircle } from "lucide-react";
import { requireCustomerSession } from "@/lib/commerce/queries";
import { formatCommercePrice } from "@/lib/commerce/format";
import { getPaymentAttemptContext, getPaymentAttemptDisplayData } from "@/lib/payments/gateway";
import OrderCompletionClient from "../OrderCompletionClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sipariş Sonucu | İZNİKON" };

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string | string[] }>;
}) {
  const session = await requireCustomerSession("/odeme/sonuc");
  const params = await searchParams;
  const attemptId = Array.isArray(params.attempt) ? params.attempt[0] : params.attempt;

  if (!attemptId) notFound();

  const context = await getPaymentAttemptContext(attemptId);
  if (context.attempt.user_id !== session.user.id) notFound();

  const display = getPaymentAttemptDisplayData(context);
  const paid = display.status === "paid";
  const failed = display.status === "failed";
  const accountCharged = display.isAccountCharge && !failed;
  const Icon = paid || accountCharged ? BadgeCheck : failed ? XCircle : Clock3;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <OrderCompletionClient />
      <section className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl md:p-10">
        <div className={`grid h-16 w-16 place-items-center rounded-2xl ${paid || accountCharged ? "bg-emerald-50 text-emerald-600" : failed ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-sky-600">Sipariş {display.orderNumber}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{accountCharged ? 'Sipariş cari hesabınıza işlendi' : paid ? "Ödemeniz alındı" : failed ? "Ödeme tamamlanamadı" : "Siparişiniz oluşturuldu"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {accountCharged ? 'Sipariş tutarı cari bakiyenize borç olarak kaydedildi ve kullanılabilir limitiniz güncellendi.' : paid ? "Ödemeniz doğrulandı ve siparişiniz işleme alındı." : failed ? "Ödeme sonucu başarısız görünüyor. Sipariş detayından tekrar destek alabilirsiniz." : "Ödemeniz bekleniyor. Aşağıdaki yöntemin talimatlarını takip edin."}
        </p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <div className="flex justify-between text-sm"><span className="text-slate-500">Ödeme yöntemi</span><strong>{display.providerName}</strong></div>
          <div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Toplam</span><strong className="text-lg text-sky-700">{formatCommercePrice(display.total)}</strong></div>
          {display.instructions && <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">{display.instructions}</p>}
        </div>
        {(display.bankDetails.bankName || display.bankDetails.iban) && (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
            <div className="flex items-center gap-2 font-black"><Building2 className="h-5 w-5" /> Havale bilgileri</div>
            {display.bankDetails.bankName && <p className="mt-3">Banka: {display.bankDetails.bankName}</p>}
            {display.bankDetails.accountOwner && <p className="mt-1">Hesap sahibi: {display.bankDetails.accountOwner}</p>}
            {display.bankDetails.iban && <p className="mt-1 break-all font-mono font-bold">{display.bankDetails.iban}</p>}
          </div>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/hesabim/siparislerim" className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white">Siparişlerimi görüntüle</Link>
          <Link href="/" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700">Mağazaya dön</Link>
        </div>
      </section>
    </main>
  );
}
