import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { NetgsmSettingsRow, SmsTemplateRow } from '@/lib/catalog/types';
import { decryptToken } from '@/lib/security/encryption';

export const PAYMENT_SMS_EVENTS = [
  'PAYMENT_DUE_SOON',
  'PAYMENT_DUE_TODAY',
  'PAYMENT_OVERDUE',
  'PAYMENT_RECEIVED',
  'MANUAL_PAYMENT_REMINDER',
] as const;

export type PaymentSmsEvent = (typeof PAYMENT_SMS_EVENTS)[number];
export type ShipmentSmsEvent = 'SHIPMENT_STATUS_UPDATED';

export type SmsSendResult = {
  ok: boolean;
  duplicate?: boolean;
  message: string;
  logId?: string;
};

export type SmsSendOptions = {
  templateKey?: string;
  variables?: Record<string, string | number>;
  customerId?: string;
  eventType?: PaymentSmsEvent | ShipmentSmsEvent;
  eventKey?: string;
  dueTransactionId?: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
};

export async function getNetgsmSettings(): Promise<NetgsmSettingsRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('netgsm_settings').select('*').eq('id', 'main').maybeSingle();
  if (!data) return null;

  let password = data.password;
  if (password) {
    try {
      password = decryptToken(password);
    } catch {
      // Eski düz metin kayıtlarla geriye dönük uyumluluk.
    }
  }

  return { ...data, password } as NetgsmSettingsRow;
}

export async function getSmsTemplate(key: string): Promise<SmsTemplateRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('sms_templates').select('*').eq('key', key).eq('is_enabled', true).maybeSingle();
  return (data ?? null) as SmsTemplateRow | null;
}

export function renderTemplate(template: string, variables: Record<string, string | number>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value != null ? String(value) : `{{${key}}}`;
  });
}

export function normalizeTurkishPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `9${digits}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}

export async function sendSms(
  phone: string,
  message: string,
  options: SmsSendOptions = {}
): Promise<SmsSendResult> {
  const supabase = createAdminClient();
  const settings = await getNetgsmSettings();
  const normalizedPhone = normalizeTurkishPhone(phone);

  let body = message;
  if (options.templateKey) {
    const template = await getSmsTemplate(options.templateKey);
    if (!template) return { ok: false, message: 'SMS şablonu bulunamadı veya devre dışı.' };
    body = renderTemplate(template.body, options.variables ?? {});
  }

  const pendingLog = {
    recipient_phone: normalizedPhone,
    template_key: options.templateKey ?? null,
    body: body.slice(0, 500),
    status: 'pending',
    error_message: '',
    customer_id: options.customerId ?? null,
    event_type: options.eventType ?? null,
    event_key: options.eventKey ?? null,
    due_transaction_id: options.dueTransactionId ?? null,
    actor_user_id: options.actorUserId ?? null,
    metadata: (options.metadata ?? {}) as never,
  };

  const { data: log, error: reserveError } = await supabase
    .from('sms_logs')
    .insert(pendingLog)
    .select('id')
    .single();

  if (reserveError?.code === '23505' && options.eventKey) {
    return { ok: true, duplicate: true, message: 'Bu bildirim daha önce işlendi.' };
  }
  if (reserveError || !log) {
    return { ok: false, message: 'SMS gönderimi başlatılamadı.' };
  }

  const fail = async (internalMessage: string): Promise<SmsSendResult> => {
    await supabase.from('sms_logs').update({ status: 'failed', error_message: internalMessage.slice(0, 200) }).eq('id', log.id);
    return { ok: false, message: 'SMS gönderilemedi.', logId: log.id };
  };

  if (!normalizedPhone || normalizedPhone.length !== 12) return fail('Geçersiz telefon numarası.');
  if (!settings?.is_enabled || !settings.username || !settings.password || !settings.header) {
    return fail('Netgsm yapılandırılmamış veya aktif değil.');
  }

  try {
    const response = await fetch('https://api.netgsm.com.tr/sms/send/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        usercode: settings.username,
        password: settings.password,
        msgheader: settings.header,
        gsmno: normalizedPhone,
        message: body,
        diltip: 'TR',
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const providerResponse = (await response.text()).trim();
    const ok = response.ok && /^00(?:\s|$)/.test(providerResponse);
    if (!ok) return fail(`Netgsm provider kodu: ${providerResponse.slice(0, 40)}`);

    await supabase
      .from('sms_logs')
      .update({ status: 'sent', error_message: '', metadata: { ...(options.metadata ?? {}), provider_code: '00' } as never })
      .eq('id', log.id);
    return { ok: true, message: 'SMS gönderildi.', logId: log.id };
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Netgsm ağ isteği başarısız.');
  }
}

export async function sendCariNotification(
  phone: string,
  templateKey: string,
  variables: Record<string, string | number>,
  options: Omit<SmsSendOptions, 'templateKey' | 'variables'> = {}
): Promise<SmsSendResult> {
  return sendSms(phone, '', { ...options, templateKey, variables });
}
