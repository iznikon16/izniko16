-- Faz 24: Kalem bazlı iade, stok kabulü, geri ödeme ve immutable cari telafi kayıtları.

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  status text not null default 'requested' check (status in (
    'requested','approved','rejected','received','refund_pending','refunded','completed'
  )),
  reason text not null,
  customer_note text not null default '',
  admin_note text not null default '',
  total_refund_amount numeric(14,2) not null default 0 check (total_refund_amount >= 0),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  received_at timestamptz,
  refunded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  refund_amount numeric(14,2) not null check (refund_amount >= 0),
  restocked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(return_request_id, order_item_id)
);

create table public.refund_transactions (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null unique references public.return_requests(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  provider public.payment_provider not null default 'offline',
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'TRY',
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  provider_reference text,
  error_message text not null default '',
  idempotency_key text not null unique,
  order_credit_transaction_id uuid references public.account_transactions(id) on delete set null,
  payout_debit_transaction_id uuid references public.account_transactions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.return_status_history (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  from_status text,
  to_status text not null,
  note text not null default '',
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_status is null or from_status in ('requested','approved','rejected','received','refund_pending','refunded','completed')),
  check (to_status in ('requested','approved','rejected','received','refund_pending','refunded','completed'))
);

create index idx_return_requests_user_created on public.return_requests(user_id, created_at desc);
create index idx_return_requests_order on public.return_requests(order_id, created_at desc);
create index idx_return_requests_status on public.return_requests(status, created_at desc);
create index idx_return_items_order_item on public.return_items(order_item_id);
create index idx_return_history_request_created on public.return_status_history(return_request_id, created_at desc);
create index idx_refund_transactions_status on public.refund_transactions(status, created_at desc);

create trigger update_return_requests_updated_at before update on public.return_requests
  for each row execute function public.set_updated_at();
create trigger update_refund_transactions_updated_at before update on public.refund_transactions
  for each row execute function public.set_updated_at();

alter table public.return_requests enable row level security;
alter table public.return_items enable row level security;
alter table public.refund_transactions enable row level security;
alter table public.return_status_history enable row level security;

create or replace function public.can_view_return(p_return_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.return_requests r where r.id = p_return_id and r.user_id = p_user_id);
$$;
revoke all on function public.can_view_return(uuid,uuid) from public, anon;
grant execute on function public.can_view_return(uuid,uuid) to authenticated, service_role;

create policy "Customers view own returns" on public.return_requests
  for select using (user_id = auth.uid());
create policy "Customers view own return items" on public.return_items
  for select using (public.can_view_return(return_request_id));
create policy "Customers view own return history" on public.return_status_history
  for select using (public.can_view_return(return_request_id));
create policy "Customers view own refund records" on public.refund_transactions
  for select using (public.can_view_return(return_request_id));

create policy "Admins manage returns" on public.return_requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins manage return items" on public.return_items
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins manage return history" on public.return_status_history
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins manage refunds" on public.refund_transactions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select on public.return_requests, public.return_items, public.return_status_history, public.refund_transactions to authenticated;
grant all on public.return_requests, public.return_items, public.return_status_history, public.refund_transactions to service_role;

insert into public.permissions(key, description) values
  ('return.view', 'İade taleplerini görüntüleme'),
  ('return.manage', 'İade, ürün kabulü ve geri ödeme yönetimi')
on conflict(key) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name in ('admin','staff') and p.key in ('return.view','return.manage')
on conflict do nothing;

create or replace function public.create_return_request(
  p_order_id uuid,
  p_items jsonb,
  p_reason text,
  p_customer_note text default ''
)
returns table(return_request_id uuid, return_number text, total_refund_amount numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_return_id uuid := gen_random_uuid();
  v_return_number text;
  v_item jsonb;
  v_order_item public.order_items%rowtype;
  v_quantity integer;
  v_shipment_count integer;
  v_shipped_quantity integer;
  v_previous_returned integer;
  v_line_refund numeric(14,2);
  v_total numeric(14,2) := 0;
  v_attempt_id uuid;
begin
  if v_user_id is null then raise exception 'Oturum açmanız gerekiyor.' using errcode='42501'; end if;
  if nullif(btrim(coalesce(p_reason,'')), '') is null then raise exception 'İade nedeni zorunludur.' using errcode='22023'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'En az bir iade kalemi zorunludur.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) value group by value->>'order_item_id' having count(*)>1) then
    raise exception 'Aynı sipariş kalemi birden fazla kez eklenemez.' using errcode='22023';
  end if;

  select * into v_order from public.orders where id=p_order_id and user_id=v_user_id for update;
  if not found then raise exception 'Sipariş bulunamadı.' using errcode='P0002'; end if;
  if v_order.status not in ('shipped','completed') then raise exception 'Yalnız sevk edilmiş siparişler için iade açılabilir.' using errcode='22023'; end if;

  select count(*)::integer into v_shipment_count from public.shipments where order_id=p_order_id;
  select id into v_attempt_id from public.payment_attempts where order_id=p_order_id and status='paid' order by created_at desc limit 1;
  v_return_number := 'IAD-' || to_char(clock_timestamp(),'YYYYMMDD') || '-' || upper(substr(replace(v_return_id::text,'-',''),1,8));

  insert into public.return_requests(id,return_number,order_id,user_id,payment_attempt_id,reason,customer_note)
  values(v_return_id,v_return_number,p_order_id,v_user_id,v_attempt_id,btrim(p_reason),btrim(coalesce(p_customer_note,'')));

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin v_quantity := (v_item->>'quantity')::integer;
    exception when others then raise exception 'İade miktarı geçersiz.' using errcode='22023'; end;
    if v_quantity <= 0 then raise exception 'İade miktarı sıfırdan büyük olmalıdır.' using errcode='22023'; end if;

    select oi.* into v_order_item from public.order_items oi
    where oi.id=(v_item->>'order_item_id')::uuid and oi.order_id=p_order_id for update;
    if not found then raise exception 'Sipariş kalemi bulunamadı.' using errcode='P0002'; end if;

    if v_shipment_count > 0 then
      select coalesce(sum(si.quantity),0)::integer into v_shipped_quantity
      from public.shipment_items si join public.shipments s on s.id=si.shipment_id
      where si.order_item_id=v_order_item.id and s.status in ('shipped','in_transit','out_for_delivery','delivered');
    else
      v_shipped_quantity := v_order_item.quantity;
    end if;

    select coalesce(sum(ri.quantity),0)::integer into v_previous_returned
    from public.return_items ri join public.return_requests rr on rr.id=ri.return_request_id
    where ri.order_item_id=v_order_item.id and rr.status <> 'rejected';

    if v_quantity + v_previous_returned > least(v_order_item.quantity, v_shipped_quantity) then
      raise exception '% ürünü için iade miktarı satın alınan veya sevk edilen miktarı aşıyor.', v_order_item.product_title using errcode='22023';
    end if;

    v_line_refund := round((v_order_item.line_total * v_quantity / v_order_item.quantity),2);
    insert into public.return_items(return_request_id,order_item_id,product_id,quantity,refund_amount)
    values(v_return_id,v_order_item.id,v_order_item.product_id,v_quantity,v_line_refund);
    v_total := v_total + v_line_refund;
  end loop;

  if v_total <= 0 then raise exception 'İade tutarı sıfırdan büyük olmalıdır.' using errcode='22023'; end if;
  update public.return_requests set total_refund_amount=v_total where id=v_return_id;
  insert into public.return_status_history(return_request_id,from_status,to_status,note,actor_user_id)
  values(v_return_id,null,'requested',btrim(coalesce(p_customer_note,'')),v_user_id);
  insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,new_value)
  values(v_user_id,'return.requested','return_request',v_return_id::text,jsonb_build_object('order_id',p_order_id,'amount',v_total));
  return query select v_return_id,v_return_number,v_total;
end;
$$;

revoke all on function public.create_return_request(uuid,jsonb,text,text) from public,anon;
grant execute on function public.create_return_request(uuid,jsonb,text,text) to authenticated;

create or replace function public.transition_return_request(
  p_return_request_id uuid,
  p_status text,
  p_admin_note text default '',
  p_actor_user_id uuid default null
)
returns table(return_request_id uuid, previous_status text, current_status text, refund_transaction_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_return public.return_requests%rowtype;
  v_item public.return_items%rowtype;
  v_refund_id uuid;
  v_attempt public.payment_attempts%rowtype;
begin
  if p_actor_user_id is null or not public.is_admin(p_actor_user_id) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501'; end if;
  select * into v_return from public.return_requests where id=p_return_request_id for update;
  if not found then raise exception 'İade talebi bulunamadı.' using errcode='P0002'; end if;
  if not (
    (v_return.status='requested' and p_status in ('approved','rejected')) or
    (v_return.status='approved' and p_status in ('received','rejected')) or
    (v_return.status='received' and p_status='refund_pending') or
    (v_return.status='refunded' and p_status='completed')
  ) then raise exception 'Geçersiz iade durum geçişi: % -> %',v_return.status,p_status using errcode='22023'; end if;

  if p_status='received' then
    for v_item in select ri.* from public.return_items ri where ri.return_request_id=v_return.id for update loop
      if v_item.product_id is not null then
        perform public.apply_stock_change(v_item.product_id,v_item.quantity,'return_in',v_return.return_number,v_return.order_id,p_actor_user_id,format('return-stock:%s',v_item.id));
      end if;
      update public.return_items set restocked_at=coalesce(restocked_at,now()) where id=v_item.id;
    end loop;
  end if;

  if p_status='refund_pending' then
    select * into v_attempt from public.payment_attempts where id=v_return.payment_attempt_id;
    insert into public.refund_transactions(return_request_id,payment_attempt_id,provider,amount,currency,idempotency_key)
    values(v_return.id,v_return.payment_attempt_id,coalesce(v_attempt.provider,'offline'),v_return.total_refund_amount,'TRY',format('return-refund:%s',v_return.id))
    on conflict on constraint refund_transactions_return_request_id_key do update set updated_at=now()
    returning id into v_refund_id;
  end if;

  update public.return_requests set status=p_status,admin_note=btrim(coalesce(p_admin_note,'')),
    approved_at=case when p_status='approved' then coalesce(approved_at,now()) else approved_at end,
    rejected_at=case when p_status='rejected' then coalesce(rejected_at,now()) else rejected_at end,
    received_at=case when p_status='received' then coalesce(received_at,now()) else received_at end,
    completed_at=case when p_status='completed' then coalesce(completed_at,now()) else completed_at end
  where id=v_return.id;
  insert into public.return_status_history(return_request_id,from_status,to_status,note,actor_user_id)
  values(v_return.id,v_return.status,p_status,btrim(coalesce(p_admin_note,'')),p_actor_user_id);
  insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,old_value,new_value)
  values(p_actor_user_id,'return.status_changed','return_request',v_return.id::text,jsonb_build_object('status',v_return.status),jsonb_build_object('status',p_status));
  return query select v_return.id,v_return.status,p_status,v_refund_id;
end;
$$;

create or replace function public.finalize_return_refund(
  p_refund_transaction_id uuid,
  p_succeeded boolean,
  p_provider_reference text default null,
  p_error_message text default '',
  p_actor_user_id uuid default null
)
returns table(refund_transaction_id uuid, return_request_id uuid, refund_status text, resulting_balance numeric, idempotency_hit boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_refund public.refund_transactions%rowtype;
  v_return public.return_requests%rowtype;
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_credit_id uuid;
  v_debit_id uuid;
  v_balance numeric(14,2);
  v_has_order_ledger boolean;
  v_has_payment boolean;
  v_cumulative_refund numeric(14,2);
begin
  if p_actor_user_id is null or not public.is_admin(p_actor_user_id) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501'; end if;
  select * into v_refund from public.refund_transactions where id=p_refund_transaction_id for update;
  if not found then raise exception 'Geri ödeme kaydı bulunamadı.' using errcode='P0002'; end if;
  select * into v_return from public.return_requests where id=v_refund.return_request_id for update;
  select * into v_order from public.orders where id=v_return.order_id for update;
  select * into v_attempt from public.payment_attempts where id=v_refund.payment_attempt_id for update;

  if v_refund.status='succeeded' then
    select round(coalesce(sum(debit-credit),0),2) into v_balance from public.account_transactions where customer_id=v_order.user_id;
    return query select v_refund.id,v_return.id,'succeeded'::text,v_balance,true; return;
  end if;
  if v_return.status <> 'refund_pending' then raise exception 'İade geri ödeme beklemiyor.' using errcode='22023'; end if;

  if not p_succeeded then
    update public.refund_transactions set status='failed',error_message=left(coalesce(p_error_message,'Geri ödeme başarısız.'),200),processed_at=now() where id=v_refund.id;
    insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,new_value)
    values(p_actor_user_id,'refund.failed','refund_transaction',v_refund.id::text,jsonb_build_object('return_request_id',v_return.id));
    select round(coalesce(sum(debit-credit),0),2) into v_balance from public.account_transactions where customer_id=v_order.user_id;
    return query select v_refund.id,v_return.id,'failed'::text,v_balance,false; return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_order.user_id::text,0));
  select exists(select 1 from public.account_transactions t where t.order_id=v_order.id and t.type='ORDER' and not t.is_reversal) into v_has_order_ledger;
  select exists(select 1 from public.payments p where p.order_id=v_order.id and p.status='completed') into v_has_payment;

  if v_has_order_ledger then
    select append_account_transaction.transaction_id,append_account_transaction.resulting_balance into v_credit_id,v_balance from public.append_account_transaction(
      p_customer_id=>v_order.user_id,p_type=>'REFUND',p_debit=>0,p_credit=>v_refund.amount,p_order_id=>v_order.id,
      p_description=>'Ürün iadesi - sipariş borcu ters kaydı',p_reference=>v_return.return_number,p_actor_user_id=>p_actor_user_id,
      p_is_reversal=>false,p_reversed_transaction_id=>null,p_idempotency_key=>format('return-order-credit:%s',v_return.id)
    );
  end if;
  if v_has_payment then
    select append_account_transaction.transaction_id,append_account_transaction.resulting_balance into v_debit_id,v_balance from public.append_account_transaction(
      p_customer_id=>v_order.user_id,p_type=>'REFUND',p_debit=>v_refund.amount,p_credit=>0,p_order_id=>v_order.id,
      p_description=>'Ürün iadesi - müşteriye geri ödeme',p_reference=>v_return.return_number,p_actor_user_id=>p_actor_user_id,
      p_is_reversal=>false,p_reversed_transaction_id=>null,p_idempotency_key=>format('return-payout-debit:%s',v_return.id)
    );
  end if;
  if not v_has_order_ledger then
    select round(coalesce(sum(debit-credit),0),2) into v_balance from public.account_transactions where customer_id=v_order.user_id;
  end if;

  update public.refund_transactions set status='succeeded',provider_reference=nullif(btrim(coalesce(p_provider_reference,'')),''),error_message='',
    order_credit_transaction_id=v_credit_id,payout_debit_transaction_id=v_debit_id,processed_at=now() where id=v_refund.id;
  update public.return_requests set status='refunded',refunded_at=coalesce(refunded_at,now()) where id=v_return.id;
  insert into public.return_status_history(return_request_id,from_status,to_status,note,actor_user_id)
  values(v_return.id,'refund_pending','refunded','Geri ödeme tamamlandı.',p_actor_user_id);

  if v_attempt.id is not null then
    select coalesce(sum(rt.amount),0) into v_cumulative_refund from public.refund_transactions rt
    where rt.payment_attempt_id=v_attempt.id and rt.status='succeeded';
    update public.payment_attempts set
      status=case when v_cumulative_refund >= amount then 'refunded'::public.payment_status else status end,
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('refunded_amount',v_cumulative_refund,'last_return_id',v_return.id)
    where id=v_attempt.id;
  end if;

  insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,new_value,metadata)
  values(p_actor_user_id,'refund.succeeded','refund_transaction',v_refund.id::text,
    jsonb_build_object('amount',v_refund.amount,'return_request_id',v_return.id),jsonb_build_object('provider',v_refund.provider));
  return query select v_refund.id,v_return.id,'succeeded'::text,v_balance,false;
end;
$$;

revoke all on function public.transition_return_request(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.finalize_return_refund(uuid,boolean,text,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_return_request(uuid,text,text,uuid) to service_role;
grant execute on function public.finalize_return_refund(uuid,boolean,text,text,uuid) to service_role;
