import { encryptToken, decryptToken } from '../lib/security/encryption';
import { randomBytes } from 'crypto';

describe('Encryption Module', () => {
  beforeEach(() => {
    // 32-byte Base64 key oluşturup env'e atıyoruz
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  });

  afterEach(() => {
    delete process.env.APP_ENCRYPTION_KEY;
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

  it('should throw an error if APP_ENCRYPTION_KEY is missing', () => {
    delete process.env.APP_ENCRYPTION_KEY;
    expect(() => encryptToken('test')).toThrow('Encryption key is not defined in environment variables.');
  });
});
