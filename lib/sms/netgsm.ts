import { createAdminClient } from '@/lib/supabase/admin';
import type { NetgsmSettingsRow, SmsTemplateRow } from '@/lib/catalog/types';

/**
 * Netgsm SMS gönderim servisi (resmi Netgsm API).
 */
export type SmsSendResult = {
  ok: boolean;
  message: string;
};

import { decryptToken } from '@/lib/security/encryption';

export async function getNetgsmSettings(): Promise<NetgsmSettingsRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('netgsm_settings').select('*').eq('id', 'main').maybeSingle();
  if (!data) return null;

  let password = data.password;
  if (password) {
    try {
      password = decryptToken(password);
    } catch {
      // Fallback to plain text
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

export async function sendSms(
  phone: string,
  message: string,
  options: { templateKey?: string; variables?: Record<string, string | number> } = {}
): Promise<SmsSendResult> {
  const supabase = createAdminClient();
  const settings = await getNetgsmSettings();

  let body = message;
  if (options.templateKey) {
    const template = await getSmsTemplate(options.templateKey);
    if (template) {
      body = renderTemplate(template.body, options.variables ?? {});
    }
  }

  const logPayload = {
    recipient_phone: phone,
    template_key: (options.templateKey ?? null) as string | null,
    body: body.slice(0, 500),
    status: 'sent',
    error_message: '',
    metadata: {} as never,
  };

  if (!settings?.is_enabled || !settings.username || !settings.password) {
    logPayload.status = 'failed';
    logPayload.error_message = 'Netgsm yapılandırılmamış veya aktif değil.';
    await supabase.from('sms_logs').insert(logPayload);
    return { ok: false, message: 'SMS gönderilemedi: Netgsm ayarları eksik.' };
  }

  try {
    const response = await fetch('https://api.netgsm.com.tr/sms/send/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        usercode: settings.username,
        password: settings.password,
        msgheader: settings.header,
        gsmno: phone.replace(/\D/g, ''),
        message: body,
        diltip: 'T',
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const text = await response.text();
    const ok = response.ok && /^00\b/.test(text.trim());

    logPayload.status = ok ? 'sent' : 'failed';
    logPayload.error_message = ok ? '' : text.slice(0, 200);
    logPayload.metadata = { netgsm_response: text.slice(0, 120) } as never;
    await supabase.from('sms_logs').insert(logPayload);

    return ok
      ? { ok: true, message: 'SMS gönderildi.' }
      : { ok: false, message: `SMS gönderilemedi: ${text.slice(0, 150)}` };
  } catch (error) {
    logPayload.status = 'failed';
    logPayload.error_message = error instanceof Error ? error.message.slice(0, 200) : 'Netgsm isteği başarısız';
    await supabase.from('sms_logs').insert(logPayload);
    return { ok: false, message: `SMS gönderilemedi: ${error instanceof Error ? error.message : 'Ağ hatası'}` };
  }
}

export async function sendCariNotification(
  phone: string,
  templateKey: string,
  variables: Record<string, string | number>
): Promise<SmsSendResult> {
  const template = await getSmsTemplate(templateKey);
  if (!template) {
    return { ok: false, message: 'SMS şablonu bulunamadı veya devre dışı.' };
  }
  return sendSms(phone, template.body, { templateKey, variables });
}
