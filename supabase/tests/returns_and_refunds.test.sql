begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','return-customer@example.test','',now(),'{}','{}',now(),now()),
  ('51000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','return-admin@example.test','',now(),'{}','{}',now(),now()),
  ('51000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','return-other@example.test','',now(),'{}','{}',now(),now());

insert into public.customer_profiles(user_id,email,full_name) values
  ('51000000-0000-0000-0000-000000000001','return-customer@example.test','İade Müşterisi'),
  ('51000000-0000-0000-0000-000000000003','return-other@example.test','Başka Müşteri')
on conflict(user_id) do update set email=excluded.email,full_name=excluded.full_name;
insert into public.admin_users(user_id,email,full_name,role,is_active)
values('51000000-0000-0000-0000-000000000002','return-admin@example.test','İade Admin','admin',true);

insert into public.products(id,sku,slug,title,status,stock_quantity,tax_rate)
values('52000000-0000-0000-0000-000000000001','RETURN-SKU','return-product','İade Ürünü','published',10,20);
insert into public.orders(id,order_number,user_id,status,total,customer_name,customer_email)
values('53000000-0000-0000-0000-000000000001','FAZ24-ORDER-1','51000000-0000-0000-0000-000000000001','completed',300,'İade Müşterisi','return-customer@example.test');
insert into public.order_items(id,order_id,product_id,product_title,unit_price,quantity,line_total)
values('54000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','İade Ürünü',100,3,300);
insert into public.shipments(id,order_id,shipment_number,status,shipped_at,created_by)
values('55000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','FAZ24-SHIP-1','shipped',now(),'51000000-0000-0000-0000-000000000002');
insert into public.shipment_items(shipment_id,order_item_id,quantity)
values('55000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001',2);
insert into public.payment_attempts(id,order_id,user_id,provider,status,amount)
values('56000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','odeal','failed',300);

select is((select accounting_action from public.sync_order_accounting('53000000-0000-0000-0000-000000000001')),'posted','order debt is posted before return');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select throws_ok($$
  select * from public.create_return_request(
    '53000000-0000-0000-0000-000000000001',
    '[{"order_item_id":"54000000-0000-0000-0000-000000000001","quantity":3}]',
    'Fazla miktar testi',''
  )
$$,'22023',null,'return quantity cannot exceed shipped quantity');
select lives_ok($$
  select * from public.create_return_request(
    '53000000-0000-0000-0000-000000000001',
    '[{"order_item_id":"54000000-0000-0000-0000-000000000001","quantity":2}]',
    'Ürün uygun değil','Müşteri notu'
  )
$$,'valid line return is created');
select is((select count(*) from public.return_requests),1::bigint,'customer sees own return');
reset role;

select is((select total_refund_amount from public.return_requests where order_id='53000000-0000-0000-0000-000000000001'),200.00::numeric,'refund amount is prorated from the order line');
select is((select payment_attempt_id from public.return_requests limit 1),null::uuid,'failed payment attempt is not linked to the refund');
select is((select quantity from public.return_items limit 1),2,'return line keeps requested quantity');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.return_requests),0::bigint,'another customer cannot view the return');
reset role;

select throws_ok($$
  select * from public.create_return_request(
    '53000000-0000-0000-0000-000000000001',
    '[{"order_item_id":"54000000-0000-0000-0000-000000000001","quantity":1}]',
    'İkinci talep',''
  )
$$,'P0002',null,'request without authenticated ownership is hidden');

select lives_ok($$
  select * from public.transition_return_request(
    (select id from public.return_requests limit 1),'approved','Onaylandı','51000000-0000-0000-0000-000000000002'
  )
$$,'admin approves the return');
select lives_ok($$
  select * from public.transition_return_request(
    (select id from public.return_requests limit 1),'received','Depoya alındı','51000000-0000-0000-0000-000000000002'
  )
$$,'warehouse receipt restocks the item');
select is((select stock_quantity from public.products where id='52000000-0000-0000-0000-000000000001'),12,'returned stock is added exactly once');
select is((select count(*) from public.stock_movements where type='return_in'),1::bigint,'one immutable stock movement is recorded');
select throws_ok($$
  select * from public.transition_return_request(
    (select id from public.return_requests limit 1),'received','','51000000-0000-0000-0000-000000000002'
  )
$$,'22023',null,'duplicate receipt transition is rejected');
select is((select count(*) from public.stock_movements where type='return_in'),1::bigint,'rejected duplicate does not restock again');

select lives_ok($$
  select * from public.transition_return_request(
    (select id from public.return_requests limit 1),'refund_pending','Geri ödeme başlatıldı','51000000-0000-0000-0000-000000000002'
  )
$$,'approved receipt moves to refund pending');
select is((select provider::text from public.refund_transactions limit 1),'offline','cari return uses offline refund provider');
select is((select status from public.refund_transactions limit 1),'pending','refund starts pending');

select is(
  (select refund_status from public.finalize_return_refund(
    (select id from public.refund_transactions limit 1),true,'MANUAL-FAZ24','',
    '51000000-0000-0000-0000-000000000002'
  )),
  'succeeded','successful refund is finalized'
);
select is((select status from public.return_requests limit 1),'refunded','return becomes refunded');
select is((select round(sum(debit-credit),2) from public.account_transactions where customer_id='51000000-0000-0000-0000-000000000001'),100.00::numeric,'cari debt is reduced by the returned amount');
select is((select count(*) from public.account_transactions where idempotency_key like 'return-order-credit:%'),1::bigint,'one compensating ledger row is appended');
select ok((select idempotency_hit from public.finalize_return_refund(
  (select id from public.refund_transactions limit 1),true,'MANUAL-FAZ24','',
  '51000000-0000-0000-0000-000000000002'
)),'duplicate refund finalization is idempotent');
select is((select count(*) from public.account_transactions where idempotency_key like 'return-order-credit:%'),1::bigint,'duplicate finalization does not append ledger rows');
select ok((select count(*) from public.audit_logs where resource_type in ('return_request','refund_transaction')) >= 4,'return transitions and refund are audited');

select * from finish();
rollback;
