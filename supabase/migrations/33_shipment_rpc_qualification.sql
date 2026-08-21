-- Faz 23 yerel ve ileri migration uyumluluğu: nitelendirilmiş RPC gövdeleri.

create or replace function public.create_order_shipment(
  p_order_id uuid,
  p_items jsonb,
  p_carrier text default '',
  p_tracking_number text default '',
  p_tracking_url text default null,
  p_note text default '',
  p_actor_user_id uuid default null
)
returns table(shipment_id uuid, history_id uuid, order_id uuid, shipment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment_id uuid := gen_random_uuid();
  v_history_id uuid := gen_random_uuid();
  v_item jsonb;
  v_order_item public.order_items%rowtype;
  v_quantity integer;
  v_already_shipped integer;
begin
  if p_actor_user_id is null or not public.is_admin(p_actor_user_id) then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Sipariş bulunamadı.' using errcode = 'P0002'; end if;
  if v_order.status not in ('confirmed', 'preparing', 'shipped') then
    raise exception 'Bu sipariş sevkiyata uygun durumda değil.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'En az bir sevkiyat kalemi zorunludur.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) value
    group by value->>'order_item_id' having count(*) > 1
  ) then
    raise exception 'Aynı sipariş kalemi birden fazla kez gönderilemez.' using errcode = '22023';
  end if;

  insert into public.shipments (
    id, order_id, shipment_number, carrier, tracking_number, tracking_url, note, created_by
  ) values (
    v_shipment_id, p_order_id,
    'SVK-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(v_shipment_id::text, '-', ''), 1, 8)),
    trim(coalesce(p_carrier, '')), trim(coalesce(p_tracking_number, '')),
    nullif(trim(coalesce(p_tracking_url, '')), ''), trim(coalesce(p_note, '')), p_actor_user_id
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Sevkiyat miktarı geçersiz.' using errcode = '22023';
    end;
    if v_quantity <= 0 then
      raise exception 'Sevkiyat miktarı sıfırdan büyük olmalıdır.' using errcode = '22023';
    end if;

    select oi.* into v_order_item
    from public.order_items oi
    where oi.id = (v_item->>'order_item_id')::uuid and oi.order_id = p_order_id
    for update;
    if not found then raise exception 'Sipariş kalemi bulunamadı.' using errcode = 'P0002'; end if;

    select coalesce(sum(si.quantity), 0)::integer into v_already_shipped
    from public.shipment_items si
    join public.shipments s on s.id = si.shipment_id
    where si.order_item_id = v_order_item.id and s.status <> 'cancelled';

    if v_already_shipped + v_quantity > v_order_item.quantity then
      raise exception '% ürünü için sevkiyat miktarı sipariş miktarını aşıyor.', v_order_item.product_title using errcode = '22023';
    end if;

    insert into public.shipment_items(shipment_id, order_item_id, quantity)
    values (v_shipment_id, v_order_item.id, v_quantity);
  end loop;

  insert into public.shipment_status_history(id, shipment_id, from_status, to_status, note, actor_user_id)
  values (v_history_id, v_shipment_id, null, 'preparing', trim(coalesce(p_note, '')), p_actor_user_id);

  update public.orders set status = 'preparing' where id = p_order_id and status = 'confirmed';
  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, new_value)
  values (p_actor_user_id, 'shipment.create', 'shipment', v_shipment_id::text,
    jsonb_build_object('order_id', p_order_id, 'status', 'preparing'));

  return query select v_shipment_id, v_history_id, p_order_id, 'preparing'::text;
end;
$$;
create or replace function public.update_order_shipment(
  p_shipment_id uuid,
  p_status text,
  p_carrier text default '',
  p_tracking_number text default '',
  p_tracking_url text default null,
  p_note text default '',
  p_actor_user_id uuid default null
)
returns table(shipment_id uuid, history_id uuid, order_id uuid, previous_status text, shipment_status text, status_changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
  v_history_id uuid;
  v_changed boolean;
  v_all_delivered boolean;
  v_has_active boolean;
begin
  if p_actor_user_id is null or not public.is_admin(p_actor_user_id) then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if p_status not in ('preparing','ready','shipped','in_transit','out_for_delivery','delivered','cancelled') then
    raise exception 'Geçersiz sevkiyat durumu.' using errcode = '22023';
  end if;

  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Sevkiyat bulunamadı.' using errcode = 'P0002'; end if;
  perform 1 from public.orders where id = v_shipment.order_id for update;
  v_changed := v_shipment.status <> p_status;

  if v_changed and not (
    (v_shipment.status = 'preparing' and p_status in ('ready','cancelled')) or
    (v_shipment.status = 'ready' and p_status in ('shipped','cancelled')) or
    (v_shipment.status = 'shipped' and p_status in ('in_transit','out_for_delivery','delivered')) or
    (v_shipment.status = 'in_transit' and p_status in ('out_for_delivery','delivered')) or
    (v_shipment.status = 'out_for_delivery' and p_status = 'delivered')
  ) then
    raise exception 'Geçersiz sevkiyat durum geçişi: % -> %', v_shipment.status, p_status using errcode = '22023';
  end if;

  update public.shipments set
    status = p_status,
    carrier = trim(coalesce(p_carrier, '')),
    tracking_number = trim(coalesce(p_tracking_number, '')),
    tracking_url = nullif(trim(coalesce(p_tracking_url, '')), ''),
    note = trim(coalesce(p_note, '')),
    shipped_at = case when p_status in ('shipped','in_transit','out_for_delivery','delivered') then coalesce(shipped_at, now()) else shipped_at end,
    delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end
  where id = p_shipment_id;

  if v_changed then
    v_history_id := gen_random_uuid();
    insert into public.shipment_status_history(id, shipment_id, from_status, to_status, note, actor_user_id)
    values (v_history_id, p_shipment_id, v_shipment.status, p_status, trim(coalesce(p_note, '')), p_actor_user_id);
  end if;

  select not exists (
    select 1 from public.order_items oi
    where oi.order_id = v_shipment.order_id and oi.quantity > coalesce((
      select sum(si.quantity) from public.shipment_items si
      join public.shipments s on s.id = si.shipment_id
      where si.order_item_id = oi.id and s.status = 'delivered'
    ), 0)
  ) into v_all_delivered;
  select exists (select 1 from public.shipments s where s.order_id = v_shipment.order_id and s.status <> 'cancelled') into v_has_active;

  update public.orders set status = case
    when v_all_delivered then 'completed'::public.order_status
    when exists (select 1 from public.shipments s where s.order_id = v_shipment.order_id and s.status in ('shipped','in_transit','out_for_delivery','delivered')) then 'shipped'::public.order_status
    when v_has_active then 'preparing'::public.order_status
    else 'confirmed'::public.order_status
  end where id = v_shipment.order_id;

  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, old_value, new_value)
  values (p_actor_user_id, case when v_changed then 'shipment.status_update' else 'shipment.update' end,
    'shipment', p_shipment_id::text,
    jsonb_build_object('status', v_shipment.status), jsonb_build_object('status', p_status));

  return query select p_shipment_id, v_history_id, v_shipment.order_id, v_shipment.status, p_status, v_changed;
end;
$$;
