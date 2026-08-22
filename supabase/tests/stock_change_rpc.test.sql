begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  not has_function_privilege('anon', 'public.apply_stock_change(uuid,integer,text,text,uuid,uuid,text)', 'EXECUTE'),
  'anonymous role cannot execute stock RPC'
);
select ok(
  has_function_privilege('service_role', 'public.apply_stock_change(uuid,integer,text,text,uuid,uuid,text)', 'EXECUTE'),
  'service role can execute stock RPC'
);

insert into public.products (id, sku, slug, title, price, status, is_active, stock_quantity, critical_stock)
values ('54000000-0000-0000-0000-000000000001', 'STOCK-RPC-1', 'stock-rpc-1', 'Stock RPC Test', 10, 'published', true, 10, 2);

create temporary table first_stock_result as
select * from public.apply_stock_change(
  '54000000-0000-0000-0000-000000000001', -3, 'manual_out', 'pgTAP', null, null, 'stock-rpc:test-key'
);

select is((select previous_quantity from first_stock_result), 10, 'stock RPC returns the actual previous quantity');
select is((select resulting_quantity from first_stock_result), 7, 'stock RPC returns the resulting quantity');

create temporary table repeated_stock_result as
select * from public.apply_stock_change(
  '54000000-0000-0000-0000-000000000001', -3, 'manual_out', 'pgTAP', null, null, 'stock-rpc:test-key'
);

select results_eq(
  'select previous_quantity, resulting_quantity from repeated_stock_result',
  'values (10, 7)',
  'repeated idempotency key returns the original stock transition'
);
select is(
  (select count(*) from public.stock_movements where idempotency_key = 'stock-rpc:test-key'),
  1::bigint,
  'repeated idempotency key creates one stock movement'
);

select * from finish();
rollback;
