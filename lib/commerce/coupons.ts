import 'server-only';

import { cookies } from 'next/headers';
import type { CouponDiscountType, CouponRow } from '@/lib/catalog/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import { createAdminClient } from '@/lib/supabase/admin';

export const COMMERCE_COUPON_COOKIE = 'ky_coupon';

export type ResolvedCommerceCoupon = {
  code: string;
  description: string;
  discountAmount: number;
  discountType: CouponDiscountType;
  discountValue: number;
  id: string;
  maximumDiscount: number | null;
  minimumOrderTotal: number;
  title: string;
  usageCount: number;
  usageLimit: number | null;
};

function getCouponCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

function isCouponStarted(coupon: CouponRow) {
  return !coupon.starts_at || new Date(coupon.starts_at).getTime() <= Date.now();
}

function isCouponExpired(coupon: CouponRow) {
  return Boolean(coupon.ends_at && new Date(coupon.ends_at).getTime() < Date.now());
}

function isCouponUsageExceeded(coupon: CouponRow) {
  return typeof coupon.usage_limit === 'number' && coupon.usage_count >= coupon.usage_limit;
}

function calculateCouponDiscount(coupon: CouponRow, subtotal: number) {
  const baseDiscount =
    coupon.discount_type === 'percent'
      ? subtotal * (Number(coupon.discount_value ?? 0) / 100)
      : Number(coupon.discount_value ?? 0);

  const cappedDiscount =
    typeof coupon.maximum_discount === 'number'
      ? Math.min(baseDiscount, Number(coupon.maximum_discount))
      : baseDiscount;

  return Math.max(0, Math.min(subtotal, cappedDiscount));
}

export function normalizeCommerceCouponCode(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export async function getStoredCommerceCouponCode() {
  const cookieStore = await cookies();
  return normalizeCommerceCouponCode(cookieStore.get(COMMERCE_COUPON_COOKIE)?.value ?? '');
}

export async function setStoredCommerceCouponCode(code: string) {
  const cookieStore = await cookies();
  cookieStore.set(COMMERCE_COUPON_COOKIE, normalizeCommerceCouponCode(code), getCouponCookieOptions());
}

export async function clearStoredCommerceCouponCode() {
  const cookieStore = await cookies();
  cookieStore.set(COMMERCE_COUPON_COOKIE, '', {
    ...getCouponCookieOptions(),
    maxAge: 0,
  });
}

export function getCommerceCouponCookieOptions() {
  return getCouponCookieOptions();
}

export async function resolveCommerceCouponCode(code: string, subtotal: number): Promise<{ coupon: ResolvedCommerceCoupon | null; error: string | null }> {
  const normalizedCode = normalizeCommerceCouponCode(code);

  if (!normalizedCode) {
    return {
      coupon: null,
      error: 'Kupon kodu girin.',
    };
  }

  if (subtotal <= 0) {
    return {
      coupon: null,
      error: 'Kupon kullanmak için sepette en az bir ürün olmalı.',
    };
  }

  const supabase = createAdminClient();
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!coupon) {
    return {
      coupon: null,
      error: 'Kupon kodu bulunamadı.',
    };
  }

  if (!coupon.is_active) {
    return {
      coupon: null,
      error: 'Bu kupon aktif değil.',
    };
  }

  if (!isCouponStarted(coupon)) {
    return {
      coupon: null,
      error: 'Bu kupon henüz aktif değil.',
    };
  }

  if (isCouponExpired(coupon)) {
    return {
      coupon: null,
      error: 'Geçerlilik süresi dolmuş.',
    };
  }

  if (isCouponUsageExceeded(coupon)) {
    return {
      coupon: null,
      error: 'Bu kuponun kullanım limiti doldu.',
    };
  }

  if (subtotal < Number(coupon.minimum_order_total ?? 0)) {
    return {
      coupon: null,
      error: `Bu kupon için minimum sepet tutarı ${formatCommercePrice(coupon.minimum_order_total)}.`,
    };
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotal);

  if (discountAmount <= 0) {
    return {
      coupon: null,
      error: 'Bu kupon mevcut sepet için indirim üretmiyor.',
    };
  }

  return {
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountAmount,
      discountType: coupon.discount_type === 'percent' ? 'percent' : 'fixed',
      discountValue: Number(coupon.discount_value ?? 0),
      id: coupon.id,
      maximumDiscount: coupon.maximum_discount,
      minimumOrderTotal: Number(coupon.minimum_order_total ?? 0),
      title: coupon.title,
      usageCount: coupon.usage_count,
      usageLimit: coupon.usage_limit,
    },
    error: null,
  };
}

export async function resolveStoredCommerceCoupon(subtotal: number, couponCode?: string | null) {
  const sourceCode = typeof couponCode === 'string' ? normalizeCommerceCouponCode(couponCode) : await getStoredCommerceCouponCode();

  if (!sourceCode) {
    return null;
  }

  const { coupon } = await resolveCommerceCouponCode(sourceCode, subtotal);
  return coupon;
}
