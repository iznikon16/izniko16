alter table public.products
  add column if not exists tax_rate numeric(5,2);

alter table public.products
  drop constraint if exists products_tax_rate_check,
  add constraint products_tax_rate_check check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100));

grant select (tax_rate) on public.products to anon, authenticated;

alter table public.order_items
  add column if not exists tax_rate numeric(5,2),
  add column if not exists tax_amount numeric(14,2);

alter table public.order_items
  drop constraint if exists order_items_tax_rate_check,
  add constraint order_items_tax_rate_check check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100)),
  drop constraint if exists order_items_tax_amount_check,
  add constraint order_items_tax_amount_check check (tax_amount is null or tax_amount >= 0);

create or replace function public.snapshot_order_item_tax()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.product_id is not null and new.tax_rate is null then
    select p.tax_rate into new.tax_rate from public.products p where p.id=new.product_id;
  end if;
  if new.product_id is not null and new.tax_rate is null then
    raise exception 'Ürün KDV oranı tanımlanmamış.' using errcode='P0001';
  end if;
  if new.tax_rate is not null then
    new.tax_amount:=round(new.line_total-(new.line_total/(1+(new.tax_rate/100))),2);
  end if;
  return new;
end;
$$;

drop trigger if exists snapshot_order_item_tax on public.order_items;
create trigger snapshot_order_item_tax
before insert or update of product_id,line_total,tax_rate on public.order_items
for each row execute function public.snapshot_order_item_tax();

create or replace function public.ensure_order_sales_document(p_order_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_order public.orders%rowtype; v_item public.order_items%rowtype; v_document_id uuid; v_document_number text; v_sku text;
  v_item_discount numeric(14,2); v_item_total numeric(14,2); v_item_tax numeric(14,2); v_tax_total numeric(14,2); v_document_tax_rate numeric(5,2);
begin
  select i.id into v_document_id from public.invoices i where i.order_id=p_order_id and i.document_type='sales_document';
  if found then return v_document_id; end if;
  select o.* into v_order from public.orders o where o.id=p_order_id for update;
  if not found or v_order.status not in ('confirmed','preparing','shipped','completed') or v_order.total<=0 then return null; end if;
  if not exists(select 1 from public.order_items oi where oi.order_id=v_order.id) then return null; end if;
  if exists(select 1 from public.order_items oi where oi.order_id=v_order.id and oi.tax_rate is null) then
    raise exception 'Satış belgesi için sipariş kalemi KDV oranları eksik.' using errcode='P0001';
  end if;

  select case when count(distinct oi.tax_rate)=1 then max(oi.tax_rate) else 0 end,
         coalesce(sum(round(
           (oi.line_total-case when v_order.subtotal>0 then v_order.discount_total*(oi.line_total/v_order.subtotal) else 0 end)
           -((oi.line_total-case when v_order.subtotal>0 then v_order.discount_total*(oi.line_total/v_order.subtotal) else 0 end)/(1+(oi.tax_rate/100))),2)),0)
  into v_document_tax_rate,v_tax_total
  from public.order_items oi where oi.order_id=v_order.id;

  v_document_id:=gen_random_uuid();
  v_document_number:=public.next_invoice_number('sales_document',current_date);
  insert into public.invoices(
    id,invoice_number,document_type,status,order_id,user_id,currency,tax_included,tax_rate,subtotal,discount_total,
    shipping_total,tax_total,total,customer_name,customer_email,customer_phone,customer_tax_number,customer_tax_office,billing_address,company_snapshot,note,provider_status
  ) values(
    v_document_id,v_document_number,'sales_document','issued',v_order.id,v_order.user_id,v_order.currency,true,v_document_tax_rate,
    v_order.subtotal,v_order.discount_total,v_order.shipping_total,v_tax_total,v_order.total,
    coalesce(nullif(v_order.customer_name,''),v_order.customer_email),v_order.customer_email,v_order.customer_phone,
    coalesce(v_order.billing_address->>'tax_number',''),coalesce(v_order.billing_address->>'tax_office',''),v_order.billing_address,
    case when v_order.billing_address->>'customer_type'='corporate' then jsonb_build_object('company_title',coalesce(v_order.billing_address->>'company_title','')) else '{}'::jsonb end,
    'Sistem tarafından sipariş onayında oluşturulan satış belgesi.','disabled'
  );
  for v_item in select oi.* from public.order_items oi where oi.order_id=v_order.id order by oi.created_at loop
    select coalesce(p.sku,'') into v_sku from public.products p where p.id=v_item.product_id;
    v_item_discount:=case when v_order.subtotal>0 then round(v_order.discount_total*(v_item.line_total/v_order.subtotal),2) else 0 end;
    v_item_total:=v_item.line_total-v_item_discount;
    v_item_tax:=round(v_item_total-(v_item_total/(1+(v_item.tax_rate/100))),2);
    insert into public.invoice_items(invoice_id,order_item_id,product_id,product_title,product_sku,quantity,unit_price,gross_amount,discount_amount,tax_rate,tax_amount,line_total)
    values(v_document_id,v_item.id,v_item.product_id,v_item.product_title,coalesce(v_sku,''),v_item.quantity,v_item.unit_price,v_item.line_total,v_item_discount,v_item.tax_rate,v_item_tax,v_item_total);
  end loop;
  insert into public.audit_logs(action,resource_type,resource_id,new_value)
  values('order_document_created','invoice',v_document_id::text,jsonb_build_object('document_number',v_document_number,'document_type','sales_document','order_id',v_order.id));
  return v_document_id;
exception when unique_violation then
  select i.id into v_document_id from public.invoices i where i.order_id=p_order_id and i.document_type='sales_document';
  return v_document_id;
end;
$$;

comment on column public.products.tax_rate is 'Actual product VAT rate. Null blocks checkout until configured.';
comment on column public.order_items.tax_rate is 'VAT rate snapshot captured when the order item is created.';
comment on column public.order_items.tax_amount is 'VAT amount included in the order item line total.';
