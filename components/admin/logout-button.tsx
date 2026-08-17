'use client';

import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleClick() {
    const isConfirmed = window.confirm('Çıkış yapmak istediğinize emin misiniz?');
    if (!isConfirmed) return;

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      <LogOut className="h-4 w-4" />
      Çıkış Yap
    </button>
  );
}
