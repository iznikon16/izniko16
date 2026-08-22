import { redirect } from 'next/navigation';
import { MfaChallengeForm } from '@/components/profile/mfa-challenge-form';
import { getAdminPrimarySession } from '@/lib/auth/admin';
import { getMfaStatus } from '@/lib/auth/mfa';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Güvenli Yönetici Girişi | İZNİKON' };

export default async function AdminMfaPage() {
  const session = await getAdminPrimarySession();
  if (!session) redirect('/admin/login');
  const status = await getMfaStatus(await createClient());
  if (!status.available) return <main className="grid min-h-screen place-items-center bg-[#090e1a] px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-2xl"><h1 className="text-xl font-black text-slate-950">Güvenlik durumu doğrulanamadı</h1><p className="mt-3 text-sm leading-6 text-slate-600">Supabase MFA servisine şu anda ulaşılamıyor. Güvenliğiniz için panel erişimi durduruldu.</p><Link href="/admin/mfa" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Tekrar Dene</Link></section></main>;
  if (!status.requiresChallenge) redirect('/admin');
  if (!status.verifiedFactorId) redirect('/admin/login');

  return <main className="grid min-h-screen place-items-center bg-[#090e1a] px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl"><MfaChallengeForm factorId={status.verifiedFactorId} destination="/admin" /></section></main>;
}
