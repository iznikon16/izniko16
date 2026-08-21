import type { Metadata } from 'next';
import { AddressManager } from './AddressManager';
import { getCustomerAddresses, requireCustomerSession } from '@/lib/commerce/queries';

export const metadata: Metadata = { title: 'Adreslerim | İZNİKON' };
export const dynamic = 'force-dynamic';

export default async function CustomerAddressesPage() {
  const session = await requireCustomerSession('/hesabim/adreslerim');
  const addresses = await getCustomerAddresses(session.user.id);
  return <div><div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Teslimat</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Adreslerim</h1><p className="mt-2 text-sm text-slate-600">Siparişlerde kullanacağınız teslimat adreslerini yönetin.</p></div><AddressManager addresses={addresses} defaultName={session.profile.full_name} defaultPhone={session.profile.phone} /></div>;
}
