-- Automatic internal sales documents. These records are not official e-Invoices.

alter table public.invoice_number_counters drop constraint if exists invoice_number_counters_document_type_check;
alter table public.invoice_number_counters add constraint invoice_number_counters_document_type_check
  check (document_type in ('invoice','cancellation','refund','sales_document'));

alter table public.invoices drop constraint if exists invoices_document_type_check;
alter table public.invoices drop constraint if exists invoices_check;
alter table public.invoices add constraint invoices_document_type_check
  check (document_type in ('invoice','cancellation','refund','sales_document'));
alter table public.invoices add constraint invoices_relation_check check (
  (document_type in ('invoice','sales_document') and parent_invoice_id is null and return_request_id is null)
  or (document_type='cancellation' and parent_invoice_id is not null and return_request_id is null)
  or (document_type='refund' and parent_invoice_id is not null and return_request_id is not null)
);

create unique index if not exists idx_invoices_one_sales_document_per_order
  on public.invoices(order_id) where document_type='sales_document';

create or replace function public.protect_invoice_adjustment_relations()
returns trigger language plpgsql set search_path=public as $$
declare v_parent public.invoices%rowtype; v_refunded_total numeric(14,2);
begin
  if new.document_type in ('invoice','sales_document') then return new; end if;
  select i.* into v_parent from public.invoices i
  where i.id=new.parent_invoice_id and i.document_type='invoice' for update;
  if not found then raise exception 'Düzeltme belgesi için geçerli asıl fatura bulunamadı.' using errcode='P0002'; end if;
  if new.order_id<>v_parent.order_id or new.user_id<>v_parent.user_id then
    raise exception 'Düzeltme belgesi asıl faturanın sipariş ve müşteri bilgileriyle eşleşmelidir.' using errcode='23514';
  end if;
  if new.document_type='cancellation' then
    if exists(select 1 from public.invoices child where child.parent_invoice_id=v_parent.id and child.document_type in ('cancellation','refund')) then
      raise exception 'Daha önce düzeltme belgesi oluşturulan fatura tamamen iptal edilemez.' using errcode='23505';
    end if;
  elsif new.document_type='refund' then
    if v_parent.status='cancelled' or exists(select 1 from public.invoices child where child.parent_invoice_id=v_parent.id and child.document_type='cancellation') then
      raise exception 'İptal edilmiş fatura için iade belgesi oluşturulamaz.' using errcode='23505';
    end if;
    select coalesce(sum(child.total),0) into v_refunded_total from public.invoices child where child.parent_invoice_id=v_parent.id and child.document_type='refund';
    if v_refunded_total+new.total>v_parent.total then raise exception 'Toplam iade tutarı asıl fatura toplamını aşamaz.' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.next_invoice_number(p_document_type text,p_issued_at date default current_date)
returns text language plpgsql security definer set search_path=public as $$
declare v_year integer:=extract(year from coalesce(p_issued_at,current_date))::integer; v_number bigint; v_prefix text;
begin
  if p_document_type not in ('invoice','cancellation','refund','sales_document') then raise exception 'Geçersiz belge türü.' using errcode='22023'; end if;
  v_prefix:=case p_document_type when 'invoice' then 'FAT' when 'cancellation' then 'IPT' when 'refund' then 'IAD' else 'SBL' end;
  insert into public.invoice_number_counters(document_year,document_type,last_number) values(v_year,p_document_type,1)
  on conflict(document_year,document_type) do update set last_number=invoice_number_counters.last_number+1,updated_at=now()
  returning last_number into v_number;
  return format('%s-%s-%s',v_prefix,v_year,lpad(v_number::text,7,'0'));
end;
$$;

create or replace function public.ensure_order_sales_document(p_order_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_item public.order_items%rowtype; v_document_id uuid; v_document_number text; v_sku text;
begin
  select i.id into v_document_id from public.invoices i where i.order_id=p_order_id and i.document_type='sales_document';
  if found then return v_document_id; end if;
  select o.* into v_order from public.orders o where o.id=p_order_id for update;
  if not found or v_order.status not in ('confirmed','preparing','shipped','completed') or v_order.total<=0 then return null; end if;
  if not exists(select 1 from public.order_items oi where oi.order_id=v_order.id) then return null; end if;

  v_document_id:=gen_random_uuid();
  v_document_number:=public.next_invoice_number('sales_document',current_date);
  insert into public.invoices(
    id,invoice_number,document_type,status,order_id,user_id,currency,tax_included,tax_rate,subtotal,discount_total,
    shipping_total,tax_total,total,customer_name,customer_email,customer_phone,billing_address,company_snapshot,note,provider_status
  ) values(
    v_document_id,v_document_number,'sales_document','issued',v_order.id,v_order.user_id,v_order.currency,true,0,
    v_order.subtotal,v_order.discount_total,v_order.shipping_total,0,v_order.total,
    coalesce(nullif(v_order.customer_name,''),v_order.customer_email),v_order.customer_email,v_order.customer_phone,
    v_order.billing_address,'{}'::jsonb,'Sistem tarafından sipariş onayında oluşturulan satış belgesi.','disabled'
  );
  for v_item in select oi.* from public.order_items oi where oi.order_id=v_order.id order by oi.created_at loop
    select coalesce(p.sku,'') into v_sku from public.products p where p.id=v_item.product_id;
    insert into public.invoice_items(invoice_id,order_item_id,product_id,product_title,product_sku,quantity,unit_price,gross_amount,discount_amount,tax_rate,tax_amount,line_total)
    values(v_document_id,v_item.id,v_item.product_id,v_item.product_title,coalesce(v_sku,''),v_item.quantity,v_item.unit_price,v_item.line_total,0,0,0,v_item.line_total);
  end loop;
  insert into public.audit_logs(action,resource_type,resource_id,new_value)
  values('order_document_created','invoice',v_document_id::text,jsonb_build_object('document_number',v_document_number,'document_type','sales_document','order_id',v_order.id));
  return v_document_id;
exception when unique_violation then
  select i.id into v_document_id from public.invoices i where i.order_id=p_order_id and i.document_type='sales_document';
  return v_document_id;
end;
$$;

create or replace function public.create_sales_document_on_order_qualification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status in ('confirmed','preparing','shipped','completed')
     and old.status not in ('confirmed','preparing','shipped','completed') then
    perform public.ensure_order_sales_document(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists create_sales_document_on_order_qualification on public.orders;
create trigger create_sales_document_on_order_qualification
after update of status on public.orders for each row
execute function public.create_sales_document_on_order_qualification();

revoke all on function public.ensure_order_sales_document(uuid) from public,anon,authenticated;
revoke all on function public.create_sales_document_on_order_qualification() from public,anon,authenticated;
grant execute on function public.ensure_order_sales_document(uuid) to service_role;
