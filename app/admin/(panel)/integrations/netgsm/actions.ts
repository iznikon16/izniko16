'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { sendSms } from '@/lib/sms/netgsm';
import { writeAuditLog } from '@/lib/audit/queries';
import { checkRateLimit } from '@/lib/security/rate-limit';

export type NetgsmActionResult = {
  ok: boolean;
  message: string;
};

export async function saveNetgsmSettingsAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('settings.manageIntegrations');
  const supabase = createAdminClient();
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const header = String(formData.get('header') ?? '').trim();

  let finalPassword = password;
  if (!password || password === '******') {
    const { data: existing } = await supabase.from('netgsm_settings').select('password').eq('id', 'main').maybeSingle();
    const existingPassword = existing?.password || '';
    const { encryptToken, isEncryptedToken } = await import('@/lib/security/encryption');
    finalPassword = existingPassword && !isEncryptedToken(existingPassword) ? encryptToken(existingPassword) : existingPassword;
  } else if (password) {
    const { encryptToken } = await import('@/lib/security/encryption');
    finalPassword = encryptToken(password);
  }

  const payload: Database['public']['Tables']['netgsm_settings']['Update'] = {
    username,
    password: finalPassword,
    header,
    is_enabled: formData.get('is_enabled') === 'on',
  };

  const { error } = await supabase.from('netgsm_settings').upsert({ id: 'main', ...payload }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  await writeAuditLog({ actorUserId: session.user.id, action: 'integration_netgsm_settings_update', resourceType: 'integration', resourceId: 'netgsm', newValue: { enabled: payload.is_enabled, headerConfigured: Boolean(header) } });

  revalidatePath('/admin');
  revalidatePath('/admin/integrations');
  revalidatePath('/admin/integrations/netgsm');
}

export async function sendTestSmsAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('settings.manageIntegrations');
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!phone || !message) {
    redirect('/admin/integrations/netgsm?test=hata');
  }

  if (!checkRateLimit(`integration-netgsm-test:${session.user.id}`, 3, 15 * 60 * 1000).success) redirect('/admin/integrations/netgsm?test=limited');

  const result = await sendSms(phone, message);
  await writeAuditLog({ actorUserId: session.user.id, action: 'integration_netgsm_delivery_test', resourceType: 'integration', resourceId: 'netgsm', newValue: { ok: result.ok } });
  revalidatePath('/admin/integrations/netgsm');
  redirect(`/admin/integrations/netgsm?test=${result.ok ? 'sent' : 'failed'}`);
}

export async function sendTestSmsActionResult(formData: FormData): Promise<NetgsmActionResult> {
  const session = await requireAdminPermission('settings.manageIntegrations');
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (!phone || !message) {
    return { ok: false, message: 'Telefon ve mesaj zorunludur.' };
  }
  if (!checkRateLimit(`integration-netgsm-test:${session.user.id}`, 3, 15 * 60 * 1000).success) return { ok: false, message: 'Çok fazla test denemesi. 15 dakika sonra yeniden deneyin.' };
  const result = await sendSms(phone, message);
  await writeAuditLog({ actorUserId: session.user.id, action: 'integration_netgsm_delivery_test', resourceType: 'integration', resourceId: 'netgsm', newValue: { ok: result.ok } });
  return { ok: result.ok, message: result.message };
}

export async function saveSmsTemplateAction(formData: FormData): Promise<void> {
  await requireAdminPermission('settings.view');
  const supabase = createAdminClient();
  const key = String(formData.get('key') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!key || !name || !body) {
    throw new Error('Şablon anahtarı, adı ve içerik zorunludur.');
  }

  const { error } = await supabase
    .from('sms_templates')
    .upsert({ key, name, body, is_enabled: formData.get('is_enabled') === 'on' }, { onConflict: 'key' });
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/integrations/netgsm');
}

export async function deleteSmsTemplateAction(formData: FormData): Promise<void> {
  await requireAdminPermission('settings.view');
  const supabase = createAdminClient();
  const key = String(formData.get('key') ?? '').trim();
  if (!key) return;

  const { error } = await supabase.from('sms_templates').delete().eq('key', key);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/integrations/netgsm');
}
