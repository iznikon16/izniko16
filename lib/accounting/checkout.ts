import 'server-only';

import { checkRiskLimit } from '@/lib/accounting/risk';
import { createAdminClient } from '@/lib/supabase/admin';

export type CheckoutAccountStatus = {
  allowed: boolean;
  availableLimit: number;
  balance: number;
  projectedBalance: number;
  projectedAvailableLimit: number;
  requiresApproval: boolean;
  riskLimit: number;
  riskPolicy: string;
};

export async function getCheckoutAccountStatus(customerId: string, orderTotal: number): Promise<CheckoutAccountStatus> {
  const supabase = createAdminClient();
  const [{ data: summary, error: summaryError }, { data: risk, error: riskError }, projected] = await Promise.all([
    supabase.from('customer_account_summaries').select('balance').eq('customer_id', customerId).maybeSingle(),
    supabase.from('customer_risk_status').select('available_limit, risk_limit, risk_policy').eq('customer_id', customerId).maybeSingle(),
    checkRiskLimit(customerId, orderTotal),
  ]);

  if (summaryError || riskError) throw new Error('Cari hesap bilgisi ödeme ekranı için alınamadı.');

  const balance = Number(summary?.balance) || 0;
  return {
    allowed: projected.allowed,
    availableLimit: Number(risk?.available_limit) || 0,
    balance,
    projectedBalance: Math.round((balance + orderTotal) * 100) / 100,
    projectedAvailableLimit: projected.availableLimit,
    requiresApproval: projected.requiresApproval,
    riskLimit: Number(risk?.risk_limit) || 0,
    riskPolicy: risk?.risk_policy || 'warn',
  };
}
