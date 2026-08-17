import { createChallenge, verifySolution } from 'altcha-lib';
import type { Payload } from 'altcha-lib/types';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

const ALTCHA_FIELD_NAME = 'altcha';

function getAltchaSecret() {
  const secret = process.env.ALTCHA_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXTAUTH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'kombi-yeri-local-altcha-secret';
  }

  throw new Error('ALTCHA_SECRET environment variable is required.');
}

function decodePayload(payload: string): Payload | null {
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as Payload;
  } catch {
    return null;
  }
}

export async function createAltchaChallenge() {
  return createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: 5000,
    data: {
      challengeId: crypto.randomUUID(),
    },
    deriveKey,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    hmacSignatureSecret: getAltchaSecret(),
    keyPrefix: '00',
  });
}

export async function verifyAltchaFormData(formData: FormData) {
  const rawPayload = formData.get(ALTCHA_FIELD_NAME);

  if (typeof rawPayload !== 'string' || !rawPayload) {
    return false;
  }

  const payload = decodePayload(rawPayload);

  if (!payload?.challenge || !payload.solution) {
    return false;
  }

  try {
    const verification = await verifySolution({
      challenge: payload.challenge,
      deriveKey,
      hmacSignatureSecret: getAltchaSecret(),
      solution: payload.solution,
    });

    return verification.verified;
  } catch {
    return false;
  }
}

export const altchaFieldName = ALTCHA_FIELD_NAME;
