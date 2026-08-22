import 'server-only';

import { getOdealConfig, odealRefund } from '@/lib/payments/odeal';
import { createAdminClient } from '@/lib/supabase/admin';

async function finalize(refundId: string, actorUserId: string, succeeded: boolean, providerReference?: string, errorMessage = '') {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('finalize_return_refund', {
    p_actor_user_id: actorUserId,
    p_error_message: errorMessage,
    p_provider_reference: providerReference,
    p_refund_transaction_id: refundId,
    p_succeeded: succeeded,
  });
  if (error || !data?.[0]) throw new Error(error?.message ?? 'Geri ödeme sonucu kaydedilemedi.');
  return data[0];
}

export async function processReturnRefund(refundId: string, actorUserId: string) {
  const supabase = createAdminClient();
  const { data: refund, error } = await supabase.from('refund_transactions').select('*').eq('id', refundId).maybeSingle();
  if (error || !refund) throw new Error(error?.message ?? 'Geri ödeme kaydı bulunamadı.');
  if (refund.status === 'succeeded') return { processed: true, duplicate: true };

  if (refund.provider === 'offline') {
    if (refund.payment_attempt_id) {
      const { data: attempt, error: attemptError } = await supabase
        .from('payment_attempts')
        .select('status')
        .eq('id', refund.payment_attempt_id)
        .maybeSingle();
      if (attemptError) throw new Error(attemptError.message);
      if (attempt?.status === 'paid' || attempt?.status === 'refunded') {
        return { processed: false, duplicate: false };
      }
    }
    await finalize(refund.id, actorUserId, true, `INTERNAL-${refund.return_request_id}`);
    return { processed: true, duplicate: false };
  }

  if (refund.provider === 'odeal') {
    const { data: attempt } = refund.payment_attempt_id
      ? await supabase.from('payment_attempts').select('provider_reference').eq('id', refund.payment_attempt_id).maybeSingle()
      : { data: null };
    const config = await getOdealConfig();
    if (!config?.isEnabled || !config.apiKey || !config.secretKey || !attempt?.provider_reference) {
      await finalize(refund.id, actorUserId, false, undefined, 'Ödeal yapılandırması veya ödeme referansı eksik.');
      throw new Error('Ödeal yapılandırması veya ödeme referansı eksik.');
    }
    try {
      await odealRefund(config, attempt.provider_reference, Math.round(Number(refund.amount) * 100));
      await finalize(refund.id, actorUserId, true, attempt.provider_reference);
      return { processed: true, duplicate: false };
    } catch (providerError) {
      const safeMessage = providerError instanceof Error ? providerError.message : 'Ödeal geri ödemesi başarısız.';
      await finalize(refund.id, actorUserId, false, undefined, safeMessage);
      throw new Error(safeMessage);
    }
  }

  return { processed: false, duplicate: false };
}

export async function confirmExternalReturnRefund(refundId: string, actorUserId: string, providerReference: string) {
  if (!providerReference.trim()) throw new Error('Sağlayıcı iade referansı zorunludur.');
  return finalize(refundId, actorUserId, true, providerReference.trim());
}
