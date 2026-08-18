import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const VERSION = 'v1';

/**
 * APP_ENCRYPTION_KEY or GITHUB_SYNC_ENCRYPTION_KEY must be a Base64 encoded 32-byte key.
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.APP_ENCRYPTION_KEY || process.env.GITHUB_SYNC_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('Encryption key is not defined in environment variables.');
  }
  
  const keyBuffer = Buffer.from(rawKey, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be exactly a 32-byte Base64 string.');
  }
  
  return keyBuffer;
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
 * Expects format: v1:base64(iv):base64(authTag):base64(encryptedText)
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  
  const parts = encryptedData.split(':');
  
  // Desteklenen format: v1:<iv>:<authTag>:<ciphertext>
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid or unsupported encrypted data format/version.');
  }
  
  const [, ivBase64, authTagBase64, encryptedTextBase64] = parts;
  
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
