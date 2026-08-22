-- Faz 27: Cari hareket numarasını güvenli global aramaya dahil eder.
create or replace view public.account_transaction_ledger
with (security_invoker = true)
as
select
  transaction.id as transaction_id,
  transaction.customer_id,
  transaction.type,
  transaction.reference,
  transaction.description,
  transaction.due_date,
  transaction.debit,
  transaction.credit,
  transaction.balance_after,
  transaction.actor_user_id,
  coalesce(nullif(actor.full_name, ''), actor.email, 'Sistem') as actor_name,
  transaction.order_id,
  orders.order_number,
  transaction.payment_id,
  transaction.is_reversal,
  transaction.reversed_transaction_id,
  transaction.created_at,
  lower(concat_ws(
    ' ',
    transaction.reference,
    transaction.description,
    orders.order_number,
    transaction.id::text,
    'CHR-' || upper(left(transaction.id::text, 8))
  )) as search_text
from public.account_transactions transaction
left join public.admin_users actor on actor.user_id = transaction.actor_user_id
left join public.orders on orders.id = transaction.order_id;

revoke all on public.account_transaction_ledger from anon, authenticated;
grant select on public.account_transaction_ledger to service_role;
