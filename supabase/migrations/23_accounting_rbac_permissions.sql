-- Faz 13: mevcut RBAC tablolarına cari izinlerini idempotent olarak ekler.

insert into public.roles(name, label, is_system)
values
  ('admin', 'Tam yetkili yönetici', true),
  ('staff', 'Yetkileri ayrı ayrı atanabilen personel', true),
  ('customer', 'Yalnızca kendi verisini gören müşteri', true)
on conflict (name) do update set label = excluded.label, is_system = true;

insert into public.permissions(key, description)
values
  ('account.view', 'Cari hesapları görüntüleme'),
  ('account.createTransaction', 'Manuel cari hareket oluşturma'),
  ('account.collectPayment', 'Tahsilat kaydetme'),
  ('account.editDueDate', 'Vade ve ödeme koşulu değiştirme'),
  ('account.reverseTransaction', 'Finansal hareket veya tahsilat ters kaydı'),
  ('account.viewStatement', 'Cari ekstre görüntüleme'),
  ('account.exportStatement', 'Cari ekstre dışa aktarma'),
  ('account.manageRiskLimit', 'Risk limiti ve politikasını yönetme'),
  ('account.sendPaymentReminder', 'Ödeme hatırlatması gönderme')
on conflict (key) do update set description = excluded.description;

insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.name = 'admin'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key in (
  'account.view',
  'account.createTransaction',
  'account.collectPayment',
  'account.editDueDate',
  'account.viewStatement',
  'account.exportStatement'
)
where role.name = 'staff'
on conflict do nothing;
