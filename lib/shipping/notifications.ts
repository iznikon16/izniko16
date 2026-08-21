import 'server-only';

import { getSiteOrigin, sendTemplatedMail } from '@/lib/mail/mailer';
import { sendSms } from '@/lib/sms/netgsm';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipping/status';
import { createAdminClient } from '@/lib/supabase/admin';

export async function sendShipmentStatusNotifications({
  actorUserId,
  historyId,
  shipmentId,
}: {
  actorUserId: string;
  historyId: string;
  shipmentId: string;
}) {
  const supabase = createAdminClient();
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .maybeSingle();
  if (shipmentError || !shipment) throw new Error(shipmentError?.message ?? 'Sevkiyat bulunamadı.');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_email, customer_phone, user_id')
    .eq('id', shipment.order_id)
    .maybeSingle();
  if (orderError || !order) throw new Error(orderError?.message ?? 'Sipariş bulunamadı.');

  const statusLabel = SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatus] ?? shipment.status;
  const variables = {
    carrier: shipment.carrier || 'Belirtilmedi',
    customer_name: order.customer_name || 'Müşterimiz',
    order_number: order.order_number,
    shipment_number: shipment.shipment_number,
    shipment_status: statusLabel,
    shipment_url: `${getSiteOrigin()}/hesabim/siparislerim/${order.id}`,
    tracking_number: shipment.tracking_number || 'Belirtilmedi',
  };

  const jobs: Array<Promise<unknown>> = [];
  if (order.customer_email) {
    jobs.push(sendTemplatedMail({
      metadata: { historyId, orderId: order.id, shipmentId },
      templateKey: 'customer_shipment_status_updated',
      to: order.customer_email,
      variables,
    }));
  }
  if (order.customer_phone) {
    jobs.push(sendSms(order.customer_phone, '', {
      actorUserId,
      customerId: order.user_id,
      eventKey: `shipment:${shipmentId}:${historyId}`,
      eventType: 'SHIPMENT_STATUS_UPDATED',
      metadata: { historyId, orderId: order.id, shipmentId },
      templateKey: 'shipment_status',
      variables,
    }));
  }

  await Promise.allSettled(jobs);
}
