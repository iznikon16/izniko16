begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('41000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','shipment-customer@example.test','',now(),'{}','{}',now(),now()),
  ('41000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','shipment-admin@example.test','',now(),'{}','{}',now(),now()),
  ('41000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-customer@example.test','',now(),'{}','{}',now(),now());

insert into public.customer_profiles(user_id,email,full_name) values
  ('41000000-0000-0000-0000-000000000001','shipment-customer@example.test','Sevkiyat Müşterisi'),
  ('41000000-0000-0000-0000-000000000003','other-customer@example.test','Başka Müşteri')
on conflict (user_id) do update set email=excluded.email, full_name=excluded.full_name;
insert into public.admin_users(user_id,email,full_name,role,is_active)
values ('41000000-0000-0000-0000-000000000002','shipment-admin@example.test','Sevkiyat Admin','admin',true);

insert into public.orders(id,order_number,user_id,status,total,customer_name,customer_email,customer_phone)
values ('42000000-0000-0000-0000-000000000001','FAZ23-ORDER-1','41000000-0000-0000-0000-000000000001','confirmed',500,'Sevkiyat Müşterisi','shipment-customer@example.test','05321112233');
insert into public.order_items(id,order_id,product_title,quantity,line_total) values
  ('43000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','Test Ürünü A',5,300),
  ('43000000-0000-0000-0000-000000000002','42000000-0000-0000-0000-000000000001','Test Ürünü B',2,200);

select lives_ok($$
  select * from public.create_order_shipment(
    p_order_id := '42000000-0000-0000-0000-000000000001',
    p_items := '[{"order_item_id":"43000000-0000-0000-0000-000000000001","quantity":3}]',
    p_carrier := 'Test Kargo', p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  )
$$, 'partial shipment is created');

select is((select count(*) from public.shipments where order_id='42000000-0000-0000-0000-000000000001'), 1::bigint, 'one shipment exists');
select is((select quantity from public.shipment_items limit 1), 3, 'partial quantity is recorded');
select is((select status::text from public.orders where id='42000000-0000-0000-0000-000000000001'), 'preparing', 'order moves to preparing');
select is((select count(*) from public.shipment_status_history), 1::bigint, 'initial status history is recorded');

select throws_ok($$
  select * from public.create_order_shipment(
    p_order_id := '42000000-0000-0000-0000-000000000001',
    p_items := '[{"order_item_id":"43000000-0000-0000-0000-000000000001","quantity":3}]',
    p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  )
$$, '22023', 'Test Ürünü A ürünü için sevkiyat miktarı sipariş miktarını aşıyor.', 'over-shipment is rejected');

select is((select count(*) from public.shipments), 1::bigint, 'rejected shipment rolls back completely');

select lives_ok($$
  select * from public.create_order_shipment(
    p_order_id := '42000000-0000-0000-0000-000000000001',
    p_items := '[{"order_item_id":"43000000-0000-0000-0000-000000000001","quantity":2},{"order_item_id":"43000000-0000-0000-0000-000000000002","quantity":2}]',
    p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  )
$$, 'remaining quantities can be shipped separately');

select is((select sum(si.quantity) from public.shipment_items si where si.order_item_id='43000000-0000-0000-0000-000000000001'), 5::bigint, 'total shipped allocation equals ordered quantity');

select lives_ok($$
  select * from public.update_order_shipment(
    p_shipment_id := (select shipment_id from public.shipment_items where quantity = 3 limit 1),
    p_status := 'ready', p_carrier := 'Test Kargo', p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  )
$$, 'valid status transition succeeds');

select throws_ok($$
  select * from public.update_order_shipment(
    p_shipment_id := (select shipment_id from public.shipment_items where quantity = 3 limit 1),
    p_status := 'delivered', p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  )
$$, '22023', null, 'invalid status transition is rejected');

select lives_ok($$
  select * from public.update_order_shipment(
    p_shipment_id := (select shipment_id from public.shipment_items where quantity = 3 limit 1),
    p_status := 'shipped', p_carrier := 'Test Kargo', p_tracking_number := 'TK-23',
    p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  );
  select * from public.update_order_shipment(
    p_shipment_id := (select shipment_id from public.shipment_items where quantity = 3 limit 1),
    p_status := 'delivered', p_carrier := 'Test Kargo', p_tracking_number := 'TK-23',
    p_actor_user_id := '41000000-0000-0000-0000-000000000002'
  )
$$, 'shipment can progress to delivered');

select ok((select s.delivered_at is not null from public.shipments s join public.shipment_items si on si.shipment_id=s.id where si.quantity=3 limit 1), 'delivery timestamp is recorded');

select ok((select count(*) from public.audit_logs where resource_type='shipment') >= 3, 'shipment mutations are audited');
select ok(exists(select 1 from public.sms_templates where key='shipment_status'), 'shipment SMS template is seeded');
select ok(exists(select 1 from public.email_templates where key='customer_shipment_status_updated'), 'shipment email template is seeded');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.shipments), 2::bigint, 'customer can view own shipments');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.shipments), 0::bigint, 'customer cannot view another customers shipments');
reset role;

select * from finish();
rollback;
