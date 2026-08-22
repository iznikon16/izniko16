import Link from 'next/link';
import { Heart, LogOut, MapPin, PackageCheck, ReceiptText, RotateCcw, Store, UserRound, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { signOutCustomerAction } from '@/lib/commerce/actions';
import { requireCustomerSession } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountLayout({ children }: { children: ReactNode }) {
  const session = await requireCustomerSession('/hesabim/cari');
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-lg font-bold text-slate-900">İZNİKON</Link>
            <p className="mt-1 text-xs text-slate-500">{session.profile.full_name || session.profile.email}</p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Hesabım menüsü">
            <Link
              href="/hesabim/cari"
              className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700"
            >
              <WalletCards className="h-4 w-4" aria-hidden="true" />
              Cari Hesabım
            </Link>
            <Link
              href="/hesabim/siparislerim"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              Siparişlerim
            </Link>
            <Link href="/hesabim/favorilerim" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <Heart className="h-4 w-4" aria-hidden="true" />Favorilerim
            </Link>
            <Link href="/hesabim/iadelerim" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />İadelerim
            </Link>
            <Link href="/hesabim/faturalarim" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <ReceiptText className="h-4 w-4" aria-hidden="true" />Faturalarım
            </Link>
            <Link href="/hesabim/adreslerim" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <MapPin className="h-4 w-4" aria-hidden="true" />Adreslerim
            </Link>
            <Link href="/hesabim/profil" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <UserRound className="h-4 w-4" aria-hidden="true" />Profilim
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Mağazaya Dön
            </Link>
            <form action={signOutCustomerAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Çıkış Yap
              </button>
            </form>
          </nav>
        </div>
        {children}
      </div>
    </main>
  );
}
