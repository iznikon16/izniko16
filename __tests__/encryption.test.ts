import { createCipheriv, randomBytes } from 'crypto';
import { decryptToken, encryptToken, isEncryptedToken, isLegacyEncryptedToken } from '../lib/security/encryption';

describe('Encryption Module', () => {
  it('detects supported encrypted payload formats', () => {
    expect(isEncryptedToken('v1:a:b:c')).toBe(true);
    expect(isEncryptedToken('a:b:c')).toBe(true);
    expect(isEncryptedToken('plain-secret')).toBe(false);
  });

  beforeEach(() => {
    delete process.env.GITHUB_SYNC_ENCRYPTION_KEY;
    // 32-byte Base64 key oluşturup env'e atıyoruz
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  });

  afterEach(() => {
    delete process.env.APP_ENCRYPTION_KEY;
    delete process.env.GITHUB_SYNC_ENCRYPTION_KEY;
  });

  it('should encrypt and decrypt a string successfully', () => {
    const originalText = 'my-secret-token-123';
    const encrypted = encryptToken(originalText);
    
    // Doğru formata sahip olduğunu kontrol et (v1:iv:authTag:ciphertext)
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted.split(':').length).toBe(4);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should fail with invalid version format', () => {
    const fakePayload = 'v2:fakeiv:faketag:fakecipher';
    expect(() => decryptToken(fakePayload)).toThrow('Invalid or unsupported encrypted data format/version.');
  });

  it('decrypts the legacy unversioned format', () => {
    const key = randomBytes(32);
    process.env.APP_ENCRYPTION_KEY = key.toString('base64');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update('legacy-token', 'utf8'), cipher.final()]);
    const legacyPayload = `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;

    expect(isLegacyEncryptedToken(legacyPayload)).toBe(true);
    expect(decryptToken(legacyPayload)).toBe('legacy-token');
  });

  it('accepts the original 32-byte UTF-8 GitHub key', () => {
    delete process.env.APP_ENCRYPTION_KEY;
    process.env.GITHUB_SYNC_ENCRYPTION_KEY = '12345678901234567890123456789012';

    const encrypted = encryptToken('legacy-key-token');
    expect(decryptToken(encrypted)).toBe('legacy-key-token');
  });

  it('should throw an error if APP_ENCRYPTION_KEY is missing', () => {
    delete process.env.APP_ENCRYPTION_KEY;
    expect(() => encryptToken('test')).toThrow('Encryption key is not defined in environment variables.');
  });
});
