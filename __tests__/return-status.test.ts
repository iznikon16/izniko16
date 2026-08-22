import {
  isReturnStatus,
  RETURN_NEXT_STATUSES,
  RETURN_STATUSES,
  RETURN_STATUS_LABELS,
} from '@/lib/returns/types';

describe('return status', () => {
  it('desteklenen durumları Türkçe etiketleriyle tanımlar', () => {
    expect(RETURN_STATUSES).toHaveLength(7);
    expect(RETURN_STATUS_LABELS.received).toBe('Ürün Kabul Edildi');
    expect(RETURN_STATUS_LABELS.refund_pending).toBe('Geri Ödeme Bekliyor');
  });

  it('yalnız izin verilen durum geçişlerini sunar', () => {
    expect(RETURN_NEXT_STATUSES.requested).toEqual(['approved', 'rejected']);
    expect(RETURN_NEXT_STATUSES.received).toEqual(['refund_pending']);
    expect(RETURN_NEXT_STATUSES.completed).toEqual([]);
  });

  it('bilinmeyen durumu reddeder', () => {
    expect(isReturnStatus('refunded')).toBe(true);
    expect(isReturnStatus('force_refund')).toBe(false);
  });
});
