'use server';

import { createClient as createStandaloneSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCheckoutPaymentMethodById } from '@/lib/admin/commerce-queries';
import { getPublicProductsByIds } from '@/lib/catalog/queries';
import type { CustomerAddressRow } from '@/lib/catalog/types';
import { clearStoredCommerceCouponCode } from '@/lib/commerce/coupons';
import { clearStoredGuestCartItems, getStoredGuestCartItems } from '@/lib/commerce/guest-cart';
import { getBankTransferDetails } from '@/lib/commerce/payment-display';
import { sendCustomerVerificationEmail } from '@/lib/mail/verification';
import { sendOrderCreatedEmails } from '@/lib/mail/notifications';
import { startPaymentAttempt } from '@/lib/payments/gateway';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCart, getCustomerSession, getGuestCart, getProductCheckoutPrice, getProductHref, requireCustomerSession } from '@/lib/commerce/queries';

export type CustomerSettingsActionResult = {
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

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14;
}

function getInteger(formData: FormData, key: string, fallback: number) {
  const parsed = Number.parseInt(getText(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRedirectTarget(formData: FormData, fallback: string) {
  const redirectTo = getText(formData, 'redirect_to');
  return redirectTo.startsWith('/') ? redirectTo : fallback;
}

function normalizeQuantity(value: number) {
  return Math.max(1, Math.min(value, 99));
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

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase('tr');

  if (normalizedMessage.includes('already registered') || normalizedMessage.includes('already been registered')) {
    return 'Bu e-posta adresi başka bir hesapta kullanılıyor.';
  }

  if (normalizedMessage.includes('email') && normalizedMessage.includes('invalid')) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  if (normalizedMessage.includes('password')) {
    return 'Şifre kriterlerini karşılamıyor.';
  }

  return message;
}

function assertCustomerCanTransact(isBlocked: boolean) {
  if (isBlocked) {
    throw new Error('Bu hesap için alışveriş işlemleri yönetici tarafından geçici olarak durduruldu.');
  }
}

function getRequestOrigin(headerStore: Headers) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
  const protocol = headerStore.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

function getRequestIp(headerStore: Headers) {
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || headerStore.get('x-real-ip') || '127.0.0.1';
}

function assertSupportedPaymentMethod(provider: string, integrationType: string) {
  if (integrationType === 'manual' || provider === 'offline') {
    return;
  }

  if (provider === 'paytr' || provider === 'iyzico') {
    return;
  }

  throw new Error('Bu ödeme yöntemi için canlı tahsilat adapteri henüz tanımlı değil. PayTR veya iyzico seçin ya da yöntemi manuel yapın.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasConfigText(config: Json, key: string) {
  if (!isRecord(config)) {
    return false;
  }

  return typeof config[key] === 'string' && config[key].trim().length > 0;
}

function assertPaymentMethodConfigured(provider: string, integrationType: string, config: Json) {
  if (integrationType === 'manual' || provider === 'offline') {
    return;
  }

  if (provider === 'paytr' && hasConfigText(config, 'merchantId') && hasConfigText(config, 'merchantKey') && hasConfigText(config, 'merchantSalt')) {
    return;
  }

  if (provider === 'iyzico' && hasConfigText(config, 'apiKey') && hasConfigText(config, 'secretKey')) {
    return;
  }

  throw new Error('Seçilen ödeme yöntemi için zorunlu API kimlik bilgileri eksik.');
}

function buildAddressSnapshot(formData: FormData): CustomerAddressRow {
  return {
    id: getText(formData, 'address_id') || 'checkout',
    user_id: '',
    label: getText(formData, 'address_label') || 'Teslimat',
    full_name: getText(formData, 'customer_name'),
    phone: getText(formData, 'customer_phone'),
    city: getText(formData, 'city') || 'İstanbul',
    district: getText(formData, 'district'),
    neighborhood: getText(formData, 'neighborhood'),
    address_line: getText(formData, 'address_line'),
    postal_code: getText(formData, 'postal_code'),
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function serializeAddress(address: CustomerAddressRow): Json {
  return {
    label: address.label,
    full_name: address.full_name,
    phone: address.phone,
    city: address.city,
    district: address.district,
    neighborhood: address.neighborhood,
    address_line: address.address_line,
    postal_code: address.postal_code,
  };
}

export async function addToCartAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, '/sepet');
  const { profile, user } = await requireCustomerSession(redirectTo);
  const supabase = await createClient();
  const productId = getText(formData, 'product_id');
  const quantity = normalizeQuantity(getInteger(formData, 'quantity', 1));

  assertCustomerCanTransact(profile.is_blocked);

  if (!productId) {
    throw new Error('Sepete eklemek için ürün bulunamadı.');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, price, price_mode, stock_status, status, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    throw new Error(productError.message);
  }

  if (!product || product.status !== 'published' || !product.is_active || product.stock_status === 'out_of_stock' || product.price_mode !== 'fixed' || typeof product.price !== 'number') {
    redirect('/iletisim?teklif=1');
  }

  const { data: existingItem, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingItem) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: normalizeQuantity(existingItem.quantity + quantity) })
      .eq('id', existingItem.id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        product_id: productId,
        quantity,
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath('/sepet');
  revalidatePath('/hesabim');
  redirect('/sepet?eklendi=1');
}

export async function updateCartItemAction(formData: FormData) {
  const { profile, user } = await requireCustomerSession('/sepet');
  const supabase = await createClient();
  const itemId = getText(formData, 'item_id');
  const quantity = getInteger(formData, 'quantity', 1);

  assertCustomerCanTransact(profile.is_blocked);

  if (!itemId) {
    return;
  }

  if (quantity <= 0) {
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: normalizeQuantity(quantity) })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  }

  revalidatePath('/sepet');
}

export async function removeCartItemAction(formData: FormData) {
  const { profile, user } = await requireCustomerSession('/sepet');
  const supabase = await createClient();
  const itemId = getText(formData, 'item_id');

  assertCustomerCanTransact(profile.is_blocked);

  if (!itemId) {
    return;
  }

  const { error } = await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/sepet');
  revalidatePath('/hesabim');
}

export async function toggleFavoriteAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, '/favorilerim');
  const { profile, user } = await requireCustomerSession(redirectTo);
  const supabase = await createClient();
  const productId = getText(formData, 'product_id');

  assertCustomerCanTransact(profile.is_blocked);

  if (!productId) {
    throw new Error('Favoriye eklemek için ürün bulunamadı.');
  }

  const { data: favorite, error: favoriteError } = await supabase
    .from('customer_favorites')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (favoriteError) {
    throw new Error(favoriteError.message);
  }

  if (favorite) {
    const { error } = await supabase
      .from('customer_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('customer_favorites')
      .insert({
        user_id: user.id,
        product_id: productId,
      });

    if (error) throw new Error(error.message);
  }

  revalidatePath('/favorilerim');
  revalidatePath('/hesabim');
  redirect(redirectTo);
}

export async function saveProfileAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { profile, user } = await requireCustomerSession('/hesabim/profil');
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const fullName = getText(formData, 'full_name');
  const phone = getText(formData, 'phone');
  const marketingConsent = formData.get('marketing_consent') === 'on';

  const { error } = await supabase
    .from('customer_profiles')
    .update({
      full_name: fullName,
      phone,
      marketing_consent: marketingConsent,
    })
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message, ok: false };
  }

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(isRecord(user.user_metadata) ? user.user_metadata : {}),
      full_name: fullName,
      marketing_consent: marketingConsent,
      phone,
    },
  });

  if (authError) {
    return { error: getAuthErrorMessage(authError.message), ok: false };
  }

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/profil');
  revalidatePath('/odeme');

  return {
    message: fullName !== profile.full_name || phone !== profile.phone || marketingConsent !== profile.marketing_consent
      ? 'Profil bilgileriniz güncellendi.'
      : 'Profil bilgileriniz zaten güncel.',
    ok: true,
  };
}

export async function updateCustomerEmailAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { profile, user } = await requireCustomerSession('/hesabim/profil');
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const email = normalizeEmail(getText(formData, 'email'));
  const currentEmail = normalizeEmail(user.email || profile.email || '');

  if (!validateEmail(email)) {
    return { error: 'Geçerli bir e-posta adresi girin.', ok: false };
  }

  if (email === currentEmail) {
    return { error: 'Yeni e-posta mevcut adresinizle aynı olamaz.', ok: false };
  }

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: false,
    user_metadata: {
      ...(isRecord(user.user_metadata) ? user.user_metadata : {}),
      app_email_verified: false,
    },
  });

  if (authError) {
    return { error: getAuthErrorMessage(authError.message), ok: false };
  }

  const { error: profileError } = await supabase
    .from('customer_profiles')
    .update({
      email,
      email_verified_at: null,
    })
    .eq('user_id', user.id);

  if (profileError) {
    return { error: profileError.message, ok: false };
  }

  try {
    const mailResult = await sendCustomerVerificationEmail({
      email,
      fullName: profile.full_name || email,
      userId: user.id,
    });

    revalidatePath('/hesabim');
    revalidatePath('/hesabim/profil');
    revalidatePath('/odeme');

    if (mailResult.status === 'sent') {
      return { message: 'E-posta adresiniz güncellendi. Yeni adrese doğrulama bağlantısı gönderildi.', ok: true };
    }

    return {
      message: 'E-posta adresiniz güncellendi fakat doğrulama maili gönderilemedi. Lütfen tekrar deneyin.',
      ok: true,
    };
  } catch {
    revalidatePath('/hesabim');
    revalidatePath('/hesabim/profil');
    revalidatePath('/odeme');

    return {
      message: 'E-posta adresiniz güncellendi fakat doğrulama maili gönderilemedi. Lütfen tekrar deneyin.',
      ok: true,
    };
  }
}

export async function updateCustomerPasswordAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { user } = await requireCustomerSession('/hesabim/profil');
  const adminSupabase = createAdminClient();
  const currentPassword = String(formData.get('current_password') ?? '');
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');
  const passwordError = getPasswordPolicyError(password);

  if (!currentPassword) {
    return { error: 'Mevcut şifrenizi girin.', ok: false };
  }

  if (passwordError) {
    return { error: passwordError, ok: false };
  }

  if (password !== passwordConfirm) {
    return { error: 'Şifre tekrarı eşleşmiyor.', ok: false };
  }

  if (!user.email) {
    return { error: 'Hesabınız için kayıtlı bir e-posta bulunamadı.', ok: false };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !publishableKey) {
    return { error: 'Supabase ortam değişkenleri eksik.', ok: false };
  }

  const passwordCheckClient = createStandaloneSupabaseClient<Database>(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  );
  const { error: signInError } = await passwordCheckClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Mevcut şifre hatalı.', ok: false };
  }

  await passwordCheckClient.auth.signOut();

  const { error } = await adminSupabase.auth.admin.updateUserById(user.id, { password });

  if (error) {
    return { error: getAuthErrorMessage(error.message), ok: false };
  }

  revalidatePath('/hesabim/profil');

  return { message: 'Şifreniz güncellendi.', ok: true };
}

export async function saveAddressAction(formData: FormData) {
  const { user } = await requireCustomerSession('/hesabim/adreslerim');
  const supabase = await createClient();
  const id = getText(formData, 'id');
  const { data: existingAddresses, error: existingAddressesError } = await supabase
    .from('customer_addresses')
    .select('id')
    .eq('user_id', user.id);

  if (existingAddressesError) {
    throw new Error(existingAddressesError.message);
  }

  const shouldSetDefault = formData.get('is_default') === 'on' || (!id && (existingAddresses?.length ?? 0) === 0);
  const payload = {
    user_id: user.id,
    label: getText(formData, 'address_label') || 'Teslimat',
    full_name: getText(formData, 'customer_name'),
    phone: getText(formData, 'customer_phone'),
    city: getText(formData, 'city') || 'İstanbul',
    district: getText(formData, 'district'),
    neighborhood: getText(formData, 'neighborhood'),
    address_line: getText(formData, 'address_line'),
    postal_code: getText(formData, 'postal_code'),
    is_default: shouldSetDefault,
  };

  if (shouldSetDefault) {
    const { error: resetDefaultError } = await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', user.id);
    if (resetDefaultError) {
      throw new Error(resetDefaultError.message);
    }
  }

  const { error } = id
    ? await supabase.from('customer_addresses').update(payload).eq('id', id).eq('user_id', user.id)
    : await supabase.from('customer_addresses').insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/adreslerim');
  revalidatePath('/odeme');
}

export async function setDefaultAddressAction(formData: FormData) {
  const { user } = await requireCustomerSession('/hesabim/adreslerim');
  const supabase = await createClient();
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { data: address, error: addressError } = await supabase
    .from('customer_addresses')
    .select('id, is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (addressError) {
    throw new Error(addressError.message);
  }

  if (!address || address.is_default) {
    return;
  }

  const { error: resetDefaultError } = await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', user.id);
  if (resetDefaultError) {
    throw new Error(resetDefaultError.message);
  }

  const { error: setDefaultError } = await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (setDefaultError) {
    throw new Error(setDefaultError.message);
  }

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/adreslerim');
  revalidatePath('/odeme');
}

export async function deleteAddressAction(formData: FormData) {
  const { user } = await requireCustomerSession('/hesabim/adreslerim');
  const supabase = await createClient();
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { data: address, error: addressError } = await supabase
    .from('customer_addresses')
    .select('id, is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (addressError) {
    throw new Error(addressError.message);
  }

  if (!address) {
    return;
  }

  const { error } = await supabase.from('customer_addresses').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);

  if (address.is_default) {
    const { data: nextDefaultAddress, error: nextDefaultAddressError } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nextDefaultAddressError) {
      throw new Error(nextDefaultAddressError.message);
    }

    if (nextDefaultAddress) {
      const { error: setDefaultError } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', nextDefaultAddress.id)
        .eq('user_id', user.id);

      if (setDefaultError) {
        throw new Error(setDefaultError.message);
      }
    }
  }

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/adreslerim');
  revalidatePath('/odeme');
}

export async function createOrderAction(formData: FormData) {
  const [session, guestItems] = await Promise.all([getCustomerSession(), getStoredGuestCartItems()]);
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const cart = session ? await getCart(session.user.id, undefined, guestItems) : await getGuestCart(guestItems);

  if (session) {
    assertCustomerCanTransact(session.profile.is_blocked);
  }

  if (!cart.checkoutReady) {
    redirect('/sepet?odeme=eksik');
  }

  if (formData.get('legal_acceptance') !== 'on') {
    throw new Error('Siparişi tamamlamak için ön bilgilendirme formu ve mesafeli satış sözleşmesini kabul etmelisiniz.');
  }

  if (formData.get('privacy_acceptance') !== 'on') {
    throw new Error('Siparişi tamamlamak için KVKK ve gizlilik metinlerini kabul etmelisiniz.');
  }

  if (!session && formData.get('account_policy_acceptance') !== 'on') {
    throw new Error('Hesap oluşturmak için KVKK, gizlilik ve kullanım koşullarını kabul etmelisiniz.');
  }

  const productIds = cart.lines.map((line) => line.product.id);
  const products = await getPublicProductsByIds(productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const selectedAddressId = getText(formData, 'selected_address_id');
  const selectedPaymentMethodId = getText(formData, 'payment_method_id');
  const shippingAddress = buildAddressSnapshot(formData);
  let finalAddress = shippingAddress;

  if (session && selectedAddressId) {
    const { data: address, error: addressError } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', selectedAddressId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (addressError) {
      throw new Error(addressError.message);
    }

    if (!address) {
      throw new Error('Seçili adres bulunamadı.');
    }

    finalAddress = address;
  }

  const customerName = finalAddress.full_name || session?.profile.full_name || session?.user.email || '';
  const customerPhone = finalAddress.phone || session?.profile.phone || '';
  const customerEmail = normalizeEmail(getText(formData, 'customer_email') || session?.profile.email || session?.user.email || '');
  const paymentMethod = selectedPaymentMethodId ? await getCheckoutPaymentMethodById(selectedPaymentMethodId) : null;

  if (!paymentMethod) {
    throw new Error('Geçerli bir ödeme yöntemi seçin.');
  }

  assertSupportedPaymentMethod(paymentMethod.provider, paymentMethod.integration_type);
  assertPaymentMethodConfigured(paymentMethod.provider, paymentMethod.integration_type, paymentMethod.config);

  if (!customerName || !customerPhone || !customerEmail || !finalAddress.district || !finalAddress.address_line) {
    throw new Error('Ödeme için ad, telefon, e-posta ve teslimat adresi zorunludur.');
  }

  if (!validateEmail(customerEmail)) {
    throw new Error('Geçerli bir e-posta adresi girin.');
  }

  if (!validatePhone(customerPhone)) {
    throw new Error('Geçerli bir telefon numarası girin.');
  }

  let activeUserId = session?.user.id ?? '';

  if (!session) {
    const password = String(formData.get('checkout_password') ?? '');
    const passwordConfirm = String(formData.get('checkout_password_confirm') ?? '');
    const marketingConsent = formData.get('marketing_consent') === 'on';
    const passwordError = getPasswordPolicyError(password);

    if (passwordError) {
      throw new Error(passwordError);
    }

    if (password !== passwordConfirm) {
      throw new Error('Şifre tekrarı eşleşmiyor.');
    }

    const verifiedAt = new Date().toISOString();
    const { data: createdUserResult, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true,
      password,
      user_metadata: {
        app_email_verified: true,
        full_name: customerName,
        marketing_consent: marketingConsent,
        phone: customerPhone,
      },
    });

    if (createUserError || !createdUserResult.user) {
      const message = getAuthErrorMessage(createUserError?.message ?? 'Üyelik oluşturulamadı.');
      throw new Error(message === 'Bu e-posta adresi başka bir hesapta kullanılıyor.' ? 'Bu e-posta ile kayıtlı bir üyelik var. Siparişi tamamlamak için önce giriş yapın.' : message);
    }

    const { error: profileError } = await adminSupabase.from('customer_profiles').upsert({
      user_id: createdUserResult.user.id,
      email: customerEmail,
      email_verified_at: verifiedAt,
      full_name: customerName,
      marketing_consent: marketingConsent,
      phone: customerPhone,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: customerEmail,
      password,
    });

    if (signInError || !signInData.user) {
      throw new Error('Üyelik oluşturuldu ancak oturum açılamadı. Lütfen giriş yapıp siparişinizi tekrar deneyin.');
    }

    activeUserId = signInData.user.id;
  }

  if (!activeUserId) {
    throw new Error('Sipariş için oturum bilgisi oluşturulamadı.');
  }

  if (formData.get('save_address') === 'on' && !selectedAddressId) {
    const { data: existingAddresses } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('user_id', activeUserId)
      .limit(1);

    const { error: addressInsertError } = await supabase
      .from('customer_addresses')
      .insert({
        user_id: activeUserId,
        label: finalAddress.label,
        full_name: customerName,
        phone: customerPhone,
        city: finalAddress.city,
        district: finalAddress.district,
        neighborhood: finalAddress.neighborhood,
        address_line: finalAddress.address_line,
        postal_code: finalAddress.postal_code,
        is_default: !existingAddresses || existingAddresses.length === 0,
      });

    if (addressInsertError) {
      throw new Error(addressInsertError.message);
    }
  }

  const orderLines = cart.lines.map((line) => {
    const product = productsById.get(line.product.id) ?? line.product;
    const unitPrice = getProductCheckoutPrice(product);

    if (unitPrice == null) {
      throw new Error(`${product.title} için doğrudan ödeme fiyatı yok.`);
    }

    return {
      product,
      productHref: getProductHref(product),
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
    };
  });

  const subtotal = orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discountTotal = cart.discountTotal;
  const total = Math.max(0, subtotal - discountTotal);
  const bankDetails = getBankTransferDetails(paymentMethod.config);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: activeUserId,
      status: 'pending_payment',
      payment_status: 'pending',
      payment_method_id: paymentMethod.id,
      payment_provider: paymentMethod.provider,
      currency: 'TRY',
      subtotal,
      discount_total: discountTotal,
      total,
      coupon_id: cart.coupon?.id ?? null,
      coupon_code: cart.coupon?.code ?? null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: serializeAddress({
        ...finalAddress,
        full_name: customerName,
        phone: customerPhone,
      }),
      billing_address: serializeAddress({
        ...finalAddress,
        full_name: customerName,
        phone: customerPhone,
      }),
      note: getText(formData, 'note'),
      payment_reference: null,
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? 'Sipariş oluşturulamadı.');
  }

  const { error: orderItemsError } = await supabase.from('order_items').insert(
    orderLines.map((line) => ({
      order_id: order.id,
      product_id: line.product.id,
      product_title: line.product.title,
      product_slug: line.product.slug,
      product_image_url: line.product.featuredImageUrl ?? '',
      unit_price: line.unitPrice,
      quantity: line.quantity,
      line_total: line.lineTotal,
    }))
  );

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const { data: paymentAttempt, error: paymentAttemptError } = await supabase
    .from('payment_attempts')
    .insert({
      order_id: order.id,
      user_id: activeUserId,
      payment_method_id: paymentMethod.id,
      provider: paymentMethod.provider,
      status: 'pending',
      amount: total,
      currency: 'TRY',
      provider_reference: null,
      metadata: {
        account_owner: bankDetails.accountOwner,
        bank_name: bankDetails.bankName,
        coupon_code: cart.coupon?.code ?? null,
        code: paymentMethod.code,
        discount_total: discountTotal,
        iban: bankDetails.iban,
        instructions: paymentMethod.instructions,
        integration_type: paymentMethod.integration_type,
        method_name: paymentMethod.name,
        support_phone: bankDetails.supportPhone,
      },
    })
    .select()
    .single();

  if (paymentAttemptError || !paymentAttempt) {
    throw new Error(paymentAttemptError?.message ?? 'Ödeme denemesi oluşturulamadı.');
  }

  if (cart.coupon) {
    const { error: couponUpdateError } = await adminSupabase
      .from('coupons')
      .update({
        usage_count: cart.coupon.usageCount + 1,
      })
      .eq('id', cart.coupon.id);

    if (couponUpdateError) {
      throw new Error(couponUpdateError.message);
    }
  }

  if (session) {
    const { error: clearCartError } = await supabase.from('cart_items').delete().eq('user_id', activeUserId);

    if (clearCartError) {
      throw new Error(clearCartError.message);
    }
  }

  if (guestItems.length > 0) {
    await clearStoredGuestCartItems();
  }

  await clearStoredCommerceCouponCode();

  revalidatePath('/sepet');
  revalidatePath('/odeme');
  revalidatePath('/hesabim');
  revalidatePath('/hesabim/siparislerim');

  await sendOrderCreatedEmails({
    customerPhone,
    order,
    orderLines,
    paymentMethod,
  }).catch((error) => {
    console.error('Order email notification failed:', error);
  });

  const headerStore = await headers();
  const paymentStart = await startPaymentAttempt(paymentAttempt.id, {
    origin: getRequestOrigin(headerStore),
    userIp: getRequestIp(headerStore),
  });

  redirect(paymentStart.redirectTo);
}

export async function signOutCustomerAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/giris');
}
