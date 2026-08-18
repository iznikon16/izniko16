'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  FileText,
  FolderTree,
  Handshake,
  Images,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Mail,
  Megaphone,
  MessageSquare,
  MessageSquareText,
  PackageSearch,
  PanelsTopLeft,
  Plug,
  ReceiptText,
  Send,
  ShoppingCart,
  Tags,
  UsersRound,
  WalletCards,
  Video,
  LogOut,
  AlertTriangle,
  Boxes,
  ArrowDownUp,
  TriangleAlert,
  FileCode,
  ClipboardList,
  Percent,
  Cloud,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type NavigationGroup = {
  icon: LucideIcon;
  items: NavigationItem[];
  key: string;
  label: string;
};

const panelLink: NavigationItem = { href: '/admin', label: 'Dashboard', icon: LayoutDashboard };

const navigationGroups: NavigationGroup[] = [
  {
    key: 'accounting',
    label: 'Ön Muhasebe',
    icon: Landmark,
    items: [
      { href: '/admin/accounting', label: 'Cari Hesaplar', icon: CircleDollarSign },
      { href: '/admin/accounting/tahsilatlar', label: 'Tahsilatlar', icon: ReceiptText },
      { href: '/admin/accounting/hareketler', label: 'Cari Hareketler', icon: ListOrdered },
      { href: '/admin/accounting/geciken-odemeler', label: 'Geciken Ödemeler', icon: AlertTriangle },
      { href: '/admin/accounting/ekstreler', label: 'Ekstreler', icon: FileText },
    ],
  },
  {
    key: 'stock',
    label: 'Stok',
    icon: Boxes,
    items: [
      { href: '/admin/stock', label: 'Stok Durumu', icon: Boxes },
      { href: '/admin/stock/hareketler', label: 'Stok Hareketleri', icon: ArrowDownUp },
      { href: '/admin/stock/kritik', label: 'Kritik Stok', icon: TriangleAlert },
    ],
  },
  {
    key: 'integrations',
    label: 'Entegrasyonlar',
    icon: Plug,
    items: [
      { href: '/admin/integrations/xml', label: 'XML Kaynakları', icon: FileCode },
      { href: '/admin/integrations/xml/aktarimlar', label: 'XML Aktarımları', icon: FileCode },
      { href: '/admin/integrations/netgsm', label: 'Netgsm', icon: MessageSquareText },
      { href: '/admin/integrations/odeal', label: 'Ödeal', icon: WalletCards },
    ],
  },
  {
    key: 'catalog',
    label: 'Katalog',
    icon: PackageSearch,
    items: [
      { href: '/admin/products', label: 'Ürünler', icon: PackageSearch },
      { href: '/admin/categories', label: 'Kategoriler', icon: FolderTree },
      { href: '/admin/brands', label: 'Markalar', icon: Tags },
      { href: '/admin/pricing', label: 'Fiyat Listeleri', icon: Percent },
    ],
  },
  {
    key: 'sales',
    label: 'Satış',
    icon: ShoppingCart,
    items: [
      { href: '/admin/orders', label: 'Siparişler', icon: ShoppingCart },
      { href: '/admin/inquiries', label: 'Talepler', icon: Inbox },
      { href: '/admin/payment-methods', label: 'Ödeme Yöntemleri', icon: WalletCards },
    ],
  },
  {
    key: 'customers',
    label: 'Müşteriler',
    icon: UsersRound,
    items: [
      { href: '/admin/customers', label: 'Kullanıcılar', icon: UsersRound },
      { href: '/admin/musteriler/fiyatlar', label: 'Müşteri Fiyatları', icon: Percent },
      { href: '/admin/references', label: 'Referanslar', icon: Handshake },
    ],
  },
  {
    key: 'management',
    label: 'Yönetim',
    icon: ClipboardList,
    items: [
      { href: '/admin/yonetim/audit', label: 'Audit Log', icon: ClipboardList },
      { href: '/admin/github-sync', label: 'Yedekleme Merkezi', icon: Cloud },
    ],
  },
  {
    key: 'marketing',
    label: 'Pazarlama',
    icon: Megaphone,
    items: [
      { href: '/admin/campaigns', label: 'Kampanyalar', icon: Megaphone },
      { href: '/admin/coupons', label: 'Kuponlar', icon: BadgePercent },
      { href: '/admin/mail', label: 'E-posta Ayarları', icon: Mail },
      { href: '/admin/marketing', label: 'Toplu Gönderim', icon: Send },
    ],
  },
  {
    key: 'content',
    label: 'İçerik',
    icon: Images,
    items: [
      { href: '/admin/media', label: 'Medya', icon: Images },
      { href: '/admin/home-slides', label: 'Ana Sayfa Slider', icon: PanelsTopLeft },
      { href: '/admin/home-video', label: 'Ana Sayfa Video', icon: Video },
      { href: '/admin/policies', label: 'Politikalar', icon: FileText },
    ],
  },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ isCollapsed = false, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isPanelActive = isNavigationItemActive(pathname, panelLink.href);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <aside className="flex h-full flex-col bg-white">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          {!isCollapsed && <span className="text-lg font-bold text-gray-900">Yedek Panel</span>}
        </div>
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <div className={cn("flex-1 overflow-y-auto py-4", isCollapsed ? "px-2" : "px-4")}>
        {/* Dashboard Link */}
        <Link
          href={panelLink.href}
          className={cn(
            'group mb-6 flex items-center rounded-xl transition-colors',
            isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3',
            isPanelActive
              ? 'bg-sky-50 text-sky-600'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <LayoutDashboard className={cn('h-5 w-5 shrink-0', isPanelActive ? 'text-sky-600' : 'text-sky-500')} />
          {!isCollapsed && <span className="font-semibold">{panelLink.label}</span>}
        </Link>

        {/* Groups */}
        <div className="flex flex-col gap-2">
          {navigationGroups.map(({ icon: GroupIcon, items, key, label }) => {
            const isOpen = openGroups[key] ?? false; // Default closed in this design

            return (
              <div key={key}>
                <button
                  onClick={() => {
                    if (isCollapsed) onToggle?.();
                    setOpenGroups((curr) => ({ ...curr, [key]: !isOpen }));
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50",
                    isCollapsed ? "justify-center px-0" : "justify-between px-4"
                  )}
                  title={isCollapsed ? label : undefined}
                >
                  <div className={cn("flex items-center", !isCollapsed && "gap-3")}>
                    <GroupIcon className="h-5 w-5 text-sky-500 shrink-0" />
                    {!isCollapsed && label}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={cn('h-4 w-4 text-gray-400 transition-transform shrink-0', isOpen ? 'rotate-180' : '')}
                    />
                  )}
                </button>

                {isOpen && !isCollapsed && (
                  <div className="mt-1 flex flex-col gap-1 pb-4 pl-11">
                    {items.map((item) => {
                      const isActive = isNavigationItemActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-sky-50 font-medium text-sky-600'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
        {isCollapsed ? (
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white p-3 text-gray-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 shrink-0" />
          </button>
        ) : (
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md">
            {/* Subtle gradient background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-amber-50/30 opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 text-white shadow-inner">
                  <span className="text-sm font-bold">AD</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">Admin</p>
                  <p className="truncate text-[11px] font-medium text-gray-500">Yönetici</p>
                </div>
              </div>
            </div>
            
            <div className="relative mt-4 flex items-center justify-between border-t border-gray-100/80 pt-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Sistem Aktif
              </div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-300">v1.1.0</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
