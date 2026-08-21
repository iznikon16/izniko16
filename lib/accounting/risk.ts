import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type RiskPolicy = 'warn' | 'require_approval' | 'block';
export type RiskDecision = 'approved' | 'warning' | 'approval_required' | 'blocked';

export type RiskCheckResult = {
  allowed: boolean;
  availableLimit: number;
  currentExposure: number;
  decision: RiskDecision;
  ledgerExposure: number;
  message: string;
  newExposureIfApproved: number;
  orderExposure: number;
  requiresApproval: boolean;
  riskLimit: number;
  riskPolicy: RiskPolicy;
  usedPercentAfter: number;
  warningThreshold: number;
};

/** Authoritative risk evaluation. Calculation and locking live in PostgreSQL. */
export async function checkRiskLimit(
  customerId: string,
  proposedAmount: number,
  orderId?: string | null
): Promise<RiskCheckResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('evaluate_customer_risk', {
    p_customer_id: customerId,
    p_proposed_amount: Math.abs(proposedAmount),
    p_order_id: orderId ?? null,
  });

  const result = data?.[0];
  if (error || !result) {
    throw new Error(error?.message ?? 'Risk değerlendirmesi yapılamadı.');
  }

  return {
    allowed: result.allowed,
    availableLimit: Number(result.available_limit) || 0,
    currentExposure: Number(result.used_limit) || 0,
    decision: result.decision as RiskDecision,
    ledgerExposure: Number(result.ledger_exposure) || 0,
    message: result.message,
    newExposureIfApproved: Number(result.projected_exposure) || 0,
    orderExposure: Number(result.unposted_order_exposure) || 0,
    requiresApproval: result.requires_approval,
    riskLimit: Number(result.risk_limit) || 0,
    riskPolicy: result.risk_policy as RiskPolicy,
    usedPercentAfter: Number(result.usage_percent) || 0,
    warningThreshold: result.warning_threshold,
  };
}

export function applyRiskPolicy(result: RiskCheckResult) {
  return result.allowed && !result.requiresApproval;
}
