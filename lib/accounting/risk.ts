import { getCustomerAccountWithSummary } from '@/lib/accounting/queries';
import { roundMoney } from '@/lib/accounting/queries';

/**
 * Risk limiti kuralları.
 *
 * Yeni sipariş müşterinin limitini aşacaksa iş kuralına göre siparişi
 * engeller veya admin onayına işaretler. Sessizce limiti aşan sipariş
 * oluşturma yoktur.
 */

export type RiskCheckResult = {
  allowed: boolean;
  /** Limit aşılmışsa açıklama */
  message: string;
  currentBalance: number;
  riskLimit: number;
  newBalanceIfApproved: number;
  usedPercentAfter: number;
  requiresApproval: boolean;
};

export async function checkRiskLimit(
  customerId: string,
  orderTotal: number
): Promise<RiskCheckResult> {
  const { summary } = await getCustomerAccountWithSummary(customerId);

  const currentBalance = summary.balance;
  const riskLimit = summary.riskLimit;
  const amount = roundMoney(Math.abs(orderTotal));

  // Limit tanımlanmamışsa (0) serbest
  if (riskLimit <= 0) {
    return {
      allowed: true,
      message: 'Risk limiti tanımsız — işlem serbest.',
      currentBalance,
      riskLimit,
      newBalanceIfApproved: roundMoney(currentBalance + amount),
      usedPercentAfter: 0,
      requiresApproval: false,
    };
  }

  const newBalance = roundMoney(currentBalance + amount);
  const usedPercentAfter = Math.round((newBalance / riskLimit) * 100);

  // Limit aşımı
  if (newBalance > riskLimit) {
    return {
      allowed: false,
      message: `Bu sipariş risk limitini aşar (Mevcut: ${currentBalance}, Liman: ${riskLimit}, Yeni: ${newBalance}).`,
      currentBalance,
      riskLimit,
      newBalanceIfApproved: newBalance,
      usedPercentAfter,
      requiresApproval: true,
    };
  }

  // %80 üzeri uyarı (onay gerektirmeyen ama bilgilendirme)
  if (usedPercentAfter >= 80) {
    return {
      allowed: true,
      message: `Bu sipariş risk limitinin %${usedPercentAfter} kullanımına ulaşır.`,
      currentBalance,
      riskLimit,
      newBalanceIfApproved: newBalance,
      usedPercentAfter,
      requiresApproval: false,
    };
  }

  return {
    allowed: true,
    message: 'Limit uygun.',
    currentBalance,
    riskLimit,
    newBalanceIfApproved: newBalance,
    usedPercentAfter,
    requiresApproval: false,
  };
}

/**
 * Sipariş onay akışındaki varsayılan karar:
 * - Limit aşılırsa admin onayına (requiresApproval) işaretlenir.
 * - Aksi halde işleme izin verilir.
 *
 * @returns true = sipariş devam edebilir; false = engellendi/onay bekliyor.
 */
export function applyRiskPolicy(result: RiskCheckResult): boolean {
  // Varsayılan iş modeli: limit aşımı siparişi engeller; onayı admin verir.
  return result.allowed && !result.requiresApproval;
}
