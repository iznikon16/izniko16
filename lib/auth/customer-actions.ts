'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import { writeAuditLog } from '@/lib/audit/queries';
import { getCustomerAccessStatus } from '@/lib/auth/customer-access';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import { getPasswordPolicyError } from '@/lib/auth/password-policy';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendCustomerVerificationEmail } from '@/lib/mail/verification';
import { verifyAltchaFormData } from '@/lib/security/altcha';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getMfaStatus } from '@/lib/auth/mfa';

export type AuthActionResult = {
  error?: string;
  message?: string;
  mfaRequired?: boolean;
  ok: boolean;
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getNonCustomerResetEmail(email: string) {
  const digest = createHash('sha256').update(email).digest('hex').slice(0, 24);
  return `reset-${digest}@example.invalid`;
}

function getAuthErrorMessage(message: string, fallback = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.') {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }

  if (normalizedMessage.includes('banned') || normalizedMessage.includes('disabled')) {
    return 'Kullanıcı hesabınız pasif durumda.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'E-posta adresinizi doğrulamanız gerekiyor.';
  }

  if (normalizedMessage.includes('already registered') || normalizedMessage.includes('already been registered')) {
    return 'Bu e-posta adresiyle kayıtlı bir üyelik var.';
  }

  if (normalizedMessage.includes('password')) {
    return 'Şifre kriterlerini karşılamıyor.';
  }

  return fallback;
}

function getRequestIp(headerStore: Headers) {
  return (headerStore.get('x-forwarded-for')?.split(',')[0] || headerStore.get('x-real-ip') || 'unknown').trim();
}

function getRequestOrigin(headerStore: Headers) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, '');

  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || 'localhost:3006';
  const protocol = headerStore.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function clearCustomerLoginSession(client: Awaited<ReturnType<typeof createServerClient>>) {
  const { error } = await client.auth.signOut({ scope: 'global' });

  if (error) {
    await client.auth.signOut({ scope: 'local' });
  }
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14;
}

export async function registerCustomerAction(formData: FormData): Promise<AuthActionResult> {
  const email = normalizeEmail(getText(formData, 'email'));
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');
  const fullName = getText(formData, 'full_name');
  const phone = getText(formData, 'phone');
  const marketingConsent = formData.get('marketing_consent') === 'on';

  if (formData.get('account_policy_acceptance') !== 'on') {
    return { error: 'Üyelik oluşturmak için KVKK, gizlilik ve kullanım koşullarını kabul etmelisiniz.', ok: false };
  }

  if (!fullName || !validateEmail(email) || !validatePhone(phone)) {
    return { error: 'Ad soyad, telefon ve geçerli e-posta bilgileri zorunludur.', ok: false };
  }

  const passwordError = getPasswordPolicyError(password);

  if (passwordError) {
    return { error: passwordError, ok: false };
  }

  if (password !== passwordConfirm) {
    return { error: 'Şifre tekrarı eşleşmiyor.', ok: false };
  }

  if (!(await verifyAltchaFormData(formData))) {
    return { error: 'Güvenlik doğrulaması tamamlanamadı. Lütfen tekrar deneyin.', ok: false };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      app_email_verified: false,
      full_name: fullName,
      marketing_consent: marketingConsent,
      phone,
    },
  });

  if (error || !data.user) {
    return { error: getAuthErrorMessage(error?.message ?? '', 'Üyelik oluşturulamadı. Lütfen tekrar deneyin.'), ok: false };
  }

  const { error: profileError } = await adminSupabase.from('customer_profiles').upsert({
    email,
    email_verified_at: null,
    full_name: fullName,
    marketing_consent: marketingConsent,
    phone,
    user_id: data.user.id,
  });

  if (profileError) {
    return { error: 'Üyelik profili oluşturulamadı. Lütfen site yönetimiyle iletişime geçin.', ok: false };
  }

  const mailResult = await sendCustomerVerificationEmail({
    email,
    fullName,
    userId: data.user.id,
  });

  if (mailResult.status === 'sent') {
    return { message: 'Üyelik oluşturuldu. E-posta doğrulama bağlantısını gelen kutunuza gönderdik.', ok: true };
  }

  return {
    message: 'Üyelik oluşturuldu fakat doğrulama maili gönderilemedi. Lütfen site yönetimiyle iletişime geçin.',
    ok: true,
  };
}

export async function loginCustomerAction(formData: FormData): Promise<AuthActionResult> {
  const email = normalizeEmail(getText(formData, 'email'));
  const password = String(formData.get('password') ?? '');
  const headerStore = await headers();
  const ip = getRequestIp(headerStore);

  if (!validateEmail(email) || !password) {
    return { error: 'E-posta ve şifre zorunludur.', ok: false };
  }

  const rateLimit = checkRateLimit(`customer-login:${ip}:${email}`, 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    await writeAuditLog({
      action: 'customer_login_failure',
      ip,
      metadata: { email, reason: 'rate_limit_exceeded' },
      resourceType: 'auth',
    });
    return { error: 'Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.', ok: false };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const normalizedError = error?.message.toLocaleLowerCase('tr') ?? '';
    await writeAuditLog({
      action: 'customer_login_failure',
      ip,
      metadata: {
        email,
        reason: normalizedError.includes('banned') || normalizedError.includes('disabled')
          ? 'inactive_customer'
          : 'invalid_credentials',
      },
      resourceType: 'auth',
    });
    return { error: getAuthErrorMessage(error?.message ?? '', 'Giriş yapılamadı. Lütfen tekrar deneyin.'), ok: false };
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from('customer_profiles')
    .select('email_verified_at, full_name, is_blocked')
    .eq('user_id', data.user.id)
    .maybeSingle();
  const accessStatus = getCustomerAccessStatus(profile);

  if (profileError || accessStatus === 'missing_profile' || !profile) {
    await clearCustomerLoginSession(supabase);
    await writeAuditLog({
      actorUserId: data.user.id,
      action: 'customer_login_failure',
      ip,
      metadata: { email, reason: profileError ? 'profile_lookup_failed' : 'customer_profile_missing' },
      resourceType: 'auth',
    });
    return { error: 'Bu hesap müşteri portalına tanımlı değil.', ok: false };
  }

  if (accessStatus === 'blocked') {
    await clearCustomerLoginSession(supabase);
    await writeAuditLog({
      actorUserId: data.user.id,
      action: 'customer_login_failure',
      ip,
      metadata: { email, reason: 'inactive_customer' },
      resourceType: 'auth',
    });
    return { error: 'Kullanıcı hesabınız pasif durumda.', ok: false };
  }

  if (accessStatus === 'unverified') {
    await clearCustomerLoginSession(supabase);

    if (data.user.user_metadata?.app_email_verified !== false) {
      await writeAuditLog({
        actorUserId: data.user.id,
        action: 'customer_login_failure',
        ip,
        metadata: { email, reason: 'customer_membership_missing' },
        resourceType: 'auth',
      });
      return { error: 'Bu hesap müşteri portalına tanımlı değil.', ok: false };
    }

    const mailResult = await sendCustomerVerificationEmail({
      email,
      fullName: profile.full_name || data.user.user_metadata?.full_name || email,
      userId: data.user.id,
    }).catch(() => ({ status: 'failed' as const }));

    await writeAuditLog({
      actorUserId: data.user.id,
      action: 'customer_login_failure',
      ip,
      metadata: { email, reason: 'email_not_verified', verificationEmailStatus: mailResult.status },
      resourceType: 'auth',
    });

    return {
      error:
        mailResult.status === 'sent'
          ? 'E-posta adresinizi doğrulamanız gerekiyor. Yeni doğrulama bağlantısı gönderdik.'
          : 'E-posta adresinizi doğrulamanız gerekiyor fakat doğrulama maili gönderilemedi.',
      ok: false,
    };
  }

  const mfaStatus = await getMfaStatus(supabase);
  if (!mfaStatus.available) {
    await clearCustomerLoginSession(supabase);
    return { error: 'İki aşamalı doğrulama durumu kontrol edilemedi. Lütfen tekrar deneyin.', ok: false };
  }
  await writeAuditLog({
    actorUserId: data.user.id,
    action: 'customer_login_success',
    ip,
    metadata: { email, mfa_required: mfaStatus.requiresChallenge },
    resourceType: 'auth',
  });

  return { mfaRequired: mfaStatus.requiresChallenge, ok: true };
}

export async function submitCustomerLoginAction(
  _previousState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const result = await loginCustomerAction(formData);

  if (!result.ok) {
    return result;
  }

  const redirectTo = getSafeCustomerRedirectPath(getText(formData, 'next'));
  revalidatePath('/', 'layout');
  if (result.mfaRequired) {
    redirect(`/giris/mfa?next=${encodeURIComponent(redirectTo)}`, RedirectType.replace);
  }
  redirect(redirectTo, RedirectType.replace);
}

export async function requestCustomerPasswordResetAction(
  _previousState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = normalizeEmail(getText(formData, 'email'));
  if (!validateEmail(email)) {
    return { error: 'Geçerli bir e-posta adresi girin.', ok: false };
  }

  const headerStore = await headers();
  const ip = getRequestIp(headerStore);
  const rateLimit = checkRateLimit(`customer-password-reset:${ip}:${email}`, 3, 30 * 60 * 1000);
  const genericResult = {
    message: 'Bu adresle eşleşen aktif bir hesap varsa şifre yenileme bağlantısı gönderildi.',
    ok: true,
  } satisfies AuthActionResult;

  if (!rateLimit.success) {
    await writeAuditLog({ action: 'customer_password_reset_rate_limited', ip, resourceType: 'auth' });
    return genericResult;
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from('customer_profiles')
    .select('is_blocked')
    .eq('email', email)
    .maybeSingle();
  const eligibleCustomer = !profileError && Boolean(profile && !profile.is_blocked);

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    eligibleCustomer ? email : getNonCustomerResetEmail(email),
    {
    redirectTo: `${getRequestOrigin(headerStore)}/auth/sifre-yenile`,
    }
  );

  await writeAuditLog({
    action: 'customer_password_reset_requested',
    ip,
    metadata: { eligibleCustomer, profileLookupFailed: Boolean(profileError), providerAccepted: !error },
    resourceType: 'auth',
  });

  if (error) console.warn('Password reset request was not accepted by Supabase:', error.message);
  return genericResult;
}

export async function completeCustomerPasswordResetAction(
  _previousState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');
  const passwordError = getPasswordPolicyError(password);

  if (passwordError) return { error: passwordError, ok: false };
  if (password !== passwordConfirm) return { error: 'Şifre tekrarı eşleşmiyor.', ok: false };

  const supabase = await createServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: 'Şifre yenileme bağlantısının süresi dolmuş veya bağlantı geçersiz.', ok: false };
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from('customer_profiles')
    .select('is_blocked')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (profileError || !profile || profile.is_blocked) {
    await clearCustomerLoginSession(supabase);
    return { error: 'Bu bağlantı aktif bir müşteri hesabına ait değil.', ok: false };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: getAuthErrorMessage(error.message, 'Şifre güncellenemedi. Lütfen yeni bağlantı isteyin.'), ok: false };

  await writeAuditLog({
    actorUserId: userData.user.id,
    action: 'customer_password_reset_completed',
    resourceId: userData.user.id,
    resourceType: 'auth',
  });
  await clearCustomerLoginSession(supabase);
  revalidatePath('/', 'layout');
  redirect('/giris?sifre=degisti', RedirectType.replace);
}
