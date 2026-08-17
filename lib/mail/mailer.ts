import 'server-only';

import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';
import type { Json } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';

export type EmailTemplateKey =
  | 'admin_order_created'
  | 'admin_inquiry_received'
  | 'customer_email_verification'
  | 'customer_inquiry_received'
  | 'customer_order_created'
  | 'customer_order_status_updated'
  | 'customer_payment_status_updated'
  | 'marketing_campaign_announcement'
  | 'marketing_discount_offer'
  | 'marketing_service_reminder'
  | 'smtp_test';

type TemplateVariableValue = number | string | null | undefined;

type SendTemplatedMailInput = {
  metadata?: Record<string, Json | number | string | boolean | null>;
  rawHtmlVariables?: string[];
  templateKey: EmailTemplateKey;
  throwOnError?: boolean;
  to: string;
  variables?: Record<string, TemplateVariableValue>;
};

type SendTemplatedMailResult = {
  error?: string;
  status: 'failed' | 'sent' | 'skipped';
};

const SMTP_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVariable(value: TemplateVariableValue) {
  if (value == null) {
    return '';
  }

  return String(value);
}

function renderTemplateString(
  template: string,
  variables: Record<string, TemplateVariableValue>,
  mode: 'html' | 'text',
  rawHtmlVariables = new Set<string>()
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = normalizeVariable(variables[key]);

    if (mode === 'html' && !rawHtmlVariables.has(key)) {
      return escapeHtml(value);
    }

    return value;
  });
}

function formatAddress(name: string, email: string) {
  const safeName = name.replaceAll('"', "'");
  return safeName ? `"${safeName}" <${email}>` : email;
}

function buildPreheader(preheader: string) {
  if (!preheader) {
    return '';
  }

  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`;
}

async function logEmail(input: {
  error?: string;
  metadata?: Record<string, Json | number | string | boolean | null>;
  recipientEmail: string;
  status: SendTemplatedMailResult['status'];
  subject?: string;
  templateKey: EmailTemplateKey;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from('email_logs').insert({
      error_message: input.error ?? '',
      metadata: (input.metadata ?? {}) as Json,
      recipient_email: input.recipientEmail,
      status: input.status,
      subject: input.subject ?? '',
      template_key: input.templateKey,
    });
  } catch (error) {
    console.error('Email log write failed:', error);
  }
}

export function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || process.env.APP_URL?.trim();
  return (configuredOrigin || 'http://localhost:3000').replace(/\/$/, '');
}

export async function sendTemplatedMail({
  metadata,
  rawHtmlVariables = [],
  templateKey,
  throwOnError = false,
  to,
  variables = {},
}: SendTemplatedMailInput): Promise<SendTemplatedMailResult> {
  const supabase = createAdminClient();
  const [{ data: settings, error: settingsError }, { data: template, error: templateError }] = await Promise.all([
    supabase.from('smtp_settings').select('*').eq('id', SMTP_SETTINGS_ID).maybeSingle(),
    supabase.from('email_templates').select('*').eq('key', templateKey).maybeSingle(),
  ]);

  if (settingsError || templateError) {
    const error = settingsError?.message ?? templateError?.message ?? 'Mail ayarları okunamadı.';
    await logEmail({ error, metadata, recipientEmail: to, status: 'failed', templateKey });

    if (throwOnError) {
      throw new Error(error);
    }

    return { error, status: 'failed' };
  }

  if (!template?.is_enabled) {
    const error = 'Mail şablonu pasif.';
    await logEmail({ error, metadata, recipientEmail: to, status: 'skipped', templateKey });
    return { error, status: 'skipped' };
  }

  if (!settings?.is_enabled || !settings.host || !settings.from_email || !to) {
    const error = 'SMTP ayarı aktif değil veya zorunlu alanlar eksik.';
    await logEmail({ error, metadata, recipientEmail: to, status: 'skipped', templateKey });
    return { error, status: 'skipped' };
  }

  const rawHtmlSet = new Set(rawHtmlVariables);
  const subject = renderTemplateString(template.subject, variables, 'text');
  const preheader = renderTemplateString(template.preheader, variables, 'text');
  const renderedHtml = renderTemplateString(template.html_body, variables, 'html', rawHtmlSet);
  const renderedText = template.text_body
    ? renderTemplateString(template.text_body, variables, 'text')
    : stripHtml(renderedHtml);

  const transporter = nodemailer.createTransport({
    auth: settings.username
      ? {
          pass: settings.password,
          user: settings.username,
        }
      : undefined,
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
  });

  const mailOptions: SendMailOptions = {
    from: formatAddress(settings.from_name, settings.from_email),
    html: `${buildPreheader(preheader)}${renderedHtml}`,
    replyTo: settings.reply_to || undefined,
    subject,
    text: renderedText,
    to,
  };

  try {
    await transporter.sendMail(mailOptions);
    await logEmail({ metadata, recipientEmail: to, status: 'sent', subject, templateKey });
    return { status: 'sent' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mail gönderilemedi.';
    await logEmail({ error: message, metadata, recipientEmail: to, status: 'failed', subject, templateKey });

    if (throwOnError) {
      throw new Error(message);
    }

    return { error: message, status: 'failed' };
  }
}

export type SmtpTestResult = {
  ok: boolean;
  message: string;
};

/**
 * SMTP bağlantı testi. Kayıtlı ayarlarla bir test e-postası gönderir.
 * Toast: "SMTP bağlantısı başarıyla doğrulandı."
 */
export async function testSmtpConnection(): Promise<SmtpTestResult> {
  const supabase = createAdminClient();
  const { data: settings, error: settingsError } = await supabase
    .from('smtp_settings')
    .select('*')
    .eq('id', SMTP_SETTINGS_ID)
    .maybeSingle();

  if (settingsError) return { ok: false, message: 'SMTP ayarları okunamadı.' };
  if (!settings?.host || !settings?.from_email) {
    return { ok: false, message: 'SMTP ayarı eksik: host ve gönderen e-posta gerekli.' };
  }

  const transporter = nodemailer.createTransport({
    auth: settings.username ? { pass: settings.password, user: settings.username } : undefined,
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: formatAddress(settings.from_name, settings.from_email),
      html: '<p>Bu bir SMTP test mesajıdır. Bağlantı başarıyla doğrulandı. 🎉</p>',
      subject: 'SMTP Bağlantı Testi',
      text: 'Bu bir SMTP test mesajıdır. Bağlantı başarıyla doğrulandı.',
      to: settings.admin_notification_email || settings.from_email,
    });
    await logEmail({ recipientEmail: settings.admin_notification_email || settings.from_email, status: 'sent', subject: 'SMTP Bağlantı Testi', templateKey: 'smtp_test' });
    return { ok: true, message: 'SMTP bağlantısı başarıyla doğrulandı.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP bağlantısı kurulamadı.';
    return { ok: false, message };
  }
}
