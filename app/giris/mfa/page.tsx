import { redirect } from 'next/navigation';
import { MfaChallengeForm } from '@/components/profile/mfa-challenge-form';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import { getMfaStatus } from '@/lib/auth/mfa';
import { getCustomerPrimarySession } from '@/lib/commerce/queries';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Güvenli Giriş | İZNİKON' };

export default async function CustomerMfaPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;
  const destination = getSafeCustomerRedirectPath(nextValue);
  const session = await getCustomerPrimarySession();
  if (!session) redirect(`/giris?next=${encodeURIComponent(destination)}`);
  const status = await getMfaStatus(await createClient());
  if (!status.available) return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-7 text-center shadow-2xl"><h1 className="text-xl font-black text-slate-950">Güvenlik durumu doğrulanamadı</h1><p className="mt-3 text-sm leading-6 text-slate-600">Supabase MFA servisine şu anda ulaşılamıyor. Güvenliğiniz için hesap erişimi durduruldu.</p><Link href={`/giris/mfa?next=${encodeURIComponent(destination)}`} className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Tekrar Dene</Link></section></main>;
  if (!status.requiresChallenge) redirect(destination);
  if (!status.verifiedFactorId) redirect('/giris');

  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl"><MfaChallengeForm factorId={status.verifiedFactorId} destination={destination} /></section></main>;
}
