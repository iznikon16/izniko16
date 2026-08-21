export type CustomerAccessStatus = 'active' | 'blocked' | 'missing_profile' | 'unverified';

export function getCustomerAccessStatus(
  profile: { email_verified_at: string | null; is_blocked: boolean } | null | undefined
): CustomerAccessStatus {
  if (!profile) return 'missing_profile';
  if (profile.is_blocked) return 'blocked';
  if (!profile.email_verified_at) return 'unverified';
  return 'active';
}
