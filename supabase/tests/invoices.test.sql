begin;

create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('61000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invoice-customer@example.test','',now(),'{}','{}',now(),now()),
  ('61000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invoice-admin@example.test','',now(),'{}','{}',now(),now()),
  ('61000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','invoice-other@example.test','',now(),'{}','{}',now(),now());

insert into public.customer_profiles(user_id,email,full_name) values
  ('61000000-0000-0000-0000-000000000001','invoice-customer@example.test','Fatura Müşterisi'),
  ('61000000-0000-0000-0000-000000000003','invoice-other@example.test','Başka Müşteri')
on conflict(user_id) do update set email=excluded.email,full_name=excluded.full_name;
insert into public.admin_users(user_id,email,full_name,role,is_active)
values('61000000-0000-0000-0000-000000000002','invoice-admin@example.test','Fatura Admin','admin',true);

insert into public.products(id,sku,slug,title,status,stock_quantity)
values('62000000-0000-0000-0000-000000000001','INVOICE-SKU','invoice-product','Fatura Ürünü','published',20);
insert into public.orders(id,order_number,user_id,status,subtotal,discount_total,shipping_total,total,customer_name,customer_email,customer_phone,billing_address)
values
  ('63000000-0000-0000-0000-000000000001','FAZ25-ORDER-1','61000000-0000-0000-0000-000000000001','completed',250,20,10,240,'Fatura Müşterisi','invoice-customer@example.test','05550000000','{"city":"Bursa","district":"İznik"}'),
  ('63000000-0000-0000-0000-000000000002','FAZ25-ORDER-2','61000000-0000-0000-0000-000000000001','completed',100,0,0,100,'Fatura Müşterisi','invoice-customer@example.test','05550000000','{"city":"Bursa"}');
insert into public.order_items(id,order_id,product_id,product_title,unit_price,quantity,line_total)
values
  ('64000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','Fatura Ürünü',125,2,250),
  ('64000000-0000-0000-0000-000000000002','63000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000001','Fatura Ürünü',100,1,100);

select throws_ok($$
  select * from public.create_order_invoice(
    '63000000-0000-0000-0000-000000000001',20,'1234567890','İznik',null,'{}',null,'',
    '61000000-0000-0000-0000-000000000003'
  )
$$,'42501',null,'non-admin actor cannot create an invoice');
select lives_ok($$
  select * from public.create_order_invoice(
    '63000000-0000-0000-0000-000000000001',20,'1234567890','İznik',null,'{"name":"İzniko Ticaret"}',null,'Test faturası',
    '61000000-0000-0000-0000-000000000002'
  )
$$,'first order invoice is created');
select lives_ok($$
  select * from public.create_order_invoice(
    '63000000-0000-0000-0000-000000000002',20,'','','{}','{}',null,'',
    '61000000-0000-0000-0000-000000000002'
  )
$$,'second order invoice is created');
select is((select count(*) from public.invoices where document_type='invoice'),2::bigint,'one original invoice exists for each order');
select is((select count(distinct invoice_number) from public.invoices),2::bigint,'atomic invoice numbers are unique');
select ok((select bool_and(invoice_number ~ '^FAT-[0-9]{4}-[0-9]{7}$') from public.invoices),'invoice numbers use the expected format');
select is((select total from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),240.00::numeric,'invoice total matches the order');
select is((select tax_total from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),40.00::numeric,'included VAT is calculated from the final total');
select is((select customer_tax_office from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),'İznik','customer tax snapshot is stored');
select is((select discount_amount from public.invoice_items where order_item_id='64000000-0000-0000-0000-000000000001'),20.00::numeric,'order discount is allocated to the invoice line');
select is((select ii.line_total+i.shipping_total from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where ii.order_item_id='64000000-0000-0000-0000-000000000001'),240.00::numeric,'invoice line and shipping reconcile to the header total');
select throws_ok($$
  select * from public.create_order_invoice(
    '63000000-0000-0000-0000-000000000001',20,'','','{}','{}',null,'',
    '61000000-0000-0000-0000-000000000002'
  )
$$,'23505',null,'duplicate original invoice is rejected');
select throws_ok($$update public.invoices set customer_name='Değiştirildi' where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'$$,'55000',null,'invoice snapshot cannot be mutated');
select throws_ok($$update public.invoice_items set quantity=9 where order_item_id='64000000-0000-0000-0000-000000000001'$$,'55000',null,'invoice item cannot be mutated');
select throws_ok($$delete from public.invoice_items where order_item_id='64000000-0000-0000-0000-000000000001'$$,'55000',null,'invoice item cannot be deleted');

insert into public.return_requests(id,return_number,order_id,user_id,status,reason,total_refund_amount)
values
  ('65000000-0000-0000-0000-000000000001','FAZ25-RETURN-1','63000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','refunded','Kısmi iade',100),
  ('65000000-0000-0000-0000-000000000002','FAZ25-RETURN-2','63000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','refunded','Fazla iade testi',200),
  ('65000000-0000-0000-0000-000000000003','FAZ25-RETURN-3','63000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001','refunded','İptal sonrası iade testi',50);
insert into public.return_items(return_request_id,order_item_id,product_id,quantity,refund_amount)
values
  ('65000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001',1,100),
  ('65000000-0000-0000-0000-000000000002','64000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001',2,200),
  ('65000000-0000-0000-0000-000000000003','64000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000001',1,50);

select lives_ok($$
  select * from public.create_invoice_adjustment(
    (select id from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),
    'refund','65000000-0000-0000-0000-000000000001','Kısmi iade','61000000-0000-0000-0000-000000000002'
  )
$$,'refund document is created');
select is((select parent_invoice_id from public.invoices where return_request_id='65000000-0000-0000-0000-000000000001'),(select id from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),'refund document links to the original invoice');
select is((select line_total from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where i.return_request_id='65000000-0000-0000-0000-000000000001'),100.00::numeric,'refund document snapshots the refunded line amount');
select throws_ok($$
  select * from public.create_invoice_adjustment(
    (select id from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),
    'cancellation',null,'','61000000-0000-0000-0000-000000000002'
  )
$$,'23505',null,'invoice with a refund document cannot be fully cancelled');
select throws_ok($$
  select * from public.create_invoice_adjustment(
    (select id from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice'),
    'refund','65000000-0000-0000-0000-000000000002','','61000000-0000-0000-0000-000000000002'
  )
$$,'23514',null,'cumulative refunds cannot exceed the original invoice total');
select lives_ok($$
  select * from public.create_invoice_adjustment(
    (select id from public.invoices where order_id='63000000-0000-0000-0000-000000000002' and document_type='invoice'),
    'cancellation',null,'Sipariş iptali','61000000-0000-0000-0000-000000000002'
  )
$$,'cancellation document is created');
select is((select status from public.invoices where order_id='63000000-0000-0000-0000-000000000002' and document_type='invoice'),'cancelled','original invoice is marked cancelled');
select is((select count(*) from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where i.order_id='63000000-0000-0000-0000-000000000002' and i.document_type='cancellation'),1::bigint,'cancellation document clones original invoice items');
select throws_ok($$
  select * from public.create_invoice_adjustment(
    (select id from public.invoices where order_id='63000000-0000-0000-0000-000000000002' and document_type='invoice'),
    'refund','65000000-0000-0000-0000-000000000003','','61000000-0000-0000-0000-000000000002'
  )
$$,'23505',null,'cancelled invoice cannot receive a refund document');

insert into public.invoice_provider_attempts(invoice_id,provider,action,status,safe_message)
select id,'disabled','send','disabled','Sağlayıcı bağlı değil.' from public.invoices where order_id='63000000-0000-0000-0000-000000000001' and document_type='invoice';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.invoices),4::bigint,'customer sees only own invoice documents');
select is((select count(*) from public.invoice_provider_attempts),1::bigint,'customer sees provider history for own invoice');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.invoices),0::bigint,'another customer cannot view invoice documents');
select is((select count(*) from public.invoice_provider_attempts),0::bigint,'another customer cannot view provider history');
reset role;

select ok((select count(*) from public.audit_logs where resource_type='invoice') >= 4,'invoice creation and adjustments are audited');

select * from finish();
rollback;
