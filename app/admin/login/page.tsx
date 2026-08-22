import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LockKeyhole, ShieldCheck, Zap, Boxes } from 'lucide-react';
import { LoginForm } from '@/components/admin/login-form';
import { getAdminSession } from '@/lib/auth/admin';
import { SafeImage } from '@/components/ui/safe-image';

export const metadata = {
  title: 'Yönetici & Bayi Girişi | İZNİKON',
};

const loginHighlights = [
  {
    icon: Boxes,
    title: '10.000+ Stoklu Ürün Kataloğu',
    description: 'Cıvata, somun, elektrik, tesisat ve el aletleri stokları anlık kontrol edilir.',
  },
  {
    icon: Zap,
    title: 'Hızlı Toptan Sipariş & Sevkiyat',
    description: 'Siparişler anında depoya düşer, ambar ve kargo süreçleri canlı takip edilir.',
  },
  {
    icon: ShieldCheck,
    title: 'Güvenli Bayi & Yönetici Yetkisi',
    description: '256-Bit SSL korumalı şifrelenmiş altyapı ile güvenli oturum yönetimi.',
  },
];

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-[#090e1a] text-white font-sans selection:bg-amber-500/30 selection:text-indigo-200">
      {/* Background Decorator */}
      <div className="relative overflow-hidden min-h-screen flex flex-col justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.15),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(15,23,42,0.9),#090e1a)]" />
        <div className="absolute inset-0 opacity-[0.4] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* TOP BRAND HEADER */}
        <header className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <SafeImage src="/logo.png" alt="İZNİKON Logo" width={1024} height={682} className="h-10 w-auto transition-transform group-hover:scale-105" />
            <span className="hidden sm:inline-block border-l border-slate-800/60 pl-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
              B2B Toptan Portalı
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0f172a]/80 px-4 py-2 text-xs font-bold text-slate-200 backdrop-blur-md transition-all hover:border-amber-500 hover:text-amber-500"
          >
            &lsaquo; Mağazaya Dön
          </Link>
        </header>

        {/* MAIN HERO SPLIT */}
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-12 lg:py-16">
          {/* LEFT HERO SHOWCASE */}
          <section className="flex flex-col justify-center lg:col-span-7">
            <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-500">
                İZNİKON YÖNETİM &amp; BAYİ PANELİ
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Nalbur &amp; Hırdavat Toptancılığında <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600">Dijital Güç</span>
            </h1>

            <p className="mt-5 text-base text-slate-400 sm:text-lg leading-relaxed max-w-2xl">
              Toptan ürün kataloğunuzu, cari bayilerinizi, siparişlerinizi ve fiyat listelerinizi yüksek performanslı İZNİKON yönetim paneli üzerinden kontrol edin.
            </p>

            {/* HIGHLIGHT CARDS GRID */}
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {loginHighlights.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="group rounded-2xl border border-slate-800/60 bg-[#0f172a]/80 p-5 backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-[#0f172a]/80"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-white tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{description}</p>
                </article>
              ))}
            </div>
          </section>

          {/* RIGHT LOGIN CARD */}
          <section className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-slate-800/60 bg-[#0f172a]/80 p-8 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl relative overflow-hidden">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-blue-400 to-amber-500" />

              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-500">
                    GÜVENLİ GİRİŞ PORTALI
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white">Yönetici Girişi</h2>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-8">
                Lütfen İZNİKON sistem yetkili bilgilerinizi giriniz.
              </p>

              <LoginForm />

              <div className="mt-8 border-t border-slate-800/60 pt-5 text-center">
                <p className="text-xs text-slate-500">
                  Bayilik başvurusu yapmak mı istiyorsunuz?{' '}
                  <Link href="/toptan-musteri-ol" className="font-bold text-amber-500 hover:underline">
                    Bayi Olun &rsaquo;
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* BOTTOM FOOTER */}
        <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 py-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; 2026 <strong>İZNİKON Nalbur &amp; Hırdavat Toptancısı A.Ş.</strong> Tüm hakları saklıdır.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/iletisim" className="hover:text-amber-500 transition-colors">Destek &amp; İletişim</Link>
            <Link href="/toptan-musteri-ol" className="hover:text-amber-500 transition-colors">Toptan Bayilik</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}


