import type { Metadata } from 'next';
import { ProfileSettings } from './ProfileSettings';
import { getCustomerAddresses, requireCustomerSession } from '@/lib/commerce/queries';
import { AvatarManager } from '@/components/profile/avatar-manager';
import { Badge } from '@/components/ui/badge';
import { getAvatarPublicUrl } from '@/lib/profile/avatar';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { SecurityManager } from '@/components/profile/security-manager';
import { getMfaStatus } from '@/lib/auth/mfa';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Profilim | İZNİKON' };
export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage() {
  const { profile, user } = await requireCustomerSession('/hesabim/profil');
  const addresses = await getCustomerAddresses(user.id);
  const mfaStatus = await getMfaStatus(await createClient());
  const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
  const displayName = profile.full_name || user.email || 'Müşteri';
  return (
    <div>
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Hesap ayarları</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Profilim</h1><p className="mt-2 text-sm text-slate-600">İletişim, giriş ve pazarlama tercihlerinizi yönetin.</p></div>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <AvatarManager avatarUrl={getAvatarPublicUrl(profile.avatar_path)} email={user.email || profile.email} name={displayName} />
        <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Rol</p><Badge className="mt-2">{ROLE_LABELS.customer}</Badge></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Hesap durumu</p><Badge variant="success" className="mt-2">Aktif</Badge></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Son giriş</p><p className="mt-2 text-sm font-semibold text-slate-700">{user.last_sign_in_at ? dateFormatter.format(new Date(user.last_sign_in_at)) : 'İlk giriş'}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Hesap oluşturma</p><p className="mt-2 text-sm font-semibold text-slate-700">{dateFormatter.format(new Date(user.created_at))}</p></div>
        </div>
      </section>
      <ProfileSettings
        accountType={profile.account_type}
        addressCount={addresses.length}
        companyTitle={profile.company_title}
        email={user.email || profile.email}
        fullName={profile.full_name}
        marketingConsent={profile.marketing_consent}
        phone={profile.phone}
        taxNumber={profile.tax_number}
        taxOffice={profile.tax_office}
      />
      <div className="mt-6"><SecurityManager initialFactorId={mfaStatus.verifiedFactorId} mfaEnabled={mfaStatus.enabled} loginPath="/giris" /></div>
    </div>
  );
}
