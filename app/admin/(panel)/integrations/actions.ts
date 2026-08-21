'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { writeAuditLog } from '@/lib/audit/queries';
import { requireAdminPermission } from '@/lib/auth/admin';
import { recordIntegrationCheck, type IntegrationKey } from '@/lib/integrations/health';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getPaymentConfig(config: unknown) {
  return config && typeof config === 'object' && !Array.isArray(config) ? config as Record<string, unknown> : {};
}

export async function checkIntegrationConfigurationAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('settings.manageIntegrations');
  const integrationKey = String(formData.get('integration_key') ?? '') as IntegrationKey;
  if (!(['paytr', 'iyzico', 'odeal', 'netgsm', 'smtp'] as string[]).includes(integrationKey)) throw new Error('Geçersiz entegrasyon anahtarı.');
  if (!checkRateLimit(`integration-config-check:${session.user.id}`, 10, 15 * 60 * 1000).success) redirect('/admin/integrations?check=limited');

  const supabase = createAdminClient();
  let configured = false;
  let environment: 'sandbox' | 'live' = 'sandbox';
  let missing: string[] = [];

  if (integrationKey === 'paytr' || integrationKey === 'iyzico') {
    const { data } = await supabase.from('payment_methods').select('config, is_active').eq('provider', integrationKey).order('is_active', { ascending: false }).limit(1).maybeSingle();
    const config = getPaymentConfig(data?.config);
    environment = config.testMode === false ? 'live' : 'sandbox';
    const required = integrationKey === 'paytr'
      ? [['merchantId', 'Merchant ID'], ['merchantKey', 'Merchant key'], ['merchantSalt', 'Merchant salt']]
      : [['apiKey', 'API key'], ['secretKey', 'Secret key']];
    missing = required.filter(([key]) => !hasText(config[key])).map(([, label]) => label);
    configured = missing.length === 0;
  } else if (integrationKey === 'odeal') {
    const { data } = await supabase.from('odeal_settings').select('*').eq('id', 'main').maybeSingle();
    environment = data?.is_test_mode === false ? 'live' : 'sandbox';
    missing = [!hasText(data?.api_key) ? 'Client/API key' : '', !hasText(data?.secret_key) ? 'Client secret' : ''].filter(Boolean);
    configured = missing.length === 0;
  } else if (integrationKey === 'netgsm') {
    const { data } = await supabase.from('netgsm_settings').select('*').eq('id', 'main').maybeSingle();
    environment = 'live';
    missing = [!hasText(data?.username) ? 'Kullanıcı kodu' : '', !hasText(data?.password) ? 'Şifre' : '', !hasText(data?.header) ? 'Başlık' : ''].filter(Boolean);
    configured = missing.length === 0;
  } else {
    const { data } = await supabase.from('smtp_settings').select('*').limit(1).maybeSingle();
    environment = 'live';
    missing = [!hasText(data?.host) ? 'Sunucu' : '', !data?.port ? 'Port' : '', !hasText(data?.from_email) ? 'Gönderen e-posta' : ''].filter(Boolean);
    configured = missing.length === 0;
  }

  const message = configured ? 'Zorunlu yapılandırma alanları hazır.' : `Eksik alanlar: ${missing.join(', ')}`;
  await recordIntegrationCheck({ actorUserId: session.user.id, environment, integrationKey, message, metadata: { missingCount: missing.length }, status: configured ? 'ready' : 'not_configured' });
  await writeAuditLog({ actorUserId: session.user.id, action: 'integration_configuration_check', resourceType: 'integration', resourceId: integrationKey, newValue: { configured, environment, missingCount: missing.length } });

  revalidatePath('/admin/integrations');
  redirect(`/admin/integrations?check=${configured ? 'ready' : 'missing'}&provider=${integrationKey}`);
}
