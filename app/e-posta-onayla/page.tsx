import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle, BadgeCheck } from 'lucide-react';
import { verifyCustomerEmailToken } from '@/lib/mail/verification';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'E-posta Doğrulama | İZNİKON',
};

export default async function VerifyCustomerEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string | string[]; token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const currentStatus = Array.isArray(params.durum) ? params.durum[0] : params.durum;

  if (token) {
    let verificationStatus = 'hata';

    try {
      const result = await verifyCustomerEmailToken(token);
      verificationStatus = result.ok ? 'basarili' : 'gecersiz';
    } catch {
      verificationStatus = 'hata';
    }

    redirect(`/e-posta-onayla?durum=${verificationStatus}`);
  }

  const isSuccess = currentStatus === 'basarili';
  const message = isSuccess
    ? 'E-posta adresiniz doğrulandı. Artık müşteri hesabınıza giriş yapabilirsiniz.'
    : currentStatus === 'gecersiz'
      ? 'Bu doğrulama bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış.'
      : 'Doğrulama bağlantısı eksik ya da işlem tamamlanamadı.';

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl sm:p-10">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {isSuccess ? <BadgeCheck className="h-8 w-8" aria-hidden="true" /> : <AlertCircle className="h-8 w-8" aria-hidden="true" />}
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">
          {isSuccess ? 'E-posta doğrulandı' : 'Doğrulama tamamlanamadı'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <Link href="/giris" className="mt-7 inline-flex rounded-xl bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700">
          Giriş ekranına git
        </Link>
      </section>
    </main>
  );
}
