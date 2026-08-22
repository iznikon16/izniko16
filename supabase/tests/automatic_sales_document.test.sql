begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','document@example.test','',now(),now());
insert into public.customer_profiles(user_id,email,full_name,email_verified_at)
values('51000000-0000-0000-0000-000000000001','document@example.test','Document Customer',now());
insert into public.products(id,sku,slug,title,price,status,is_active,stock_quantity,minimum_order_quantity,tax_rate)
values('51000000-0000-0000-0000-000000000010','DOC-1','document-product','Document Product',100,'published',true,20,1,20);
insert into public.orders(id,order_number,user_id,status,subtotal,total,customer_name,customer_email)
values('51000000-0000-0000-0000-000000000020','SP-DOCUMENT-1','51000000-0000-0000-0000-000000000001','pending_payment',200,200,'Document Customer','document@example.test');
insert into public.order_items(order_id,product_id,product_title,unit_price,quantity,line_total)
values('51000000-0000-0000-0000-000000000020','51000000-0000-0000-0000-000000000010','Document Product',100,2,200);

update public.orders set status='confirmed' where id='51000000-0000-0000-0000-000000000020';

select is((select count(*) from public.invoices where order_id='51000000-0000-0000-0000-000000000020' and document_type='sales_document'),1::bigint,'qualifying order creates one sales document');
select like((select invoice_number from public.invoices where order_id='51000000-0000-0000-0000-000000000020' and document_type='sales_document'),'SBL-%','sales document receives SBL number');
select is((select ii.unit_price from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where i.order_id='51000000-0000-0000-0000-000000000020' and i.document_type='sales_document'),100.00::numeric,'document uses order item price snapshot');

do $$
begin
  perform public.ensure_order_sales_document('51000000-0000-0000-0000-000000000020');
end;
$$;
select is((select count(*) from public.invoices where order_id='51000000-0000-0000-0000-000000000020' and document_type='sales_document'),1::bigint,'repeated document event stays idempotent');

select * from finish();
rollback;
