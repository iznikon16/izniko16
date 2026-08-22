export type ConfigurationState = 'CONFIGURED' | 'INVALID' | 'MISSING';
export type ProjectMatchState = 'MATCH' | 'MISMATCH' | 'UNKNOWN';

export class SupabaseConfigurationError extends Error {
  readonly code = 'SUPABASE_CONFIG_INVALID';

  constructor() {
    super('Supabase yapılandırması eksik veya geçersiz.');
    this.name = 'SupabaseConfigurationError';
  }
}

function valueState(value: string | undefined, validate: (candidate: string) => boolean): ConfigurationState {
  const normalized = value?.trim();
  if (!normalized) return 'MISSING';
  return validate(normalized) ? 'CONFIGURED' : 'INVALID';
}

function validSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function validKey(value: string) {
  return value.length >= 20 && !/\s/.test(value);
}

function projectRef(value: string | undefined) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    return host.endsWith('.supabase.co') ? host.slice(0, -'.supabase.co'.length) : null;
  } catch {
    return null;
  }
}

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey || !validSupabaseUrl(url) || !validKey(publishableKey)) {
    throw new SupabaseConfigurationError();
  }

  return { publishableKey, url };
}

export function getAdminSupabaseConfig() {
  const publicConfig = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey || !validKey(serviceRoleKey)) throw new SupabaseConfigurationError();
  return { ...publicConfig, serviceRoleKey };
}

/** Returns only safe status values; it never exposes URLs, keys or tokens. */
export function getSupabaseConfigurationDiagnostic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const jwksUrl = process.env.SUPABASE_JWKS_URL?.trim();
  const urlRef = projectRef(url);
  const jwksRef = projectRef(jwksUrl);

  return {
    jwksUrl: valueState(jwksUrl, validSupabaseUrl),
    projectMatch: !urlRef || !jwksRef ? 'UNKNOWN' : urlRef === jwksRef ? 'MATCH' : 'MISMATCH' as ProjectMatchState,
    publishableKey: valueState(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, validKey),
    serviceRoleKey: valueState(process.env.SUPABASE_SERVICE_ROLE_KEY, validKey),
    supabaseUrl: valueState(url, validSupabaseUrl),
  };
}
