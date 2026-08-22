'use client';

import { Heart, MapPin, PackageCheck, ReceiptText, RotateCcw, UserRound, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getActiveCustomerNavigationHref } from '@/lib/customer/navigation';
import { cn } from '@/lib/utils';

const accountLinks = [
  { href: '/hesabim/cari', label: 'Cari Hesabım', icon: WalletCards },
  { href: '/hesabim/siparislerim', label: 'Siparişlerim', icon: PackageCheck },
  { href: '/hesabim/favorilerim', label: 'Favorilerim', icon: Heart },
  { href: '/hesabim/iadelerim', label: 'İadelerim', icon: RotateCcw },
  { href: '/hesabim/faturalarim', label: 'Faturalarım', icon: ReceiptText },
  { href: '/hesabim/adreslerim', label: 'Adreslerim', icon: MapPin },
  { href: '/hesabim/profil', label: 'Profilim', icon: UserRound },
] as const;

export function AccountNavigation() {
  const pathname = usePathname();
  const activeHref = getActiveCustomerNavigationHref(pathname, accountLinks.map((item) => item.href));

  return (
    <nav className="overflow-x-auto px-3 py-3 sm:px-5" aria-label="Hesabım menüsü">
      <div className="grid min-w-[780px] grid-cols-7 gap-2">
        {accountLinks.map(({ href, label, icon: Icon }) => {
          const isActive = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                  : 'border-transparent text-[#475569] hover:border-[#cbd5e1] hover:bg-sky-50 hover:text-[#0284c7]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
