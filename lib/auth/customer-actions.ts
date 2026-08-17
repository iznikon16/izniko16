'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendCustomerVerificationEmail } from '@/lib/mail/verification';
import { verifyAltchaFormData } from '@/lib/security/altcha';

type AuthActionResult = {
  error?: string;
  message?: string;
  ok: boolean;
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('tr');
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase('tr');

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
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

  return message;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14;
}

function getPasswordPolicyError(password: string) {
  if (password.length < 8) {
    return 'Şifre en az 8 karakter olmalıdır.';
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Şifre büyük ve küçük harf içermelidir.';
  }

  if (!/\d/.test(password)) {
    return 'Şifre en az 1 rakam içermelidir.';
  }

  if (/\s/.test(password)) {
    return 'Şifre boşluk içeremez.';
  }

  return null;
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
    return { error: getAuthErrorMessage(error?.message ?? 'Üyelik oluşturulamadı.'), ok: false };
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
    return { error: profileError.message, ok: false };
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

  if (!validateEmail(email) || !password) {
    return { error: 'E-posta ve şifre zorunludur.', ok: false };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: getAuthErrorMessage(error?.message ?? 'Giriş yapılamadı.'), ok: false };
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from('customer_profiles')
    .select('email_verified_at, full_name')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return { error: profileError.message, ok: false };
  }

  if (!profile?.email_verified_at) {
    await supabase.auth.signOut();
    const mailResult = await sendCustomerVerificationEmail({
      email,
      fullName: profile?.full_name || data.user.user_metadata?.full_name || email,
      userId: data.user.id,
    });

    return {
      error:
        mailResult.status === 'sent'
          ? 'E-posta adresinizi doğrulamanız gerekiyor. Yeni doğrulama bağlantısı gönderdik.'
          : 'E-posta adresinizi doğrulamanız gerekiyor fakat doğrulama maili gönderilemedi.',
      ok: false,
    };
  }

  return { ok: true };
}
