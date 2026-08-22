-- Faz 25 sertleştirme: aynı asıl fatura üzerinde çakışan iptal/iade belgelerini engeller.

create or replace function public.protect_invoice_adjustment_relations()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent public.invoices%rowtype;
  v_refunded_total numeric(14,2);
begin
  if new.document_type = 'invoice' then
    return new;
  end if;

  select i.* into v_parent
  from public.invoices i
  where i.id = new.parent_invoice_id and i.document_type = 'invoice'
  for update;

  if not found then
    raise exception 'Düzeltme belgesi için geçerli asıl fatura bulunamadı.' using errcode = 'P0002';
  end if;

  if new.order_id <> v_parent.order_id or new.user_id <> v_parent.user_id then
    raise exception 'Düzeltme belgesi asıl faturanın sipariş ve müşteri bilgileriyle eşleşmelidir.' using errcode = '23514';
  end if;

  if new.document_type = 'cancellation' then
    if exists (
      select 1 from public.invoices child
      where child.parent_invoice_id = v_parent.id
        and child.document_type in ('cancellation', 'refund')
    ) then
      raise exception 'Daha önce düzeltme belgesi oluşturulan fatura tamamen iptal edilemez.' using errcode = '23505';
    end if;
  elsif new.document_type = 'refund' then
    if v_parent.status = 'cancelled' or exists (
      select 1 from public.invoices child
      where child.parent_invoice_id = v_parent.id and child.document_type = 'cancellation'
    ) then
      raise exception 'İptal edilmiş fatura için iade belgesi oluşturulamaz.' using errcode = '23505';
    end if;

    select coalesce(sum(child.total), 0) into v_refunded_total
    from public.invoices child
    where child.parent_invoice_id = v_parent.id and child.document_type = 'refund';

    if v_refunded_total + new.total > v_parent.total then
      raise exception 'Toplam iade tutarı asıl fatura toplamını aşamaz.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger protect_invoice_adjustment_relations
before insert on public.invoices
for each row execute function public.protect_invoice_adjustment_relations();

create or replace function public.can_view_invoice(p_invoice_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_user_id = auth.uid()
    and exists (
      select 1 from public.invoices i
      where i.id = p_invoice_id and i.user_id = auth.uid()
    );
$$;
