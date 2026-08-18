'use server';

import { redirect } from 'next/navigation';
import { requireAdminPermission } from '@/lib/auth/admin';
import { getSiteOrigin, sendTemplatedMail, type EmailTemplateKey } from '@/lib/mail/mailer';
import { createAdminClient } from '@/lib/supabase/admin';

const marketingTemplateKeys = [
  'marketing_campaign_announcement',
  'marketing_discount_offer',
  'marketing_service_reminder',
] as const satisfies EmailTemplateKey[];

type MarketingTemplateKey = (typeof marketingTemplateKeys)[number];

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function isMarketingTemplateKey(value: string): value is MarketingTemplateKey {
  return marketingTemplateKeys.includes(value as MarketingTemplateKey);
}

export async function sendMarketingEmailAction(formData: FormData) {
  await requireAdminPermission('marketing.manage');
  const templateKey = getText(formData, 'template_key');
  const campaignTitle = getText(formData, 'campaign_title');
  const campaignHeadline = getText(formData, 'campaign_headline');
  const campaignBody = getText(formData, 'campaign_body');
  const ctaLabel = getText(formData, 'cta_label') || 'Detayları İncele';
  const ctaUrl = getText(formData, 'cta_url') || getSiteOrigin();

  if (!isMarketingTemplateKey(templateKey)) {
    throw new Error('Geçerli bir pazarlama şablonu seçin.');
  }

  if (!campaignTitle || !campaignHeadline || !campaignBody) {
    throw new Error('Kampanya başlığı, ana mesaj ve içerik zorunludur.');
  }

  const supabase = createAdminClient();
  const { data: recipients, error } = await supabase
    .from('customer_profiles')
    .select('user_id, email, full_name')
    .eq('marketing_consent', true)
    .eq('is_blocked', false)
    .neq('email', '')
    .not('email_verified_at', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  let failed = 0;
  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients ?? []) {
    const result = await sendTemplatedMail({
      metadata: {
        campaignTitle,
        marketing: true,
        userId: recipient.user_id,
      },
      templateKey,
      to: recipient.email,
      variables: {
        campaign_body: campaignBody,
        campaign_headline: campaignHeadline,
        campaign_title: campaignTitle,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
        customer_email: recipient.email,
        customer_name: recipient.full_name || recipient.email,
        sent_at: new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
        site_url: getSiteOrigin(),
        unsubscribe_note: 'Bu iletiyi pazarlama izni verdiğiniz için aldınız. Tercihinizi Hesabım sayfasından değiştirebilirsiniz.',
      },
    });

    if (result.status === 'sent') {
      sent += 1;
    } else if (result.status === 'skipped') {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  redirect(`/admin/marketing?sent=${sent}&failed=${failed}&skipped=${skipped}`);
}
