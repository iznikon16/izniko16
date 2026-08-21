begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select ok(
  exists (select 1 from public.payment_methods where code = 'cari-bakiye' and is_active),
  'account balance payment method is active'
);

select function_returns(
  'public',
  'charge_checkout_to_account',
  array['uuid', 'uuid'],
  'setof record',
  'account charge function exists'
);

select function_returns(
  'public',
  'create_account_storefront_checkout',
  array['uuid', 'text', 'uuid', 'text', 'text', 'text', 'jsonb', 'jsonb', 'text', 'jsonb', 'numeric', 'uuid', 'text', 'jsonb'],
  'setof record',
  'atomic account checkout wrapper exists'
);

select is(
  has_function_privilege('authenticated', 'public.charge_checkout_to_account(uuid, uuid)', 'EXECUTE'),
  false,
  'authenticated clients cannot charge account directly'
);

select is(
  has_function_privilege('service_role', 'public.create_account_storefront_checkout(uuid, text, uuid, text, text, text, jsonb, jsonb, text, jsonb, numeric, uuid, text, jsonb)', 'EXECUTE'),
  true,
  'trusted service role can execute account checkout'
);

select * from finish();
rollback;
