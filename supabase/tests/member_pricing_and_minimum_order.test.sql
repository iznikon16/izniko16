begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select ok(not has_column_privilege('anon','public.products','price','SELECT'),'anonymous cannot select standard price');
select ok(not has_column_privilege('anon','public.products','compare_at_price','SELECT'),'anonymous cannot select compare price');
select ok(has_column_privilege('anon','public.products','title','SELECT'),'anonymous can select product title');
select ok(has_column_privilege('anon','public.products','minimum_order_quantity','SELECT'),'anonymous can select minimum quantity');

insert into public.products(id,sku,slug,title,price,status,is_active,stock_quantity,minimum_order_quantity,tax_rate)
values('50000000-0000-0000-0000-000000000001','MIN-5','min-five','Minimum Five',100,'published',true,100,5,20);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values('50000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','min@example.test','',now(),now());
insert into public.customer_profiles(user_id,email,full_name,email_verified_at)
values('50000000-0000-0000-0000-000000000010','min@example.test','Minimum Test',now());

select throws_ok(
  $$insert into public.cart_items(user_id,product_id,quantity) values('50000000-0000-0000-0000-000000000010','50000000-0000-0000-0000-000000000001',4)$$,
  '22023', 'Bu ürün için minimum sipariş adedi 5''tir.', 'cart rejects quantity below minimum'
);
select lives_ok(
  $$insert into public.cart_items(user_id,product_id,quantity) values('50000000-0000-0000-0000-000000000010','50000000-0000-0000-0000-000000000001',5)$$,
  'cart accepts minimum quantity'
);
select throws_ok(
  $$update public.cart_items set quantity=101 where user_id='50000000-0000-0000-0000-000000000010' and product_id='50000000-0000-0000-0000-000000000001'$$,
  '22023', 'Talep edilen miktar mevcut stoktan fazla.', 'cart rejects quantity above stock'
);

select * from finish();
rollback;
