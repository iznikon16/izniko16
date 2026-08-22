'use client';

import { useTransition } from 'react';
import { LogOut, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminLogoutAction } from '@/components/admin/login-actions';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
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
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
    >
      {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {isPending ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
    </button>
  );
}
