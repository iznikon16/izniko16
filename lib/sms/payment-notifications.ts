import 'server-only';

import { writeAuditLog } from '@/lib/audit/queries';
import { roundMoney } from '@/lib/accounting/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCariNotification, type PaymentSmsEvent, type SmsSendResult } from '@/lib/sms/netgsm';

const EVENT_TEMPLATES: Record<PaymentSmsEvent, string> = {
  PAYMENT_DUE_SOON: 'payment_due_soon',
  PAYMENT_DUE_TODAY: 'payment_due_today',
  PAYMENT_OVERDUE: 'payment_overdue',
  PAYMENT_RECEIVED: 'payment_received',
  MANUAL_PAYMENT_REMINDER: 'manual_payment_reminder',
};

type ReminderSettings = {
  enabled: boolean;
  due_soon_days: number;
  overdue_after_days: number;
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  due_soon_days: 3,
  overdue_after_days: 1,
};

function money(value: number) {
  return formatCommercePrice(roundMoney(value));
}

export async function sendManualPaymentReminder(
  customerId: string,
  actorUserId: string
): Promise<SmsSendResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_account_summaries')
    .select('customer_id, customer_name, phone, balance, overdue_balance, is_active')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error || !data || !data.customer_id) return { ok: false, message: 'Müşteri cari hesabı bulunamadı.' };
  if (!data.is_active) return { ok: false, message: 'Pasif müşteri hesabına SMS gönderilemez.' };
  if (!data.phone) return { ok: false, message: 'Müşterinin telefon numarası bulunmuyor.' };

  const result = await sendCariNotification(
    data.phone,
    EVENT_TEMPLATES.MANUAL_PAYMENT_REMINDER,
    {
      customer_name: data.customer_name ?? 'Müşterimiz',
      balance: money(Number(data.balance) || 0),
      due_amount: money(Number(data.overdue_balance) || 0),
    },
    {
      customerId,
      actorUserId,
      eventType: 'MANUAL_PAYMENT_REMINDER',
      eventKey: `manual-payment-reminder:${customerId}:${crypto.randomUUID()}`,
    }
  );

  await writeAuditLog({
    actorUserId,
    action: 'payment_reminder_send',
    resourceType: 'customer_account',
    resourceId: customerId,
    metadata: { ok: result.ok, sms_log_id: result.logId ?? null },
  });
  return result;
}

export async function sendPaymentReceivedNotification(input: {
  customerId: string;
  paymentId: string;
  paymentAmount: number;
  balance: number;
  actorUserId?: string | null;
}) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('customer_profiles')
    .select('full_name, phone, is_blocked')
    .eq('user_id', input.customerId)
    .maybeSingle();
  if (!data?.phone || data.is_blocked) return { ok: false, message: 'SMS alıcısı uygun değil.' } satisfies SmsSendResult;

  return sendCariNotification(
    data.phone,
    EVENT_TEMPLATES.PAYMENT_RECEIVED,
    {
      customer_name: data.full_name || 'Müşterimiz',
      payment_amount: money(input.paymentAmount),
      balance: money(input.balance),
    },
    {
      customerId: input.customerId,
      actorUserId: input.actorUserId ?? undefined,
      eventType: 'PAYMENT_RECEIVED',
      eventKey: `payment-received:${input.paymentId}`,
      metadata: { payment_id: input.paymentId },
    }
  );
}

export async function dispatchScheduledPaymentReminders() {
  const supabase = createAdminClient();
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'payment_sms_reminders')
    .maybeSingle();
  const settings = { ...DEFAULT_SETTINGS, ...((setting?.value ?? {}) as Partial<ReminderSettings>) };
  if (!settings.enabled) return { processed: 0, sent: 0, skipped: 0, disabled: true };

  const { data: dueRows, error } = await supabase
    .from('customer_receivable_due_status')
    .select('customer_id, customer_name, customer_phone, transaction_id, due_date, remaining_amount, remaining_days, overdue_days, status')
    .gt('remaining_amount', 0)
    .not('due_date', 'is', null)
    .limit(1000);
  if (error) throw new Error('Vade bildirimleri yüklenemedi.');

  const customerIds = [...new Set((dueRows ?? []).flatMap((row) => row.customer_id ? [row.customer_id] : []))];
  const { data: summaries } = customerIds.length
    ? await supabase.from('customer_account_summaries').select('customer_id, balance, is_active').in('customer_id', customerIds)
    : { data: [] };
  const summaryByCustomer = new Map((summaries ?? []).map((row) => [row.customer_id, row]));

  let sent = 0;
  let skipped = 0;
  for (const row of dueRows ?? []) {
    if (!row.customer_id || !row.transaction_id || !row.due_date || !row.customer_phone) {
      skipped += 1;
      continue;
    }
    const summary = summaryByCustomer.get(row.customer_id);
    if (!summary?.is_active) {
      skipped += 1;
      continue;
    }

    let eventType: PaymentSmsEvent | null = null;
    if (Number(row.remaining_days) === settings.due_soon_days) eventType = 'PAYMENT_DUE_SOON';
    else if (Number(row.remaining_days) === 0) eventType = 'PAYMENT_DUE_TODAY';
    else if (Number(row.overdue_days) === settings.overdue_after_days) eventType = 'PAYMENT_OVERDUE';
    if (!eventType) continue;

    const result = await sendCariNotification(
      row.customer_phone,
      EVENT_TEMPLATES[eventType],
      {
        customer_name: row.customer_name ?? 'Müşterimiz',
        balance: money(Number(summary.balance) || 0),
        due_amount: money(Number(row.remaining_amount) || 0),
        due_date: row.due_date,
        days_overdue: Number(row.overdue_days) || 0,
      },
      {
        customerId: row.customer_id,
        eventType,
        eventKey: `${eventType}:${row.transaction_id}:${row.due_date}`,
        dueTransactionId: row.transaction_id,
      }
    );
    if (result.ok && !result.duplicate) sent += 1;
    else skipped += 1;
  }

  return { processed: dueRows?.length ?? 0, sent, skipped, disabled: false };
}
