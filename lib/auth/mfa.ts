import type { SupabaseClient } from '@supabase/supabase-js';

export type MfaStatus = {
  available: boolean;
  currentLevel: string | null;
  enabled: boolean;
  nextLevel: string | null;
  requiresChallenge: boolean;
  verifiedFactorId: string | null;
};

export async function getMfaStatus(client: SupabaseClient): Promise<MfaStatus> {
  const [{ data: factorsData, error: factorsError }, { data: aalData, error: aalError }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (factorsError || aalError) {
    return { available: false, currentLevel: null, enabled: false, nextLevel: null, requiresChallenge: false, verifiedFactorId: null };
  }
  const verifiedFactor = factorsData.all.find((factor) => factor.factor_type === 'totp' && factor.status === 'verified') ?? null;
  return {
    available: true,
    currentLevel: aalData.currentLevel,
    enabled: Boolean(verifiedFactor),
    nextLevel: aalData.nextLevel,
    requiresChallenge: Boolean(verifiedFactor && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2'),
    verifiedFactorId: verifiedFactor?.id ?? null,
  };
}
