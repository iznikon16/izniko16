'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

export async function saveOdealSettingsAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const apiKey = String(formData.get('api_key') ?? '').trim();
  const secretKey = String(formData.get('secret_key') ?? '').trim();

  const payload: Database['public']['Tables']['odeal_settings']['Update'] = {
    api_key: apiKey,
    secret_key: secretKey,
    is_test_mode: formData.get('is_test_mode') === 'on',
    is_enabled: formData.get('is_enabled') === 'on',
  };

  const { error } = await supabase.from('odeal_settings').upsert({ id: 'main', ...payload }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/entegrasyonlar/odeal');
}
