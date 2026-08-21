-- ============================================================================
-- 15_customer_account_list.sql
-- Server-side customer account summaries for the admin account list.
-- ============================================================================

create or replace view public.customer_account_summaries
with (security_invoker = true)
as
with ledger_totals as (
  select
    customer_id,
    coalesce(sum(debit), 0)::numeric(14, 2) as total_debit,
    coalesce(sum(credit), 0)::numeric(14, 2) as total_credit,
    coalesce(sum(debit - credit), 0)::numeric(14, 2) as balance,
    coalesce(
      sum(
        case
          when due_date < current_date and debit > credit then debit - credit
          else 0
        end
      ),
      0
    )::numeric(14, 2) as overdue_balance,
    max(created_at) as last_transaction_at
  from public.account_transactions
  group by customer_id
)
select
  profile.user_id as customer_id,
  account.id as account_id,
  coalesce(nullif(profile.full_name, ''), profile.email) as customer_name,
  profile.email,
  profile.phone,
  ('CARI-' || upper(left(replace(profile.user_id::text, '-', ''), 8)))::text as account_code,
  not profile.is_blocked as is_active,
  coalesce(ledger.total_debit, 0)::numeric(14, 2) as total_debit,
  coalesce(ledger.total_credit, 0)::numeric(14, 2) as total_credit,
  coalesce(ledger.balance, 0)::numeric(14, 2) as balance,
  coalesce(ledger.overdue_balance, 0)::numeric(14, 2) as overdue_balance,
  coalesce(account.risk_limit, 0)::numeric(14, 2) as risk_limit,
  (coalesce(account.risk_limit, 0) - coalesce(ledger.balance, 0))::numeric(14, 2) as available_limit,
  (
    coalesce(ledger.balance, 0) > 0
    and coalesce(ledger.balance, 0) > coalesce(account.risk_limit, 0)
  ) as risk_exceeded,
  coalesce(ledger.last_transaction_at, account.last_transaction_at) as last_transaction_at,
  lower(
    concat_ws(
      ' ',
      profile.full_name,
      profile.email,
      profile.phone,
      'CARI-' || left(replace(profile.user_id::text, '-', ''), 8)
    )
  ) as search_text
from public.customer_profiles profile
left join public.customer_accounts account on account.customer_id = profile.user_id
left join ledger_totals ledger on ledger.customer_id = profile.user_id;

create or replace view public.customer_account_metrics
with (security_invoker = true)
as
select
  count(*)::bigint as customer_count,
  coalesce(sum(greatest(balance, 0)), 0)::numeric(14, 2) as total_receivable,
  coalesce(sum(greatest(-balance, 0)), 0)::numeric(14, 2) as total_customer_credit,
  coalesce(sum(overdue_balance), 0)::numeric(14, 2) as total_overdue
from public.customer_account_summaries;

revoke all on public.customer_account_summaries from anon, authenticated;
revoke all on public.customer_account_metrics from anon, authenticated;
grant select on public.customer_account_summaries to service_role;
grant select on public.customer_account_metrics to service_role;
