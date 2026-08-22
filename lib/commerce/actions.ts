'use server';

import { createClient as createStandaloneSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCheckoutPaymentMethodById } from '@/lib/admin/commerce-queries';
import { writeAuditLog } from '@/lib/audit/queries';
import { getPublicProductsByIds } from '@/lib/catalog/queries';
import type { CustomerAddressRow } from '@/lib/catalog/types';
import { clearStoredCommerceCouponCode } from '@/lib/commerce/coupons';
import {
  clearStoredGuestCartItems,
  getStoredGuestCartItems,
  normalizeGuestCartItems,
  setStoredGuestCartItems,
} from '@/lib/commerce/guest-cart';
import { getBankTransferDetails } from '@/lib/commerce/payment-display';
import { isCheckoutPaymentMethodReady } from '@/lib/commerce/payment-method-readiness';
import { sendCustomerVerificationEmail } from '@/lib/mail/verification';
import { sendOrderCreatedEmails } from '@/lib/mail/notifications';
import { startPaymentAttempt } from '@/lib/payments/gateway';
import { checkRiskLimit } from '@/lib/accounting/risk';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCart, getProductCheckoutPrice, getProductHref, requireCustomerSession } from '@/lib/commerce/queries';
import { invalidateSupabaseSession } from '@/lib/auth/session-invalidation';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import { getPasswordPolicyError } from '@/lib/auth/password-policy';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import { assertOrderQuantity } from '@/lib/commerce/quantity';
import { isTurkeyProvince } from '@/lib/commerce/turkey-provinces';

export type CustomerSettingsActionResult = {
  error?: string;
  message?: string;
  ok: boolean;
};

export type CheckoutActionState = {
  error?: string;
  ok: boolean;
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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
  return getSafeCustomerRedirectPath(redirectTo, fallback);
}

function normalizeQuantity(value: number) {
  return Math.max(1, Math.min(value, 99));
}

function getCheckoutActionError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  const safeTerms = [
    'adres', 'fiyat', 'hesap', 'indirim', 'işlem', 'kupon', 'kvkk', 'müşteri',
    'ödeme', 'risk', 'sepet', 'sipariş', 'sözleşme', 'şifre', 'telefon', 'ürün',
  ];

  if (message && safeTerms.some((term) => message.toLocaleLowerCase('tr').includes(term))) {
    return message;
  }

  console.error('Checkout action failed:', error);
  return 'Sipariş şu anda tamamlanamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
}

export async function prepareCheckoutAction(formData: FormData) {
  const rawCart = getText(formData, 'guest_cart');
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawCart);
  } catch {
    throw new Error('Sepet bilgisi okunamadı. Lütfen sepetinizi yenileyin.');
  }

  if (!Array.isArray(parsed) || parsed.length > 40) {
    throw new Error('Sepet boş veya izin verilen ürün sınırını aşıyor.');
  }

  const items = normalizeGuestCartItems(parsed.map((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      productId: typeof record.productId === 'string' ? record.productId : '',
      quantity: typeof record.quantity === 'number' ? record.quantity : Number(record.quantity ?? 1),
    };
  }));

  if (items.length === 0) {
    throw new Error('Ödemeye geçmek için sepetinizde ürün bulunmalıdır.');
  }

  await setStoredGuestCartItems(items);
  redirect('/odeme');
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

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

function assertPaymentMethodConfigured(provider: string, integrationType: string, config: Json) {
  if (!isCheckoutPaymentMethodReady(provider, integrationType, config)) {
    throw new Error('Seçilen ödeme yöntemi için zorunlu API kimlik bilgileri eksik.');
  }
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

function serializeAddress(address: CustomerAddressRow): Record<string, Json> {
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
    .select('id, price, price_mode, stock_status, status, is_active, minimum_order_quantity, stock_quantity')
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
    const nextQuantity = existingItem.quantity + quantity;
    assertOrderQuantity(product, nextQuantity);
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: normalizeQuantity(nextQuantity) })
      .eq('id', existingItem.id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    assertOrderQuantity(product, quantity);
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
    const { data: item, error: itemError } = await supabase
      .from('cart_items')
      .select('product_id')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (itemError || !item) throw new Error(itemError?.message ?? 'Sepet ürünü bulunamadı.');
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('minimum_order_quantity, stock_quantity')
      .eq('id', item.product_id)
      .maybeSingle();
    if (productError || !product) throw new Error(productError?.message ?? 'Ürün bulunamadı.');
    assertOrderQuantity(product, quantity);
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

  await writeAuditLog({
    actorUserId: user.id,
    action: favorite ? 'customer_favorite_remove' : 'customer_favorite_add',
    resourceId: productId,
    resourceType: 'product',
  });

  revalidatePath('/favorilerim');
  revalidatePath('/hesabim/favorilerim');
  revalidatePath('/hesabim');
  redirect(redirectTo);
}

export async function saveProfileAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { profile, user } = await requireCustomerSession('/hesabim/profil');
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const fullName = getText(formData, 'full_name');
  const phone = getText(formData, 'phone');
  const accountType = getText(formData, 'account_type') === 'corporate' ? 'corporate' : 'individual';
  const companyTitle = accountType === 'corporate' ? getText(formData, 'company_title') : '';
  const taxOffice = accountType === 'corporate' ? getText(formData, 'tax_office') : '';
  const taxNumber = accountType === 'corporate' ? getText(formData, 'tax_number').replace(/\D/g, '') : '';
  const marketingConsent = formData.get('marketing_consent') === 'on';

  if (!fullName || !validatePhone(phone)) {
    return { error: 'Ad soyad ve geçerli bir telefon numarası zorunludur.', ok: false };
  }

  if (accountType === 'corporate' && (!companyTitle || !taxOffice || !/^\d{10}$/.test(taxNumber))) {
    return { error: 'Kurumsal hesap için şirket unvanı, vergi dairesi ve 10 haneli vergi numarası zorunludur.', ok: false };
  }

  const { error } = await supabase
    .from('customer_profiles')
    .update({
      account_type: accountType,
      company_title: companyTitle,
      full_name: fullName,
      phone,
      marketing_consent: marketingConsent,
      tax_number: taxNumber,
      tax_office: taxOffice,
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
      account_type: accountType,
      company_title: companyTitle,
      tax_number: taxNumber,
      tax_office: taxOffice,
    },
  });

  if (authError) {
    await supabase.from('customer_profiles').update({
      account_type: profile.account_type,
      company_title: profile.company_title,
      full_name: profile.full_name,
      marketing_consent: profile.marketing_consent,
      phone: profile.phone,
      tax_number: profile.tax_number,
      tax_office: profile.tax_office,
    }).eq('user_id', user.id);
    return { error: getAuthErrorMessage(authError.message), ok: false };
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'customer_profile_update',
    resourceId: user.id,
    resourceType: 'customer_profile',
    oldValue: { account_type: profile.account_type, company_title: profile.company_title, full_name: profile.full_name, marketing_consent: profile.marketing_consent, phone: profile.phone, tax_number: profile.tax_number ? 'configured' : '', tax_office: profile.tax_office },
    newValue: { account_type: accountType, company_title: companyTitle, full_name: fullName, marketing_consent: marketingConsent, phone, tax_number: taxNumber ? 'configured' : '', tax_office: taxOffice },
  });

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/profil');
  revalidatePath('/odeme');

  return {
    message: fullName !== profile.full_name || phone !== profile.phone || marketingConsent !== profile.marketing_consent || accountType !== profile.account_type || companyTitle !== profile.company_title || taxOffice !== profile.tax_office || taxNumber !== profile.tax_number
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
    const { error: rollbackError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      email: currentEmail,
      email_confirm: true,
      user_metadata: {
        ...(isRecord(user.user_metadata) ? user.user_metadata : {}),
        app_email_verified: true,
      },
    });
    if (rollbackError) console.error('Customer email rollback failed:', rollbackError.message);
    return { error: 'E-posta adresi güncellenemedi. Lütfen tekrar deneyin.', ok: false };
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'customer_email_update',
    resourceId: user.id,
    resourceType: 'auth',
    oldValue: { email: currentEmail },
    newValue: { email, verified: false },
  });

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
  const sessionSupabase = await createClient();
  const currentPassword = String(formData.get('current_password') ?? '');
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');
  const passwordError = getPasswordPolicyError(password);

  if (!currentPassword) {
    return { error: 'Mevcut şifrenizi girin.', ok: false };
  }

  const headerStore = await headers();
  const passwordRateLimit = checkRateLimit(`customer-password-update:${user.id}:${getRequestIp(headerStore)}`, 5, 30 * 60 * 1000);
  if (!passwordRateLimit.success) {
    return { error: 'Çok fazla şifre değiştirme denemesi yapıldı. Lütfen daha sonra tekrar deneyin.', ok: false };
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

  await writeAuditLog({
    actorUserId: user.id,
    action: 'customer_password_update',
    resourceId: user.id,
    resourceType: 'auth',
  });
  await sessionSupabase.auth.signOut({ scope: 'others' });

  revalidatePath('/hesabim/profil');

  return { message: 'Şifreniz güncellendi.', ok: true };
}

export async function saveAddressAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { user } = await requireCustomerSession('/hesabim/adreslerim');
  const supabase = await createClient();
  const id = getText(formData, 'id');
  const fullName = getText(formData, 'customer_name');
  const phone = getText(formData, 'customer_phone');
  const city = getText(formData, 'city');
  const district = getText(formData, 'district');
  const addressLine = getText(formData, 'address_line');

  if (!fullName || !validatePhone(phone) || !isTurkeyProvince(city) || !district || !getText(formData, 'neighborhood') || addressLine.length < 10) {
    return { error: 'Ad soyad, geçerli telefon, il, ilçe, mahalle ve açık adres zorunludur.', ok: false };
  }

  const { data: addressId, error } = await supabase.rpc('save_customer_address', {
    p_address_line: addressLine,
    p_city: city,
    p_district: district,
    p_full_name: fullName,
    p_id: id || null,
    p_is_default: formData.get('is_default') === 'on',
    p_label: getText(formData, 'address_label') || 'Teslimat',
    p_neighborhood: getText(formData, 'neighborhood'),
    p_phone: phone,
    p_postal_code: getText(formData, 'postal_code'),
  });

  if (error) {
    console.error('Customer address save failed:', error);
    return { error: 'Adres kaydedilemedi. Lütfen bilgileri kontrol edip tekrar deneyin.', ok: false };
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: id ? 'customer_address_update' : 'customer_address_create',
    resourceId: addressId,
    resourceType: 'customer_address',
  });

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/adreslerim');
  revalidatePath('/odeme');
  return { message: id ? 'Adres güncellendi.' : 'Adres eklendi.', ok: true };
}

export async function setDefaultAddressAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { user } = await requireCustomerSession('/hesabim/adreslerim');
  const supabase = await createClient();
  const id = getText(formData, 'id');

  if (!id) {
    return { error: 'Adres seçilemedi.', ok: false };
  }

  const { data: updated, error } = await supabase.rpc('set_default_customer_address', { p_id: id });
  if (error || !updated) {
    return { error: 'Varsayılan adres değiştirilemedi.', ok: false };
  }

  await writeAuditLog({ actorUserId: user.id, action: 'customer_address_set_default', resourceId: id, resourceType: 'customer_address' });

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/adreslerim');
  revalidatePath('/odeme');
  return { message: 'Varsayılan adres güncellendi.', ok: true };
}

export async function deleteAddressAction(formData: FormData): Promise<CustomerSettingsActionResult> {
  const { user } = await requireCustomerSession('/hesabim/adreslerim');
  const supabase = await createClient();
  const id = getText(formData, 'id');

  if (!id) {
    return { error: 'Adres seçilemedi.', ok: false };
  }

  const { data: deleted, error } = await supabase.rpc('delete_customer_address', { p_id: id });
  if (error || !deleted) {
    return { error: 'Adres silinemedi veya bu adrese erişiminiz yok.', ok: false };
  }

  await writeAuditLog({ actorUserId: user.id, action: 'customer_address_delete', resourceId: id, resourceType: 'customer_address' });

  revalidatePath('/hesabim');
  revalidatePath('/hesabim/adreslerim');
  revalidatePath('/odeme');
  return { message: 'Adres silindi.', ok: true };
}

async function createOrder(formData: FormData) {
  const [session, guestItems] = await Promise.all([
    requireCustomerSession('/odeme'),
    getStoredGuestCartItems(),
  ]);
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const cart = await getCart(session.user.id, undefined, guestItems);

  assertCustomerCanTransact(session.profile.is_blocked);

  if (!cart.checkoutReady) {
    throw new Error('Sepetiniz ödeme için hazır değil. Ürün fiyatlarını ve adetleri kontrol edin.');
  }

  if (formData.get('legal_acceptance') !== 'on') {
    throw new Error('Siparişi tamamlamak için ön bilgilendirme formu ve mesafeli satış sözleşmesini kabul etmelisiniz.');
  }

  if (formData.get('privacy_acceptance') !== 'on') {
    throw new Error('Siparişi tamamlamak için KVKK ve gizlilik metinlerini kabul etmelisiniz.');
  }

  const productIds = cart.lines.map((line) => line.product.id);
  const products = await getCustomerPricedProducts(session.user.id, await getPublicProductsByIds(productIds));
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
  const customerType = getText(formData, 'customer_type') === 'corporate' ? 'corporate' : 'individual';
  const companyTitle = getText(formData, 'company_title');
  const taxOffice = getText(formData, 'tax_office');
  const taxNumber = getText(formData, 'tax_number').replace(/\D/g, '');
  const paymentMethod = selectedPaymentMethodId ? await getCheckoutPaymentMethodById(selectedPaymentMethodId) : null;

  if (!paymentMethod) {
    throw new Error('Geçerli bir ödeme yöntemi seçin.');
  }

  assertSupportedPaymentMethod(paymentMethod.provider, paymentMethod.integration_type);
  assertPaymentMethodConfigured(paymentMethod.provider, paymentMethod.integration_type, paymentMethod.config);

  if (!customerName || !customerPhone || !customerEmail || !finalAddress.city || !finalAddress.district || !finalAddress.address_line) {
    throw new Error('Ödeme için ad, telefon, e-posta ve teslimat adresi zorunludur.');
  }

  if (!isTurkeyProvince(finalAddress.city)) {
    throw new Error('Geçerli bir il seçin.');
  }

  if (customerType === 'corporate' && (!companyTitle || !taxOffice || !/^\d{10}$/.test(taxNumber))) {
    throw new Error('Kurumsal sipariş için şirket unvanı, vergi dairesi ve 10 haneli vergi numarası zorunludur.');
  }

  if (!validateEmail(customerEmail)) {
    throw new Error('Geçerli bir e-posta adresi girin.');
  }

  if (!validatePhone(customerPhone)) {
    throw new Error('Geçerli bir telefon numarası girin.');
  }

  const activeUserId = session.user.id;

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
    if (product.tax_rate == null) {
      throw new Error(`${product.title} için KDV oranı tanımlanmamış. Sipariş oluşturulamaz.`);
    }
    assertOrderQuantity(product, line.quantity);

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
  const riskCheck = await checkRiskLimit(activeUserId, total);

  if (!riskCheck.allowed) {
    throw new Error(riskCheck.message);
  }

  const shippingSnapshot = serializeAddress({
    ...finalAddress,
    full_name: customerName,
    phone: customerPhone,
  });
  const billingSnapshot: Record<string, Json> = customerType === 'corporate'
    ? {
        ...shippingSnapshot,
        customer_type: 'corporate',
        company_title: companyTitle,
        tax_number: taxNumber,
        tax_office: taxOffice,
      }
    : { ...shippingSnapshot, customer_type: 'individual' };
  const checkoutIdempotencyKey = getText(formData, 'checkout_idempotency_key');
  const checkoutArgs = {
    p_billing_address: billingSnapshot,
    p_coupon_code: cart.coupon?.code ?? null,
    p_coupon_id: cart.coupon?.id ?? null,
    p_customer_email: customerEmail,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_discount_total: discountTotal,
    p_idempotency_key: checkoutIdempotencyKey,
    p_items: orderLines.map((line) => ({
      line_total: line.lineTotal,
      product_id: line.product.id,
      product_image_url: line.product.featuredImageUrl ?? '',
      product_slug: line.product.slug,
      product_title: line.product.title,
      quantity: line.quantity,
      unit_price: line.unitPrice,
    })),
    p_note: getText(formData, 'note'),
    p_payment_metadata: {
      account_owner: bankDetails.accountOwner,
      bank_name: bankDetails.bankName,
      code: paymentMethod.code,
      coupon_code: cart.coupon?.code ?? null,
      discount_total: discountTotal,
      iban: bankDetails.iban,
      instructions: paymentMethod.instructions,
      integration_type: paymentMethod.integration_type,
      method_name: paymentMethod.name,
      support_phone: bankDetails.supportPhone,
    },
    p_payment_method_id: paymentMethod.id,
    p_shipping_address: shippingSnapshot,
    p_user_id: activeUserId,
  };
  const { data: checkoutResults, error: checkoutError } = paymentMethod.code === 'cari-bakiye'
    ? await adminSupabase.rpc('create_account_storefront_checkout', checkoutArgs)
    : await adminSupabase.rpc('create_storefront_checkout', checkoutArgs);
  const checkout = checkoutResults?.[0];

  if (checkoutError || !checkout) {
    throw new Error(checkoutError?.message ?? 'Sipariş ve ödeme kaydı oluşturulamadı.');
  }

  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('id', checkout.order_id)
    .eq('user_id', activeUserId)
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? 'Sipariş oluşturuldu ancak sonuç bilgisi okunamadı.');
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
  const paymentStart = await startPaymentAttempt(checkout.payment_attempt_id, {
    origin: getRequestOrigin(headerStore),
    userIp: getRequestIp(headerStore),
  });

  return paymentStart.redirectTo;
}

export async function createOrderAction(formData: FormData) {
  const redirectTo = await createOrder(formData);
  redirect(redirectTo);
}

export async function submitOrderAction(
  _previousState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  let redirectTo: string;

  try {
    redirectTo = await createOrder(formData);
  } catch (error) {
    return { error: getCheckoutActionError(error), ok: false };
  }

  redirect(redirectTo);
}

export async function signOutCustomerAction() {
  const supabase = await createClient();
  const result = await invalidateSupabaseSession(supabase);

  if (!result.ok) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('Çıkış işlemi tamamlanamadı. Lütfen tekrar deneyin.');
  }

  if (result.userId) {
    await writeAuditLog({ actorUserId: result.userId, action: 'customer_logout', resourceType: 'auth' });
  }

  revalidatePath('/', 'layout');
  redirect('/giris');
}
