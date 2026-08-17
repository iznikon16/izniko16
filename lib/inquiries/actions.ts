'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSiteOrigin, sendTemplatedMail } from '@/lib/mail/mailer';
import { verifyAltchaFormData } from '@/lib/security/altcha';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerInquiryRow } from '@/lib/catalog/types';
import type { Json } from '@/lib/supabase/database.types';

type InquirySource = 'contact' | 'discovery' | 'product_offer';

const sourceLabels: Record<InquirySource, string> = {
  contact: 'İletişim Formu',
  discovery: 'Şasi ile Parça Talebi',
  product_offer: 'Ürün Teklifi',
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function normalizeSource(value: string): InquirySource {
  if (value === 'discovery' || value === 'product_offer') {
    return value;
  }

  return 'contact';
}

function validateEmail(email: string) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRedirectTarget(formData: FormData, fallback: string) {
  const redirectTo = getText(formData, 'redirect_to');
  return redirectTo.startsWith('/') ? redirectTo : fallback;
}

async function getAdminNotificationEmail() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('smtp_settings')
    .select('admin_notification_email')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  return data?.admin_notification_email?.trim() ?? '';
}

function buildVariables(inquiry: CustomerInquiryRow) {
  const siteOrigin = getSiteOrigin();
  const inquirySubject = inquiry.subject || sourceLabels[inquiry.source as InquirySource] || 'Yeni Talep';

  return {
    admin_inquiry_url: `${siteOrigin}/admin/inquiries?query=${encodeURIComponent(inquiry.phone || inquiry.email || inquiry.full_name)}`,
    customer_email: inquiry.email,
    customer_name: inquiry.full_name || 'Ziyaretçi',
    customer_phone: inquiry.phone,
    inquiry_id: inquiry.id,
    inquiry_location: inquiry.location || 'Belirtilmedi',
    inquiry_message: inquiry.message || 'Mesaj girilmedi.',
    inquiry_source: sourceLabels[inquiry.source as InquirySource] ?? inquiry.source,
    inquiry_subject: inquirySubject,
    product_title: inquiry.product_title || 'Belirtilmedi',
    services: inquiry.services.length > 0 ? inquiry.services.join(', ') : 'Belirtilmedi',
    site_url: siteOrigin,
  };
}

async function sendInquiryEmails(inquiry: CustomerInquiryRow) {
  const variables = buildVariables(inquiry);
  const adminEmail = await getAdminNotificationEmail();
  const jobs: Array<Promise<unknown>> = [];

  if (adminEmail) {
    jobs.push(
      sendTemplatedMail({
        metadata: { inquiryId: inquiry.id },
        templateKey: 'admin_inquiry_received',
        to: adminEmail,
        variables,
      })
    );
  }

  if (inquiry.email) {
    jobs.push(
      sendTemplatedMail({
        metadata: { inquiryId: inquiry.id },
        templateKey: 'customer_inquiry_received',
        to: inquiry.email,
        variables,
      })
    );
  }

  await Promise.allSettled(jobs);
}

export async function submitInquiryAction(formData: FormData) {
  const supabase = createAdminClient();
  const source = normalizeSource(getText(formData, 'source'));
  const fullName = getText(formData, 'full_name');
  const phone = getText(formData, 'phone');
  const email = getText(formData, 'email').toLocaleLowerCase('tr');
  const subject = getText(formData, 'subject') || sourceLabels[source];
  const message = getText(formData, 'message');
  const services = formData
    .getAll('services')
    .map((service) => String(service).trim())
    .filter(Boolean);
  const redirectTo = getRedirectTarget(formData, source === 'discovery' ? '/sasi-sorgulama' : '/iletisim');

  if (!fullName || !phone) {
    redirect(`${redirectTo}?talep=hata`);
  }

  if (!validateEmail(email)) {
    redirect(`${redirectTo}?talep=hata`);
  }

  if (formData.get('privacy_acceptance') !== 'on') {
    redirect(`${redirectTo}?talep=politika`);
  }

  if (!(await verifyAltchaFormData(formData))) {
    redirect(`${redirectTo}?talep=guvenlik`);
  }

  const productId = getText(formData, 'product_id');
  const metadata: Record<string, Json | string> = {
    page: redirectTo,
  };

  const { data: inquiry, error } = await supabase
    .from('customer_inquiries')
    .insert({
      email,
      full_name: fullName,
      location: getText(formData, 'location'),
      message,
      metadata,
      phone,
      product_id: productId || null,
      product_title: getText(formData, 'product_title'),
      services,
      source,
      subject,
    })
    .select()
    .single();

  if (error || !inquiry) {
    throw new Error(error?.message ?? 'Talep kaydedilemedi.');
  }

  await sendInquiryEmails(inquiry).catch((mailError) => {
    console.error('Inquiry email notification failed:', mailError);
  });

  revalidatePath('/admin/inquiries');
  redirect(`${redirectTo}?talep=alindi`);
}
