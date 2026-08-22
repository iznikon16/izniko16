-- Faz 25: Immutable fatura snapshot'ları, atomik numara, iptal/iade belgeleri ve e-Fatura hazırlığı.

create table public.invoice_number_counters (
  document_year integer not null,
  document_type text not null check (document_type in ('invoice','cancellation','refund')),
  last_number bigint not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (document_year, document_type)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  document_type text not null default 'invoice' check (document_type in ('invoice','cancellation','refund')),
  status text not null default 'issued' check (status in ('issued','cancelled')),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  parent_invoice_id uuid references public.invoices(id) on delete restrict,
  return_request_id uuid references public.return_requests(id) on delete restrict,
  currency text not null default 'TRY',
  tax_included boolean not null default true,
  tax_rate numeric(5,2) not null default 20 check (tax_rate >= 0 and tax_rate <= 100),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(14,2) not null default 0 check (shipping_total >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  total numeric(14,2) not null check (total > 0),
  customer_name text not null,
  customer_email text not null default '',
  customer_phone text not null default '',
  customer_tax_number text not null default '',
  customer_tax_office text not null default '',
  billing_address jsonb not null default '{}'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  note text not null default '',
  issued_at timestamptz not null default now(),
  due_date date,
  cancelled_at timestamptz,
  provider_status text not null default 'disabled' check (provider_status in ('disabled','pending','sent','failed','cancelled')),
  provider_reference text,
  provider_error text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((document_type='invoice' and parent_invoice_id is null and return_request_id is null)
    or (document_type='cancellation' and parent_invoice_id is not null and return_request_id is null)
    or (document_type='refund' and parent_invoice_id is not null and return_request_id is not null))
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_title text not null,
  product_sku text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(5,2) not null default 20 check (tax_rate >= 0 and tax_rate <= 100),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.invoice_provider_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  provider text not null default 'disabled',
  action text not null check (action in ('send','cancel')),
  status text not null check (status in ('disabled','pending','sent','failed','cancelled')),
  provider_reference text,
  safe_message text not null default '',
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index idx_invoices_one_original_per_order on public.invoices(order_id) where document_type='invoice';
create unique index idx_invoices_one_cancellation_per_parent on public.invoices(parent_invoice_id) where document_type='cancellation';
create unique index idx_invoices_one_refund_per_return on public.invoices(return_request_id) where document_type='refund';
create index idx_invoices_user_issued on public.invoices(user_id, issued_at desc);
create index idx_invoices_order on public.invoices(order_id, created_at desc);
create index idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index idx_invoice_provider_attempts_invoice on public.invoice_provider_attempts(invoice_id, created_at desc);

create trigger update_invoices_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

create or replace function public.protect_invoice_snapshot()
returns trigger language plpgsql set search_path=public as $$
begin
  if (to_jsonb(new) - array['status','cancelled_at','provider_status','provider_reference','provider_error','updated_at'])
    is distinct from
    (to_jsonb(old) - array['status','cancelled_at','provider_status','provider_reference','provider_error','updated_at']) then
    raise exception 'Fatura snapshot alanları değiştirilemez; düzeltme belgesi oluşturun.' using errcode='55000';
  end if;
  return new;
end;
$$;

create trigger protect_invoice_snapshot before update on public.invoices
for each row execute function public.protect_invoice_snapshot();

create or replace function public.protect_invoice_item_snapshot()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Fatura kalemleri değiştirilemez veya silinemez.' using errcode='55000';
end;
$$;

create trigger protect_invoice_item_snapshot before update or delete on public.invoice_items
for each row execute function public.protect_invoice_item_snapshot();

alter table public.invoice_number_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_provider_attempts enable row level security;

create or replace function public.can_view_invoice(p_invoice_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql security definer set search_path=public stable as $$
  select exists(select 1 from public.invoices i where i.id=p_invoice_id and i.user_id=p_user_id);
$$;

revoke all on function public.can_view_invoice(uuid,uuid) from public,anon;
grant execute on function public.can_view_invoice(uuid,uuid) to authenticated,service_role;
grant select on public.invoices,public.invoice_items,public.invoice_provider_attempts to authenticated;
grant all on public.invoice_number_counters,public.invoices,public.invoice_items,public.invoice_provider_attempts to service_role;

create policy "Admins manage invoices" on public.invoices for all
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Customers view own invoices" on public.invoices for select using (user_id=auth.uid());
create policy "Admins manage invoice items" on public.invoice_items for all
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Customers view own invoice items" on public.invoice_items for select using (public.can_view_invoice(invoice_id));
create policy "Admins manage invoice provider attempts" on public.invoice_provider_attempts for all
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Customers view own invoice provider attempts" on public.invoice_provider_attempts for select using (public.can_view_invoice(invoice_id));

insert into public.permissions(key,description) values
  ('invoice.view','Faturaları görüntüleme'),
  ('invoice.manage','Fatura, iptal ve iade belgesi yönetimi')
on conflict(key) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.name in ('admin','staff') and p.key in ('invoice.view','invoice.manage')
on conflict do nothing;

create or replace function public.next_invoice_number(p_document_type text,p_issued_at date default current_date)
returns text language plpgsql security definer set search_path=public as $$
declare
  v_year integer := extract(year from coalesce(p_issued_at,current_date))::integer;
  v_number bigint;
  v_prefix text;
begin
  if p_document_type not in ('invoice','cancellation','refund') then
    raise exception 'Geçersiz fatura belge türü.' using errcode='22023';
  end if;
  v_prefix := case p_document_type when 'invoice' then 'FAT' when 'cancellation' then 'IPT' else 'IAD' end;
  insert into public.invoice_number_counters(document_year,document_type,last_number)
  values(v_year,p_document_type,1)
  on conflict(document_year,document_type) do update
  set last_number=invoice_number_counters.last_number+1,updated_at=now()
  returning last_number into v_number;
  return format('%s-%s-%s',v_prefix,v_year,lpad(v_number::text,7,'0'));
end;
$$;

create or replace function public.create_order_invoice(
  p_order_id uuid,
  p_tax_rate numeric default 20,
  p_customer_tax_number text default '',
  p_customer_tax_office text default '',
  p_billing_address jsonb default null,
  p_company_snapshot jsonb default '{}'::jsonb,
  p_due_date date default null,
  p_note text default '',
  p_actor_user_id uuid default null
)
returns table(created_invoice_id uuid,created_invoice_number text,created_total numeric)
language plpgsql security definer set search_path=public as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_tax_rate numeric(5,2) := round(coalesce(p_tax_rate,20),2);
  v_tax_total numeric(14,2);
  v_discount numeric(14,2);
  v_line_total numeric(14,2);
  v_line_tax numeric(14,2);
  v_sku text;
begin
  if p_actor_user_id is null or not public.is_admin(p_actor_user_id) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501'; end if;
  if v_tax_rate < 0 or v_tax_rate > 100 then raise exception 'KDV oranı geçersiz.' using errcode='22023'; end if;
  select o.* into v_order from public.orders o where o.id=p_order_id for update;
  if not found then raise exception 'Sipariş bulunamadı.' using errcode='P0002'; end if;
  if v_order.status not in ('confirmed','preparing','shipped','completed') or v_order.total <= 0 then
    raise exception 'Sipariş fatura oluşturmaya uygun değil.' using errcode='22023';
  end if;
  if exists(select 1 from public.invoices i where i.order_id=v_order.id and i.document_type='invoice') then
    raise exception 'Bu sipariş için fatura zaten oluşturulmuş.' using errcode='23505';
  end if;
  if not exists(select 1 from public.order_items oi where oi.order_id=v_order.id) then
    raise exception 'Sipariş kalemi bulunamadı.' using errcode='P0002';
  end if;

  v_invoice_number := public.next_invoice_number('invoice',current_date);
  v_tax_total := case when v_tax_rate=0 then 0 else round(v_order.total-(v_order.total/(1+(v_tax_rate/100))),2) end;
  insert into public.invoices(
    id,invoice_number,document_type,status,order_id,user_id,currency,tax_included,tax_rate,
    subtotal,discount_total,shipping_total,tax_total,total,customer_name,customer_email,customer_phone,
    customer_tax_number,customer_tax_office,billing_address,company_snapshot,note,due_date,created_by
  ) values(
    v_invoice_id,v_invoice_number,'invoice','issued',v_order.id,v_order.user_id,v_order.currency,true,v_tax_rate,
    v_order.subtotal,v_order.discount_total,v_order.shipping_total,v_tax_total,v_order.total,
    coalesce(nullif(v_order.customer_name,''),v_order.customer_email),v_order.customer_email,v_order.customer_phone,
    btrim(coalesce(p_customer_tax_number,'')),btrim(coalesce(p_customer_tax_office,'')),
    coalesce(p_billing_address,v_order.billing_address,'{}'::jsonb),coalesce(p_company_snapshot,'{}'::jsonb),btrim(coalesce(p_note,'')),p_due_date,p_actor_user_id
  );

  for v_item in select oi.* from public.order_items oi where oi.order_id=v_order.id order by oi.created_at loop
    v_discount := case when v_order.subtotal>0 then round(v_order.discount_total*v_item.line_total/v_order.subtotal,2) else 0 end;
    v_line_total := greatest(0,v_item.line_total-v_discount);
    v_line_tax := case when v_tax_rate=0 then 0 else round(v_line_total-(v_line_total/(1+(v_tax_rate/100))),2) end;
    select coalesce(p.sku,'') into v_sku from public.products p where p.id=v_item.product_id;
    insert into public.invoice_items(invoice_id,order_item_id,product_id,product_title,product_sku,quantity,unit_price,gross_amount,discount_amount,tax_rate,tax_amount,line_total)
    values(v_invoice_id,v_item.id,v_item.product_id,v_item.product_title,coalesce(v_sku,''),v_item.quantity,v_item.unit_price,v_item.line_total,v_discount,v_tax_rate,v_line_tax,v_line_total);
  end loop;

  insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,new_value)
  values(p_actor_user_id,'invoice.issued','invoice',v_invoice_id::text,jsonb_build_object('invoice_number',v_invoice_number,'order_id',v_order.id,'total',v_order.total));
  return query select v_invoice_id,v_invoice_number,v_order.total;
end;
$$;

create or replace function public.create_invoice_adjustment(
  p_invoice_id uuid,
  p_document_type text,
  p_return_request_id uuid default null,
  p_note text default '',
  p_actor_user_id uuid default null
)
returns table(created_invoice_id uuid,created_invoice_number text,created_total numeric)
language plpgsql security definer set search_path=public as $$
declare
  v_parent public.invoices%rowtype;
  v_return public.return_requests%rowtype;
  v_parent_item public.invoice_items%rowtype;
  v_return_item public.return_items%rowtype;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_total numeric(14,2);
  v_tax_total numeric(14,2);
  v_quantity integer;
  v_line_total numeric(14,2);
  v_line_tax numeric(14,2);
begin
  if p_actor_user_id is null or not public.is_admin(p_actor_user_id) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501'; end if;
  if p_document_type not in ('cancellation','refund') then raise exception 'Düzeltme belge türü geçersiz.' using errcode='22023'; end if;
  select i.* into v_parent from public.invoices i where i.id=p_invoice_id and i.document_type='invoice' for update;
  if not found then raise exception 'Asıl fatura bulunamadı.' using errcode='P0002'; end if;

  if p_document_type='cancellation' then
    if v_parent.status='cancelled' or exists(select 1 from public.invoices i where i.parent_invoice_id=v_parent.id and i.document_type='cancellation') then
      raise exception 'Fatura daha önce iptal edilmiş.' using errcode='23505';
    end if;
    v_total := v_parent.total;
  else
    select rr.* into v_return from public.return_requests rr
    where rr.id=p_return_request_id and rr.order_id=v_parent.order_id and rr.user_id=v_parent.user_id and rr.status in ('refunded','completed') for update;
    if not found then raise exception 'Geri ödemesi tamamlanmış iade talebi bulunamadı.' using errcode='P0002'; end if;
    if exists(select 1 from public.invoices i where i.return_request_id=v_return.id) then raise exception 'Bu iade için belge zaten oluşturulmuş.' using errcode='23505'; end if;
    v_total := v_return.total_refund_amount;
  end if;

  v_invoice_number := public.next_invoice_number(p_document_type,current_date);
  v_tax_total := case when v_parent.tax_rate=0 then 0 else round(v_total-(v_total/(1+(v_parent.tax_rate/100))),2) end;
  insert into public.invoices(
    id,invoice_number,document_type,status,order_id,user_id,parent_invoice_id,return_request_id,currency,tax_included,tax_rate,
    subtotal,discount_total,shipping_total,tax_total,total,customer_name,customer_email,customer_phone,customer_tax_number,
    customer_tax_office,billing_address,company_snapshot,note,provider_status,created_by
  ) values(
    v_invoice_id,v_invoice_number,p_document_type,'issued',v_parent.order_id,v_parent.user_id,v_parent.id,
    case when p_document_type='refund' then v_return.id else null end,v_parent.currency,true,v_parent.tax_rate,
    v_total,0,0,v_tax_total,v_total,v_parent.customer_name,v_parent.customer_email,v_parent.customer_phone,
    v_parent.customer_tax_number,v_parent.customer_tax_office,v_parent.billing_address,v_parent.company_snapshot,btrim(coalesce(p_note,'')),'disabled',p_actor_user_id
  );

  if p_document_type='cancellation' then
    insert into public.invoice_items(invoice_id,order_item_id,product_id,product_title,product_sku,quantity,unit_price,gross_amount,discount_amount,tax_rate,tax_amount,line_total)
    select v_invoice_id,ii.order_item_id,ii.product_id,ii.product_title,ii.product_sku,ii.quantity,ii.unit_price,ii.gross_amount,ii.discount_amount,ii.tax_rate,ii.tax_amount,ii.line_total
    from public.invoice_items ii where ii.invoice_id=v_parent.id;
    update public.invoices set status='cancelled',cancelled_at=now() where id=v_parent.id;
  else
    for v_return_item in select ri.* from public.return_items ri where ri.return_request_id=v_return.id loop
      select ii.* into v_parent_item from public.invoice_items ii where ii.invoice_id=v_parent.id and ii.order_item_id=v_return_item.order_item_id;
      if not found then raise exception 'İade kalemi asıl faturada bulunamadı.' using errcode='P0002'; end if;
      v_quantity := v_return_item.quantity;
      v_line_total := v_return_item.refund_amount;
      v_line_tax := case when v_parent.tax_rate=0 then 0 else round(v_line_total-(v_line_total/(1+(v_parent.tax_rate/100))),2) end;
      insert into public.invoice_items(invoice_id,order_item_id,product_id,product_title,product_sku,quantity,unit_price,gross_amount,discount_amount,tax_rate,tax_amount,line_total)
      values(v_invoice_id,v_parent_item.order_item_id,v_parent_item.product_id,v_parent_item.product_title,v_parent_item.product_sku,v_quantity,v_parent_item.unit_price,v_line_total,0,v_parent.tax_rate,v_line_tax,v_line_total);
    end loop;
  end if;

  insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,new_value)
  values(p_actor_user_id,'invoice.'||p_document_type,'invoice',v_invoice_id::text,jsonb_build_object('parent_invoice_id',v_parent.id,'return_request_id',p_return_request_id,'total',v_total));
  return query select v_invoice_id,v_invoice_number,v_total;
end;
$$;

revoke all on function public.next_invoice_number(text,date) from public,anon,authenticated;
revoke all on function public.create_order_invoice(uuid,numeric,text,text,jsonb,jsonb,date,text,uuid) from public,anon,authenticated;
revoke all on function public.create_invoice_adjustment(uuid,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.next_invoice_number(text,date) to service_role;
grant execute on function public.create_order_invoice(uuid,numeric,text,text,jsonb,jsonb,date,text,uuid) to service_role;
grant execute on function public.create_invoice_adjustment(uuid,text,uuid,text,uuid) to service_role;
