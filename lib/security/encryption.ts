import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * GITHUB_SYNC_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters if hex, or base64)
 * If it's a 32-character plain string, it's 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.GITHUB_SYNC_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('GITHUB_SYNC_ENCRYPTION_KEY is not defined in environment variables.');
  }
  
  const keyBuffer = Buffer.from(key, 'utf8');
  if (keyBuffer.length !== 32) {
    throw new Error('GITHUB_SYNC_ENCRYPTION_KEY must be exactly 32 bytes long.');
  }
  
  return keyBuffer;
}

/**
 * Encrypts a plain-text token.
 * Returns format: base64(iv):base64(authTag):base64(encryptedText)
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted token.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format.');
  }
  
  const [ivBase64, authTagBase64, encryptedTextBase64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedTextBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
