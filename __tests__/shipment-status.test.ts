import { isShipmentStatus, SHIPMENT_STATUS_LABELS, SHIPMENT_STATUSES } from '@/lib/shipping/status';

describe('shipment status', () => {
  it('tüm desteklenen durumları ve Türkçe etiketlerini içerir', () => {
    expect(SHIPMENT_STATUSES).toHaveLength(7);
    expect(SHIPMENT_STATUS_LABELS.delivered).toBe('Teslim Edildi');
    expect(SHIPMENT_STATUS_LABELS.out_for_delivery).toBe('Dağıtımda');
  });

  it('bilinmeyen durumu reddeder', () => {
    expect(isShipmentStatus('shipped')).toBe(true);
    expect(isShipmentStatus('admin_override')).toBe(false);
  });
});
