alter table public.products
  add column if not exists minimum_order_quantity integer not null default 1;

alter table public.products
  drop constraint if exists products_minimum_order_quantity_check;
alter table public.products
  add constraint products_minimum_order_quantity_check check (minimum_order_quantity >= 1);

grant select (minimum_order_quantity) on table public.products to anon;

create or replace function public.validate_commerce_item_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minimum integer;
  v_stock integer;
begin
  select p.minimum_order_quantity, p.stock_quantity
  into v_minimum, v_stock
  from public.products p
  where p.id = new.product_id and p.is_active = true and p.status = 'published';

  if not found then
    raise exception 'Ürün siparişe uygun değil.' using errcode = '22023';
  end if;
  if new.quantity < v_minimum then
    raise exception 'Bu ürün için minimum sipariş adedi %''tir.', v_minimum using errcode = '22023';
  end if;
  if new.quantity > v_stock then
    raise exception 'Talep edilen miktar mevcut stoktan fazla.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_cart_item_quantity on public.cart_items;
create trigger validate_cart_item_quantity
before insert or update of product_id, quantity on public.cart_items
for each row execute function public.validate_commerce_item_quantity();

drop trigger if exists validate_order_item_quantity on public.order_items;
create trigger validate_order_item_quantity
before insert on public.order_items
for each row when (new.product_id is not null)
execute function public.validate_commerce_item_quantity();

revoke all on function public.validate_commerce_item_quantity() from public, anon, authenticated;
