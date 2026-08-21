-- Faz 11: RLS politikalarının authenticated müşteriler için çalışabilmesi için
-- yalnızca portalda gereken tablolara okuma yetkisi verilir. Satır kapsamı,
-- 14_auth_data_protection.sql içindeki ownership ve aktif müşteri politikalarıyla
-- sınırlandırılmaya devam eder.

grant select on table public.customer_accounts to authenticated;
grant select on table public.account_transactions to authenticated;
grant select on table public.payments to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.customer_accounts,
           public.account_transactions,
           public.payments
  from authenticated;
