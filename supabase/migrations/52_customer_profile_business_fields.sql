alter table public.customer_profiles
  add column if not exists account_type text not null default 'individual',
  add column if not exists company_title text not null default '',
  add column if not exists tax_office text not null default '',
  add column if not exists tax_number text not null default '';

alter table public.customer_profiles
  drop constraint if exists customer_profiles_account_type_check,
  add constraint customer_profiles_account_type_check
    check (account_type in ('individual', 'corporate')),
  drop constraint if exists customer_profiles_corporate_fields_check,
  add constraint customer_profiles_corporate_fields_check
    check (
      account_type = 'individual'
      or (
        nullif(btrim(company_title), '') is not null
        and nullif(btrim(tax_office), '') is not null
        and tax_number ~ '^[0-9]{10}$'
      )
    );

comment on column public.customer_profiles.account_type is 'Customer billing identity: individual or corporate.';
comment on column public.customer_profiles.company_title is 'Legal company title for corporate billing.';
comment on column public.customer_profiles.tax_office is 'Tax office for corporate billing.';
comment on column public.customer_profiles.tax_number is 'Ten digit Turkish corporate tax number.';
