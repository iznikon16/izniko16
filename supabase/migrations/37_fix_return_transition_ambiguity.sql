-- Faz 24: RPC çıktı kolonuyla return_items.return_request_id arasındaki ad çakışmasını gider.

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

revoke all on function public.transition_return_request(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_return_request(uuid,text,text,uuid) to service_role;
