'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { encryptToken, isEncryptedToken } from '@/lib/security/encryption';
import { writeAuditLog } from '@/lib/audit/queries';
import { SECRET_MASK } from '@/lib/integrations/security';

export async function saveOdealSettingsAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('settings.manageIntegrations');
  const supabase = createAdminClient();
  const apiKey = String(formData.get('api_key') ?? '').trim();
  const secretKey = String(formData.get('secret_key') ?? '').trim();

  const { data: existing } = await supabase.from('odeal_settings').select('api_key, secret_key').eq('id', 'main').maybeSingle();
  const secureValue = (value: string, current = '') => {
    if (value && value !== SECRET_MASK) return encryptToken(value);
    return current && !isEncryptedToken(current) ? encryptToken(current) : current;
  };

  const payload: Database['public']['Tables']['odeal_settings']['Update'] = {
    api_key: secureValue(apiKey, existing?.api_key),
    secret_key: secureValue(secretKey, existing?.secret_key),
    is_test_mode: formData.get('is_test_mode') === 'on',
    is_enabled: formData.get('is_enabled') === 'on',
  };

  const { error } = await supabase.from('odeal_settings').upsert({ id: 'main', ...payload }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  await writeAuditLog({
    actorUserId: session.user.id,
    action: 'integration_odeal_settings_update',
    resourceType: 'integration',
    resourceId: 'odeal',
    newValue: { enabled: payload.is_enabled, environment: payload.is_test_mode ? 'sandbox' : 'live' },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/integrations');
  revalidatePath('/admin/integrations/odeal');
}
