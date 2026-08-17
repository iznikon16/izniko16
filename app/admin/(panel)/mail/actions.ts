'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/admin';
import { testSmtpConnection } from '@/lib/mail/mailer';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

const SMTP_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

export async function saveSmtpSettingsAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const payload: Database['public']['Tables']['smtp_settings']['Update'] = {
    admin_notification_email: getText(formData, 'admin_notification_email'),
    from_email: getText(formData, 'from_email'),
    from_name: getText(formData, 'from_name'),
    host: getText(formData, 'host'),
    is_enabled: formData.get('is_enabled') === 'on',
    port: Number(getText(formData, 'port') || 587) || 587,
    reply_to: getText(formData, 'reply_to'),
    secure: formData.get('secure') === 'on',
    username: getText(formData, 'username'),
  };

  const passwordValue = formData.get('password');
  if (typeof passwordValue === 'string' && passwordValue.trim()) {
    payload.password = passwordValue.trim();
  }

  const { error } = await supabase.from('smtp_settings').upsert({ id: SMTP_SETTINGS_ID, ...payload }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/mail');
  redirect('/admin/mail?saved=smtp');
}

export async function saveEmailTemplateAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const key = getText(formData, 'key');

  const payload: Database['public']['Tables']['email_templates']['Update'] = {
    html_body: String(formData.get('html_body') ?? ''),
    is_enabled: formData.get('is_enabled') === 'on',
    preheader: getText(formData, 'preheader'),
    subject: getText(formData, 'subject'),
    text_body: String(formData.get('text_body') ?? ''),
  };

  const { error } = await supabase.from('email_templates').update(payload).eq('key', key);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/mail');
}

export async function sendSmtpTestAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const result = await testSmtpConnection();
  redirect(`/admin/mail?test=${result.ok ? 'sent' : 'failed'}`);
}

export type MailTestResult = {
  ok: boolean;
  message: string;
};

export async function testSmtpAction(): Promise<MailTestResult> {
  await requireAdminSession();
  return testSmtpConnection();
}
