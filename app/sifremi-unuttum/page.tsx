import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { PasswordResetRequestForm } from '@/components/storefront/password-reset-forms';

export const metadata: Metadata = { title: 'Şifremi Unuttum | İZNİKON' };
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl sm:p-9"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><KeyRound className="h-7 w-7" /></div><h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Şifrenizi yenileyin</h1><p className="mt-3 text-sm leading-6 text-slate-600">Hesabınızda kayıtlı e-posta adresini girin. Eşleşen aktif bir hesap varsa güvenli yenileme bağlantısını göndereceğiz.</p><div className="mt-7"><PasswordResetRequestForm /></div><Link href="/giris" className="mt-6 block text-center text-sm font-black text-amber-700 hover:underline">Giriş ekranına dön</Link></section></main>;
}
