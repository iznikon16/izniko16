import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { LogoutButton } from '@/components/admin/logout-button';
import { requireAdminSession } from '@/lib/auth/admin';
import { MobileSidebar } from '@/components/admin/mobile-sidebar';
import { HeaderActions } from '@/components/admin/header-actions';

export async function AdminHeader() {
  await requireAdminSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 md:px-6">
      {/* Search & Mobile Menu */}
      <div className="flex items-center">
        <MobileSidebar />
        <div className="relative hidden sm:block">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Ara..."
            className="h-10 w-48 lg:w-64 rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          target="_blank"
          className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 md:flex"
        >
          <ExternalLink className="h-4 w-4 text-gray-500" />
          Vitrini Görüntüle
        </Link>
        {/* Badges */}
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            SİSTEM AKTİF <span className="font-normal opacity-70">v1.0.0</span>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-600">
            BETA AŞAMASINDADIR
          </div>
        </div>

        {/* Icons */}
        <HeaderActions />
        <div className="h-8 w-px bg-gray-200"></div>
        <LogoutButton />
      </div>
    </header>
  );
}
