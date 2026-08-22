'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  TurkishLira,
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
  Boxes,
  ArrowDownUp,
  TriangleAlert,
  FileCode,
  ClipboardList,
  ShieldCheck,
  Percent,
  CalendarClock,
  CloudBackup,
  CreditCard,
  UserCog,
  UserRound,
  RotateCcw,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminLogoutAction } from './login-actions';
import { toast } from 'sonner';
import { SafeImage } from '@/components/ui/safe-image';
import { canViewAdminNavigationItem, getActiveAdminNavigationHref, isAdminNavigationHrefActive } from '@/lib/admin/navigation';
import { UserAvatar } from '@/components/ui/user-avatar';

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  permission?: string;
};

type NavigationGroup = {
  icon: LucideIcon;
  items: NavigationItem[];
  key: string;
  label: string;
};

const panelLink: NavigationItem = { href: '/admin', label: 'Dashboard', icon: LayoutDashboard };

const navigationGroups: NavigationGroup[] = [
  { key: 'catalog', label: 'Katalog', icon: PackageSearch, items: [
    { href: '/admin/products', label: 'Ürünler', icon: PackageSearch, permission: 'product.view' },
    { href: '/admin/categories', label: 'Kategoriler', icon: FolderTree, permission: 'product.view' },
    { href: '/admin/brands', label: 'Markalar', icon: Tags, permission: 'product.view' },
    { href: '/admin/pricing', label: 'Fiyat Listeleri', icon: Percent, permission: 'product.managePrice' },
  ] },
  { key: 'sales', label: 'Satış', icon: ShoppingCart, items: [
    { href: '/admin/orders', label: 'Siparişler', icon: ShoppingCart, permission: 'order.view' },
    { href: '/admin/returns', label: 'İade ve Geri Ödeme', icon: RotateCcw, permission: 'return.view' },
    { href: '/admin/invoices', label: 'Faturalar', icon: ReceiptText, permission: 'invoice.view' },
    { href: '/admin/inquiries', label: 'Talepler', icon: Inbox, permission: 'customer.view' },
    { href: '/admin/payment-methods', label: 'Ödeme Yöntemleri', icon: CreditCard, permission: 'settings.view' },
  ] },
  { key: 'customers', label: 'Müşteriler', icon: UsersRound, items: [
    { href: '/admin/customers', label: 'Müşteriler', icon: UsersRound, permission: 'customer.view' },
    { href: '/admin/musteriler/fiyatlar', label: 'Müşteri Fiyatları', icon: Percent, permission: 'customer.managePricing' },
    { href: '/admin/references', label: 'Referanslar', icon: Handshake, permission: 'customer.view' },
  ] },
  { key: 'accounting', label: 'Ön Muhasebe', icon: Landmark, items: [
    { href: '/admin/accounting', label: 'Cari Hesaplar', icon: TurkishLira, permission: 'account.view' },
    { href: '/admin/accounting/tahsilatlar', label: 'Tahsilatlar', icon: ReceiptText, permission: 'account.view' },
    { href: '/admin/accounting/hareketler', label: 'Cari Hareketler', icon: ListOrdered, permission: 'account.view' },
    { href: '/admin/accounting/geciken-odemeler', label: 'Geciken Ödemeler', icon: CalendarClock, permission: 'account.view' },
    { href: '/admin/accounting/ekstreler', label: 'Ekstreler', icon: FileText, permission: 'account.viewStatement' },
  ] },
  { key: 'stock', label: 'Stok', icon: Boxes, items: [
    { href: '/admin/stock', label: 'Stok Durumu', icon: Boxes, permission: 'product.manageStock' },
    { href: '/admin/stock/hareketler', label: 'Stok Hareketleri', icon: ArrowDownUp, permission: 'product.manageStock' },
    { href: '/admin/stock/kritik', label: 'Kritik Stok', icon: TriangleAlert, permission: 'product.manageStock' },
  ] },
  { key: 'integrations', label: 'Entegrasyonlar', icon: Plug, items: [
    { href: '/admin/integrations', label: 'Entegrasyon Durumu', icon: Activity, permission: 'settings.view' },
    { href: '/admin/integrations/xml', label: 'XML Kaynakları', icon: FileCode, permission: 'xml.view' },
    { href: '/admin/integrations/xml/aktarimlar', label: 'XML Aktarımları', icon: FileCode, permission: 'xml.view' },
    { href: '/admin/integrations/netgsm', label: 'Netgsm', icon: MessageSquareText, permission: 'settings.view' },
    { href: '/admin/integrations/odeal', label: 'Ödeal', icon: WalletCards, permission: 'settings.view' },
  ] },
  { key: 'reports', label: 'Raporlar', icon: BarChart3, items: [
    { href: '/admin/reports', label: 'Finansal Raporlar', icon: BarChart3, permission: 'report.view' },
  ] },
  { key: 'management', label: 'Yönetim', icon: ClipboardList, items: [
    { href: '/admin/yonetim/kullanicilar', label: 'Kullanıcı & Roller', icon: UserCog, permission: 'user.manage' },
    { href: '/admin/yonetim/roller', label: 'Roller ve Yetkiler', icon: ShieldCheck, permission: 'role.manage' },
    { href: '/admin/yonetim/audit', label: 'Audit Log', icon: ClipboardList, permission: 'audit.view' },
    { href: '/admin/github-sync', label: 'Yedekleme Merkezi', icon: CloudBackup, permission: 'settings.view' },
  ] },
  { key: 'settings', label: 'Ayarlar', icon: Mail, items: [
    { href: '/admin/profil', label: 'Profilim', icon: UserRound },
    { href: '/admin/mail', label: 'SMTP & E-posta', icon: Mail, permission: 'settings.view' },
  ] },
  { key: 'marketing', label: 'Pazarlama', icon: Megaphone, items: [
    { href: '/admin/campaigns', label: 'Kampanyalar', icon: Megaphone, permission: 'marketing.manage' },
    { href: '/admin/coupons', label: 'Kuponlar', icon: BadgePercent, permission: 'marketing.manage' },
    { href: '/admin/marketing', label: 'Toplu Gönderim', icon: Send, permission: 'marketing.manage' },
  ] },
  { key: 'content', label: 'İçerik', icon: Images, items: [
    { href: '/admin/media', label: 'Medya', icon: Images, permission: 'product.view' },
    { href: '/admin/home-slides', label: 'Ana Sayfa Slider', icon: PanelsTopLeft, permission: 'marketing.manage' },
    { href: '/admin/home-video', label: 'Ana Sayfa Video', icon: Video, permission: 'marketing.manage' },
    { href: '/admin/policies', label: 'Politikalar', icon: FileText, permission: 'settings.view' },
  ] },
];

type AdminSidebarProps = {
  avatarUrl?: string | null;
  isCollapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
  permissions?: string[];
  userName?: string;
  userRole?: string;
};

export function AdminSidebar({ avatarUrl, isCollapsed = false, onNavigate, onToggle, permissions = ['*'], userName = 'Admin', userRole = 'Yönetici' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const isPanelActive = isAdminNavigationHrefActive(pathname, panelLink.href);
  const permissionSet = new Set(permissions);
  const visibleGroups = navigationGroups.flatMap((group) => {
    const items = group.items.filter((item) => canViewAdminNavigationItem(item.permission, permissionSet));
    return items.length ? [{ ...group, items }] : [];
  });
  const activeHref = getActiveAdminNavigationHref(pathname, visibleGroups.flatMap((group) => group.items.map((item) => item.href)));

  function handleLogout() {
    startLogoutTransition(async () => {
      try {
        const result = await adminLogoutAction();
        if (!result.success) {
          toast.error(result.error || 'Çıkış işlemi tamamlanamadı.');
          return;
        }

        toast.success('Oturumunuz kapatıldı.');
        router.replace('/admin/login');
        router.refresh();
      } catch {
        toast.error('Çıkış işlemi tamamlanamadı.');
      }
    });
  }

  return (
    <aside className="flex h-full flex-col bg-white">
      {/* Brand Header */}
      <div className={cn("flex shrink-0 items-center transition-all", isCollapsed ? "h-16 justify-center px-1 gap-1" : "h-20 justify-between px-6")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn("flex shrink-0 items-center justify-center transition-all", isCollapsed ? "h-11 w-11" : "h-14 w-14")}>
            <SafeImage src="/admin_logo.png" alt="İZNİKON Logo" className="h-full w-full object-contain drop-shadow-sm scale-125" />
          </div>
          {!isCollapsed && <span className="truncate text-2xl font-black tracking-tight text-[#090e1a]">İZNİKON</span>}
        </div>
        <button type="button" onClick={onToggle} className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={isCollapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}>
          <ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <div className={cn("flex-1 overflow-y-auto py-4", isCollapsed ? "px-2" : "px-4")}>
        {/* Dashboard Link */}
        <Link
          href={panelLink.href}
          onClick={onNavigate}
          className={cn(
            'group mb-6 flex items-center rounded-xl transition-colors whitespace-nowrap',
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
          {visibleGroups.map(({ icon: GroupIcon, items, key, label }) => {
            const groupIsActive = items.some((item) => item.href === activeHref);
            const isOpen = openGroups[key] ?? groupIsActive;

            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => {
                    if (isCollapsed) onToggle?.();
                    setOpenGroups((curr) => ({ ...curr, [key]: !isOpen }));
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 whitespace-nowrap",
                    isCollapsed ? "justify-center px-0" : "justify-between px-4"
                  )}
                  title={isCollapsed ? label : undefined}
                  aria-expanded={isOpen}
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
                  <div className="mt-1 flex flex-col gap-1 pb-4 pl-9">
                    {items.map((item) => {
                      const isActive = item.href === activeHref;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            'flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-sky-50 font-medium text-sky-600'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-sky-500" aria-hidden="true" />
                          <span className="whitespace-normal leading-5">{item.label}</span>
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
            disabled={isLoggingOut}
            title="Çıkış Yap"
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white p-3 text-gray-400 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-5 w-5 shrink-0" />
          </button>
        ) : (
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm transition-all hover:border-sky-500/30 hover:shadow-md">
            {/* Subtle gradient background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-amber-50/30 opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar avatarUrl={avatarUrl} name={userName} className="h-10 w-10 rounded-xl text-sm" />
                <div className="min-w-0 flex-1">
                  <Link href="/admin/profil" onClick={onNavigate} className="truncate text-sm font-bold text-gray-900 hover:text-sky-700">{userName}</Link>
                  <p className="truncate text-[11px] font-medium text-gray-500">{userRole}</p>
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
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 transition-colors hover:text-rose-600 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isLoggingOut ? 'Kapatılıyor' : 'Çıkış'}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
