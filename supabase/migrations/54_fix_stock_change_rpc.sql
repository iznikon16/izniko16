-- Keep the stock ledger atomic and make the RPC contract explicit for PostgREST.
create or replace function public.apply_stock_change(
  p_product_id uuid,
  p_quantity_change integer,
  p_type text,
  p_reference text,
  p_order_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns table(previous_quantity integer, resulting_quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev integer;
  v_result integer;
begin
  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'Stok idempotency anahtarı zorunludur.';
  end if;

  -- Serialize equal keys so concurrent retries cannot post the same movement twice.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  return query
    select movement.previous_quantity::integer, movement.resulting_quantity::integer
    from public.stock_movements movement
    where movement.idempotency_key = p_idempotency_key
    order by movement.created_at asc
    limit 1;

  if found then
    return;
  end if;

  select product.stock_quantity
  into v_prev
  from public.products product
  where product.id = p_product_id
  for update;

  if not found then
    raise exception 'Ürün bulunamadı: %', p_product_id;
  end if;

  v_result := v_prev + p_quantity_change;
  if v_result < 0 then
    raise exception 'Yetersiz stok. Ürün: %, mevcut: %, değişim: %', p_product_id, v_prev, p_quantity_change;
  end if;

  update public.products
  set
    stock_quantity = v_result,
    stock_status = case when v_result <= 0 then 'out_of_stock'::public.stock_status else 'in_stock'::public.stock_status end,
    updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements (
    product_id, quantity_change, previous_quantity, resulting_quantity,
    type, reference, order_id, actor_user_id, idempotency_key
  ) values (
    p_product_id, p_quantity_change, v_prev, v_result,
    p_type, coalesce(p_reference, ''), p_order_id, p_actor_user_id, p_idempotency_key
  );

  return query select v_prev, v_result;
end;
$$;

revoke execute on function public.apply_stock_change(uuid, integer, text, text, uuid, uuid, text) from public, anon;
grant execute on function public.apply_stock_change(uuid, integer, text, text, uuid, uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
