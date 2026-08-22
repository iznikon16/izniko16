import Image from 'next/image';
import Link from 'next/link';
import { LogOut, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { AccountNavigation } from '@/components/customer/account-navigation';
import { signOutCustomerAction } from '@/lib/commerce/actions';
import { requireCustomerSession } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountLayout({ children }: { children: ReactNode }) {
  const session = await requireCustomerSession('/hesabim/cari');
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 md:py-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center">
            <Link href="/" className="flex w-fit shrink-0 items-center gap-3" aria-label="İznikon mağaza ana sayfası">
              <Image
                src="/logo.png"
                alt="İznikon Nalbur ve Hırdavat"
                width={1024}
                height={712}
                priority
                className="h-16 w-auto object-contain"
              />
              <span className="hidden border-l border-slate-200 pl-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">
                Müşteri Paneli
              </span>
            </Link>

            <div className="min-w-0 lg:border-l lg:border-slate-200 lg:pl-5">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session.profile.full_name || 'Değerli Müşterimiz'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{session.profile.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
              <Link
                href="/"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                Mağazaya Dön
              </Link>
              <form action={signOutCustomerAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Çıkış Yap
                </button>
              </form>
            </div>
          </div>
          <AccountNavigation />
        </header>
        {children}
      </div>
    </main>
  );
}
