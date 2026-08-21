export function getPasswordPolicyError(password: string) {
  if (password.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return 'Şifre büyük ve küçük harf içermelidir.';
  if (!/\d/.test(password)) return 'Şifre en az 1 rakam içermelidir.';
  if (/\s/.test(password)) return 'Şifre boşluk içeremez.';
  return null;
}
