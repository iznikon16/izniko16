import 'server-only';

import type { CustomerProfileRow, EmailLogRow, EmailTemplateRow, SmtpSettingsRow } from '@/lib/catalog/types';
import { createAdminClient } from '@/lib/supabase/admin';

const SMTP_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export type MarketingAudienceMember = Pick<CustomerProfileRow, 'email' | 'full_name' | 'user_id'>;

export async function getMarketingDashboardData() {
  const supabase = createAdminClient();

  const [
    { count: consentCount, error: consentCountError },
    { count: eligibleCount, error: eligibleCountError },
    { data: audience, error: audienceError },
    { data: templates, error: templatesError },
    { data: logs, error: logsError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase.from('customer_profiles').select('*', { count: 'exact', head: true }).eq('marketing_consent', true),
    supabase
      .from('customer_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_consent', true)
      .eq('is_blocked', false)
      .neq('email', '')
      .not('email_verified_at', 'is', null),
    supabase
      .from('customer_profiles')
      .select('user_id, email, full_name')
      .eq('marketing_consent', true)
      .eq('is_blocked', false)
      .neq('email', '')
      .not('email_verified_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase.from('email_templates').select('*').like('key', 'marketing_%').order('name', { ascending: true }),
    supabase.from('email_logs').select('*').like('template_key', 'marketing_%').order('created_at', { ascending: false }).limit(8),
    supabase.from('smtp_settings').select('*').eq('id', SMTP_SETTINGS_ID).maybeSingle(),
  ]);

  if (consentCountError || eligibleCountError || audienceError || templatesError || logsError || settingsError) {
    throw new Error(
      consentCountError?.message ??
        eligibleCountError?.message ??
        audienceError?.message ??
        templatesError?.message ??
        logsError?.message ??
        settingsError?.message ??
        'Pazarlama verisi okunamadı.'
    );
  }

  return {
    audience: (audience ?? []) as MarketingAudienceMember[],
    consentCount: consentCount ?? 0,
    eligibleCount: eligibleCount ?? 0,
    logs: (logs ?? []) as EmailLogRow[],
    settings: settings as SmtpSettingsRow | null,
    templates: (templates ?? []) as EmailTemplateRow[],
  };
}
