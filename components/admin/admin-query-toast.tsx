'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function AdminQueryToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledRef = useRef('');
  const query = searchParams.toString();

  useEffect(() => {
    const key = `${pathname}?${query}`;
    if (!query || handledRef.current === key) return;
    handledRef.current = key;

    const saved = searchParams.get('saved');
    const test = searchParams.get('test');
    const connection = searchParams.get('connection');
    const check = searchParams.get('check');
    const deleted = searchParams.get('deleted');

    if (saved === 'smtp') toast.success('SMTP ayarları kaydedildi.');
    if (saved === '1') toast.success('Değişiklikler kaydedildi.');
    if (deleted === '1') toast.success('Kayıt başarıyla silindi.');
    if (test === 'sent') toast.success('Test gönderimi başarıyla tamamlandı.');
    if (test === 'failed' || test === 'hata') toast.error('Test gönderimi tamamlanamadı.');
    if (test === 'limited') toast.warning('Çok fazla test denemesi yapıldı. Lütfen daha sonra tekrar deneyin.');
    if (connection === 'success') toast.success('Bağlantı testi başarılı.');
    if (connection === 'failed') toast.error('Bağlantı testi başarısız.');
    if (connection === 'limited') toast.warning('Bağlantı testi geçici olarak sınırlandırıldı.');
    if (check === 'ready') toast.success('Entegrasyon yapılandırması hazır.');
    if (check === 'missing') toast.warning('Entegrasyon yapılandırmasında eksik alanlar var.');
    if (check === 'limited') toast.warning('Yapılandırma kontrolü geçici olarak sınırlandırıldı.');

    const sent = Number(searchParams.get('sent'));
    const failed = Number(searchParams.get('failed'));
    if (Number.isFinite(sent) && sent > 0) toast.success(`${sent} e-posta gönderildi.`);
    if (Number.isFinite(failed) && failed > 0) toast.error(`${failed} e-posta gönderilemedi.`);
  }, [pathname, query, searchParams]);

  return null;
}
