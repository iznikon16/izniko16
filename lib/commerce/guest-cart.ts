import 'server-only';

import { cookies } from 'next/headers';

export const GUEST_CART_COOKIE = 'ky_guest_cart';

export type GuestCartItem = {
  productId: string;
  quantity: number;
};

function getGuestCartCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

function normalizeGuestCartQuantity(value: number) {
  return Math.max(1, Math.min(Math.trunc(value) || 1, 99));
}

export function normalizeGuestCartItems(items: GuestCartItem[]) {
  const itemsByProductId = new Map<string, GuestCartItem>();

  for (const item of items) {
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';

    if (!productId) {
      continue;
    }

    const quantity = normalizeGuestCartQuantity(item.quantity);
    const existingItem = itemsByProductId.get(productId);

    if (existingItem) {
      existingItem.quantity = normalizeGuestCartQuantity(existingItem.quantity + quantity);
      continue;
    }

    itemsByProductId.set(productId, {
      productId,
      quantity,
    });
  }

  return [...itemsByProductId.values()];
}

export async function getStoredGuestCartItems() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(GUEST_CART_COOKIE)?.value ?? '';

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeGuestCartItems(
      parsed.map((item) => ({
        productId: typeof item?.productId === 'string' ? item.productId : '',
        quantity: typeof item?.quantity === 'number' ? item.quantity : Number(item?.quantity ?? 1),
      }))
    );
  } catch {
    return [];
  }
}

export async function setStoredGuestCartItems(items: GuestCartItem[]) {
  const cookieStore = await cookies();
  const normalizedItems = normalizeGuestCartItems(items);

  if (normalizedItems.length === 0) {
    cookieStore.set(GUEST_CART_COOKIE, '', {
      ...getGuestCartCookieOptions(),
      maxAge: 0,
    });
    return;
  }

  cookieStore.set(GUEST_CART_COOKIE, JSON.stringify(normalizedItems), getGuestCartCookieOptions());
}

export async function clearStoredGuestCartItems() {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_CART_COOKIE, '', {
    ...getGuestCartCookieOptions(),
    maxAge: 0,
  });
}

export function getCommerceGuestCartCookieOptions() {
  return getGuestCartCookieOptions();
}
