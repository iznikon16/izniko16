import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { getSiteOrigin, sendTemplatedMail } from '@/lib/mail/mailer';
import { createAdminClient } from '@/lib/supabase/admin';

const VERIFICATION_TOKEN_TTL_HOURS = 24;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function buildVerificationUrl(token: string) {
  return `${getSiteOrigin()}/e-posta-onayla?token=${encodeURIComponent(token)}`;
}

export async function sendCustomerVerificationEmail({
  email,
  fullName,
  userId,
}: {
  email: string;
  fullName: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await supabase
    .from('email_verification_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('consumed_at', null);

  const { error } = await supabase.from('email_verification_tokens').insert({
    email,
    expires_at: expiresAt,
    token_hash: hashToken(token),
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return sendTemplatedMail({
    metadata: { userId },
    templateKey: 'customer_email_verification',
    to: email,
    variables: {
      customer_email: email,
      customer_name: fullName || email,
      expires_in: `${VERIFICATION_TOKEN_TTL_HOURS} saat`,
      site_url: getSiteOrigin(),
      verification_url: buildVerificationUrl(token),
    },
  });
}

export async function verifyCustomerEmailToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return { message: 'Doğrulama bağlantısı eksik.', ok: false };
  }

  const supabase = createAdminClient();
  const { data: verificationToken, error } = await supabase
    .from('email_verification_tokens')
    .select('*')
    .eq('token_hash', hashToken(normalizedToken))
    .is('consumed_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!verificationToken) {
    return { message: 'Bu doğrulama bağlantısı geçersiz veya daha önce kullanılmış.', ok: false };
  }

  if (new Date(verificationToken.expires_at).getTime() < Date.now()) {
    return { message: 'Doğrulama bağlantısının süresi dolmuş. Giriş ekranından yeni bağlantı isteyin.', ok: false };
  }

  const verifiedAt = new Date().toISOString();
  const [{ error: tokenError }, { error: profileError }, { error: authError }] = await Promise.all([
    supabase.from('email_verification_tokens').update({ consumed_at: verifiedAt }).eq('id', verificationToken.id),
    supabase.from('customer_profiles').update({ email_verified_at: verifiedAt }).eq('user_id', verificationToken.user_id),
    supabase.auth.admin.updateUserById(verificationToken.user_id, { email_confirm: true }),
  ]);

  if (tokenError || profileError || authError) {
    throw new Error(tokenError?.message ?? profileError?.message ?? authError?.message ?? 'E-posta doğrulanamadı.');
  }

  return { message: 'E-posta adresiniz doğrulandı. Artık hesabınıza giriş yapabilirsiniz.', ok: true };
}
