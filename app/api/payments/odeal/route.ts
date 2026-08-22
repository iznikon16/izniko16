import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { odealVerifyPayment, getOdealConfig, type OdealPaymentVerifyResult } from '@/lib/payments/odeal';

export const dynamic = 'force-dynamic';

/**
 * Ödeal webhook / callback route'u.
 *
 * Bu uç nokta, Ödeal tarafından ödeme sonucu bildirildiğinde çağrılır.
 * - Ödeme doğrulanır (odealVerifyPayment)
 * - Başarılıysa payment_attempts -> paid, orders -> paid/confirmed
 *   + cariye idempotent tahsilat + stok düşümü yapılır.
 *
 * Idempotency: Ödeal aynı callback'i iki kez gönderirse ikinci işlem
 * `postOrderToAccount` (order idempotency key) ve `collectPayment`
 * (payment idempotency key) sayesinde tekrar bakiyeyi etkilemez.
 *
 * NOT: Ödeal imza/geri doğrulama mekanizması resmi dokümantasyonda teyit
 * edildiğinde buraya eklenmelidir (webhook secret doğrulaması).
 */

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false, message: 'Geçersiz JSON' }, { status: 400 });
  }

  const body = (raw ?? {}) as Record<string, unknown>;
  const providerReference = String(body.paymentId ?? body.payment_id ?? body.id ?? '');
  // const orderId = String(body.orderId ?? body.order_id ?? body.merchantOid ?? '');

  if (!providerReference) {
    return Response.json({ ok: false, message: 'paymentId eksik' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const config = await getOdealConfig();

  if (!config?.isEnabled) {
    return Response.json({ ok: false, message: 'Ödeal aktif değil' }, { status: 503 });
  }

  try {
    // Attempt'i provider_reference ile bul
    const { data: attempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .select('*, order:orders(id, user_id, total, order_number)')
      .eq('provider', 'odeal' as Database['public']['Enums']['payment_provider'])
      .eq('provider_reference', providerReference)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError) throw new Error(attemptError.message);
    if (!attempt) {
      return Response.json({ ok: false, message: 'Ödeme denemesi bulunamadı' }, { status: 404 });
    }

    // Çift işleme karşı: attempt zaten paid ise tekrar dokunma (idempotent)
    if (attempt.status === 'paid') {
      return Response.json({ ok: true, message: 'Zaten işlendi', duplicate: true });
    }

    const verify: OdealPaymentVerifyResult = await odealVerifyPayment(config, providerReference);
    const paid = verify.paid;

    const order = attempt.order as { id: string; user_id: string; total: number; order_number: string } | null;

    if (order) {
      const { error: paymentResultError } = await supabase.rpc('record_payment_result_with_accounting', {
        p_attempt_id: attempt.id,
        p_failure_reason: paid ? null : 'Ödeal ödeme doğrulanamadı',
        p_metadata: { odeal_callback: verify.raw } as never,
        p_provider_reference: providerReference,
        p_paid: paid,
      });

      if (paymentResultError) throw new Error(paymentResultError.message);

      if (paid && order.user_id) {
        // Stok düşümü
        const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', order.id);
        for (const item of items ?? []) {
          if (!item.product_id) continue;
          const { error: stockError } = await supabase.rpc('apply_stock_change', {
            p_product_id: item.product_id,
            p_quantity_change: -Math.max(0, Number(item.quantity) || 0),
            p_type: 'order_out',
            p_reference: order.id,
            p_order_id: order.id,
            p_actor_user_id: null,
            p_idempotency_key: `order-stock:${order.id}:${item.product_id}`,
          });
          if (stockError) console.error(`Ödeal stok düşümü başarısız: ${item.product_id}`, stockError.message);
        }
      }
    }

    return Response.json({ ok: true, paid, providerReference });
  } catch (error) {
    console.error('Ödeal callback hatası:', error);
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'Callback işlenemedi' }, { status: 500 });
  }
}
