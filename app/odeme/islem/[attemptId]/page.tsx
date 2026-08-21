import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCustomerSession } from "@/lib/commerce/queries";
import { getPaymentAttemptContext, getPaymentAttemptDisplayData } from "@/lib/payments/gateway";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Güvenli Kart Ödemesi | İZNİKON" };

export default async function PaymentProcessPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await requireCustomerSession("/odeme");
  const { attemptId } = await params;
  const context = await getPaymentAttemptContext(attemptId);

  if (context.attempt.user_id !== session.user.id) notFound();
  const display = getPaymentAttemptDisplayData(context);
  if (!display.iframeUrl) notFound();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-4 shadow-2xl md:p-7">
        <h1 className="text-xl font-black text-slate-950">Güvenli kart ödemesi</h1>
        <p className="mt-1 text-sm text-slate-500">Sipariş {display.orderNumber} · {display.providerName}</p>
        <iframe title={`${display.providerName} güvenli ödeme`} src={display.iframeUrl} className="mt-6 min-h-[680px] w-full rounded-2xl border border-slate-200" sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation-by-user-activation" />
      </div>
    </main>
  );
}
