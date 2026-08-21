export const SHIPMENT_STATUSES = [
  'preparing',
  'ready',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  preparing: 'Hazırlanıyor',
  ready: 'Sevke Hazır',
  shipped: 'Kargoya Verildi',
  in_transit: 'Transferde',
  out_for_delivery: 'Dağıtımda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
};

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(value);
}
