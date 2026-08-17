import 'server-only';

import type { EmailLogRow, EmailTemplateRow, SmtpSettingsRow } from '@/lib/catalog/types';
import { createAdminClient } from '@/lib/supabase/admin';

const SMTP_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export async function getAdminMailSettings(): Promise<SmtpSettingsRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('smtp_settings').select('*').eq('id', SMTP_SETTINGS_ID).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const { data: insertedSettings, error: insertError } = await supabase
      .from('smtp_settings')
      .insert({ id: SMTP_SETTINGS_ID })
      .select()
      .single();

    if (insertError || !insertedSettings) {
      throw new Error(insertError?.message ?? 'SMTP ayarı oluşturulamadı.');
    }

    return insertedSettings;
  }

  return data;
}

export async function getAdminEmailTemplates(): Promise<EmailTemplateRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('email_templates').select('*').order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getRecentEmailLogs(limit = 8): Promise<EmailLogRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
