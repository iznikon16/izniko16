import { getMfaStatus } from '@/lib/auth/mfa';

function client({ currentLevel, factors, nextLevel }: { currentLevel: string; factors: Array<Record<string, string>>; nextLevel: string }) {
  return {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: { currentLevel, nextLevel }, error: null }),
        listFactors: jest.fn().mockResolvedValue({ data: { all: factors }, error: null }),
      },
    },
  };
}

describe('optional MFA policy', () => {
  it('does not force users who did not opt in', async () => {
    await expect(getMfaStatus(client({ currentLevel: 'aal1', factors: [], nextLevel: 'aal1' }) as never)).resolves.toMatchObject({ enabled: false, requiresChallenge: false });
  });

  it('requires AAL2 after a user voluntarily verifies TOTP', async () => {
    const factor = { factor_type: 'totp', id: 'factor-1', status: 'verified' };
    await expect(getMfaStatus(client({ currentLevel: 'aal1', factors: [factor], nextLevel: 'aal2' }) as never)).resolves.toMatchObject({ enabled: true, requiresChallenge: true, verifiedFactorId: 'factor-1' });
  });

  it('allows an already verified AAL2 session', async () => {
    const factor = { factor_type: 'totp', id: 'factor-1', status: 'verified' };
    await expect(getMfaStatus(client({ currentLevel: 'aal2', factors: [factor], nextLevel: 'aal2' }) as never)).resolves.toMatchObject({ enabled: true, requiresChallenge: false });
  });

  it('marks provider errors unavailable so callers can fail closed', async () => {
    const broken = { auth: { mfa: { listFactors: jest.fn().mockResolvedValue({ data: null, error: new Error('offline') }), getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: null, error: new Error('offline') }) } } };
    await expect(getMfaStatus(broken as never)).resolves.toMatchObject({ available: false, requiresChallenge: false });
  });
});
