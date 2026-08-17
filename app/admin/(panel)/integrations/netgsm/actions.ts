'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { sendSms } from '@/lib/sms/netgsm';

export type NetgsmActionResult = {
  ok: boolean;
  message: string;
};

export async function saveNetgsmSettingsAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const header = String(formData.get('header') ?? '').trim();

  const payload: Database['public']['Tables']['netgsm_settings']['Update'] = {
    username,
    password,
    header,
    is_enabled: formData.get('is_enabled') === 'on',
  };

  const { error } = await supabase.from('netgsm_settings').upsert({ id: 'main', ...payload }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/entegrasyonlar/netgsm');
}

export async function sendTestSmsAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!phone || !message) {
    redirect('/admin/entegrasyonlar/netgsm?test=hata');
  }

  const result = await sendSms(phone, message);
  revalidatePath('/admin/entegrasyonlar/netgsm');
  redirect(`/admin/entegrasyonlar/netgsm?test=${result.ok ? 'sent' : 'failed'}`);
}

export async function sendTestSmsActionResult(formData: FormData): Promise<NetgsmActionResult> {
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (!phone || !message) {
    return { ok: false, message: 'Telefon ve mesaj zorunludur.' };
  }
  const result = await sendSms(phone, message);
  return { ok: result.ok, message: result.message };
}

export async function saveSmsTemplateAction(formData: FormData): Promise<void> {
  await requireAdminSession();
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
  revalidatePath('/admin/entegrasyonlar/netgsm');
}

export async function deleteSmsTemplateAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const key = String(formData.get('key') ?? '').trim();
  if (!key) return;

  const { error } = await supabase.from('sms_templates').delete().eq('key', key);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/entegrasyonlar/netgsm');
}
