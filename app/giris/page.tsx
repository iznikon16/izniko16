import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, Boxes, CircleDollarSign, ShieldCheck } from 'lucide-react';
import { CustomerLoginForm } from '@/components/storefront/customer-login-form';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import { getCustomerSession } from '@/lib/commerce/queries';
import { SafeImage } from '@/components/ui/safe-image';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Müşteri Girişi | İZNİKON',
  description: 'İZNİKON müşteri hesabınıza güvenli biçimde giriş yapın.',
};

const benefits = [
  { icon: CircleDollarSign, text: 'Size özel bayi fiyatlarını görüntüleyin' },
  { icon: Boxes, text: 'Sipariş ve cari hareketlerinizi takip edin' },
  { icon: BadgeCheck, text: 'Doğrulanmış hesapla güvenli işlem yapın' },
];

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; sifre?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = getSafeCustomerRedirectPath(requestedNext);
  const session = await getCustomerSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_36%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="group inline-flex items-center gap-3" aria-label="İZNİKON ana sayfası">
            <SafeImage src="/logo.png" alt="İZNİKON" className="h-11 w-auto transition group-hover:scale-105" />
            <span className="hidden border-l border-slate-700 pl-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 sm:inline">
              Müşteri Portalı
            </span>
          </Link>
          <Link href="/" className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-amber-500 hover:text-amber-400">
            Mağazaya dön
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Güvenli müşteri girişi
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              İşinizi hızlandıran <span className="text-amber-400">İZNİKON</span> hesabınız
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Cari bakiyenizi, hesap ekstrenizi ve işletmenize özel fiyatları tek güvenli oturumdan yönetin.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm font-semibold leading-6 text-slate-200 backdrop-blur">
                  <Icon className="mb-3 h-5 w-5 text-amber-400" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-950 shadow-2xl shadow-black/30 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Müşteri hesabı</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Giriş Yap</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Kayıtlı e-posta adresiniz ve şifrenizle devam edin.</p>
            {params.sifre === 'degisti' ? <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</div> : null}
            <div className="mt-7">
              <CustomerLoginForm nextPath={nextPath} />
            </div>
            <div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
              Henüz bayi hesabınız yok mu?{' '}
              <Link href="/toptan-musteri-ol" className="font-black text-amber-700 hover:underline">
                Toptan müşteri olun
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
