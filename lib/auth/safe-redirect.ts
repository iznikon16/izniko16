const INTERNAL_ORIGIN = 'https://internal.iznikon.invalid';
const DEFAULT_CUSTOMER_REDIRECT = '/hesabim/cari';

function decodeForValidation(value: string) {
  let decoded = value;

  for (let index = 0; index < 2; index += 1) {
    try {
      const nextValue = decodeURIComponent(decoded);
      if (nextValue === decoded) break;
      decoded = nextValue;
    } catch {
      return null;
    }
  }

  return decoded;
}

function sanitizeInternalPath(value: string | null | undefined) {
  const candidate = value?.trim();

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return null;
  }

  const decoded = decodeForValidation(candidate);
  if (
    !decoded ||
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function isBlockedCustomerDestination(path: string) {
  const decodedPath = decodeForValidation(path);
  if (!decodedPath) return true;

  const pathname = new URL(decodedPath, INTERNAL_ORIGIN).pathname;
  return (
    pathname === '/giris' ||
    pathname.startsWith('/giris/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

export function getSafeCustomerRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_CUSTOMER_REDIRECT
) {
  const fallbackCandidate = sanitizeInternalPath(fallback);
  const safeFallback = fallbackCandidate && !isBlockedCustomerDestination(fallbackCandidate)
    ? fallbackCandidate
    : DEFAULT_CUSTOMER_REDIRECT;
  const safePath = sanitizeInternalPath(value);

  if (!safePath) return safeFallback;
  if (isBlockedCustomerDestination(safePath)) return safeFallback;

  return safePath;
}
