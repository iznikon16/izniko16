import type { Metadata } from 'next';
import { ProfileSettings } from './ProfileSettings';
import { getCustomerAddresses, requireCustomerSession } from '@/lib/commerce/queries';

export const metadata: Metadata = { title: 'Profilim | İZNİKON' };
export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage() {
  const { profile, user } = await requireCustomerSession('/hesabim/profil');
  const addresses = await getCustomerAddresses(user.id);
  return (
    <div>
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Hesap ayarları</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Profilim</h1><p className="mt-2 text-sm text-slate-600">İletişim, giriş ve pazarlama tercihlerinizi yönetin.</p></div>
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
    </div>
  );
}
