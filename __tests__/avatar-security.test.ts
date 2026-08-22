import { AVATAR_MAX_BYTES, detectAvatarMime, getAvatarExtension, getInitials } from '@/lib/profile/avatar';

describe('avatar security helpers', () => {
  it('detects supported image signatures instead of trusting filenames', () => {
    expect(detectAvatarMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectAvatarMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectAvatarMime(new TextEncoder().encode('RIFF0000WEBP'))).toBe('image/webp');
    expect(detectAvatarMime(new TextEncoder().encode('<svg></svg>'))).toBeNull();
  });

  it('uses safe extensions and a five megabyte limit', () => {
    expect(getAvatarExtension('image/jpeg')).toBe('jpg');
    expect(getAvatarExtension('image/svg+xml')).toBeNull();
    expect(AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it('creates a Turkish fallback avatar', () => {
    expect(getInitials('Çağatay Güney')).toBe('ÇG');
    expect(getInitials('', 'ozan@example.com')).toBe('OZ');
  });
});
