-- Çağatay Güney hesabını mevcut Admin rolünü koruyarak Süper Admin yapar.
update public.admin_users
set
  role = 'admin',
  is_active = true,
  is_super_admin = true,
  updated_at = now()
where lower(email) = lower('cagatay.guneyy@gmail.com');
