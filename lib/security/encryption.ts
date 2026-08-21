import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const VERSION = 'v1';

function decodeBase64Key(rawKey: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(rawKey) || rawKey.length % 4 !== 0) return null;
  const decoded = Buffer.from(rawKey, 'base64');
  return decoded.length === 32 ? decoded : null;
}

/**
 * APP_ENCRYPTION_KEY must be a Base64 encoded 32-byte key. The legacy
 * GITHUB_SYNC_ENCRYPTION_KEY also accepts the original 32-byte UTF-8 format
 * so existing encrypted GitHub tokens can be migrated without exposing them.
 */
function getEncryptionKey(): Buffer {
  const appKey = process.env.APP_ENCRYPTION_KEY;
  if (appKey) {
    const decoded = decodeBase64Key(appKey);
    if (!decoded) throw new Error('APP_ENCRYPTION_KEY must be exactly a 32-byte Base64 string.');
    return decoded;
  }

  const githubKey = process.env.GITHUB_SYNC_ENCRYPTION_KEY;
  if (!githubKey) {
    throw new Error('Encryption key is not defined in environment variables.');
  }

  const decoded = decodeBase64Key(githubKey);
  if (decoded) return decoded;

  const legacyKey = Buffer.from(githubKey, 'utf8');
  if (legacyKey.length === 32) return legacyKey;

  throw new Error('GITHUB_SYNC_ENCRYPTION_KEY must be a 32-byte Base64 or legacy UTF-8 string.');
}

export function isLegacyEncryptedToken(encryptedData: string): boolean {
  return encryptedData.split(':').length === 3;
}

export function isEncryptedToken(value: string): boolean {
  const parts = value.split(':');
  return (parts.length === 4 && parts[0] === VERSION) || parts.length === 3;
}

/**
 * Encrypts a plain-text token.
 * Returns format: v1:base64(iv):base64(authTag):base64(encryptedText)
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return `${VERSION}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted token.
 * Accepts the current v1 format and the original unversioned format.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';

  const parts = encryptedData.split(':');

  let ivBase64: string;
  let authTagBase64: string;
  let encryptedTextBase64: string;

  if (parts.length === 4 && parts[0] === VERSION) {
    [, ivBase64, authTagBase64, encryptedTextBase64] = parts;
  } else if (parts.length === 3) {
    [ivBase64, authTagBase64, encryptedTextBase64] = parts;
  } else {
    throw new Error('Invalid or unsupported encrypted data format/version.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length.');
  }
  
  if (authTag.length !== 16) {
    throw new Error('Invalid authTag length.');
  }
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedTextBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
