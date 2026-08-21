import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, KeyRound } from 'lucide-react';
import { PasswordResetCompleteForm } from '@/components/storefront/password-reset-forms';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Yeni Şifre | İZNİKON' };
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ hata?: string | string[] }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const invalid = Boolean(params.hata) || !data.user;
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl sm:p-9"><div className={`grid h-14 w-14 place-items-center rounded-2xl ${invalid ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{invalid ? <AlertCircle className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}</div><h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">{invalid ? 'Bağlantı geçersiz' : 'Yeni şifrenizi belirleyin'}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{invalid ? 'Şifre yenileme bağlantısının süresi dolmuş, bağlantı daha önce kullanılmış veya eksik olabilir.' : 'Yeni şifrenizi girdikten sonra tüm oturumlar kapatılacak ve yeniden giriş yapmanız istenecek.'}</p><div className="mt-7">{invalid ? <Link href="/sifremi-unuttum" className="inline-flex rounded-xl bg-amber-600 px-5 py-3 text-sm font-black text-white">Yeni bağlantı iste</Link> : <PasswordResetCompleteForm />}</div></section></main>;
}
