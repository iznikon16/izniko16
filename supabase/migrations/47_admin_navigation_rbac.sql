-- Faz 28: Sidebar ve server authorization için eksik temel izin kataloğu.
insert into public.permissions(key, description) values
  ('user.view', 'Kullanıcıları görüntüleme'),
  ('user.manage', 'Yönetici ve kullanıcı hesaplarını yönetme'),
  ('user.manageCredentials', 'Kullanıcı e-posta ve şifre bilgilerini yönetme'),
  ('customer.view', 'Müşterileri görüntüleme'),
  ('customer.create', 'Müşteri oluşturma'),
  ('customer.update', 'Müşteri bilgilerini güncelleme'),
  ('customer.managePricing', 'Müşteriye özel fiyatları yönetme'),
  ('product.view', 'Ürün kataloğunu görüntüleme'),
  ('product.create', 'Ürün oluşturma'),
  ('product.update', 'Ürün bilgilerini güncelleme'),
  ('product.managePrice', 'Ürün ve fiyat listesi fiyatlarını yönetme'),
  ('product.manageStock', 'Stok miktarı ve hareketlerini yönetme'),
  ('order.view', 'Siparişleri görüntüleme'),
  ('order.create', 'Sipariş oluşturma'),
  ('order.changeStatus', 'Sipariş durumunu değiştirme'),
  ('order.cancel', 'Sipariş iptal etme'),
  ('order.print', 'Sipariş belgesi oluşturma'),
  ('xml.view', 'XML kaynak ve aktarımlarını görüntüleme'),
  ('xml.create', 'XML kaynağı oluşturma'),
  ('xml.sync', 'XML senkronizasyonu çalıştırma'),
  ('report.view', 'Raporları görüntüleme'),
  ('report.export', 'Raporları dışa aktarma'),
  ('settings.view', 'Sistem ve entegrasyon ayarlarını görüntüleme'),
  ('settings.manageIntegrations', 'Entegrasyon ayarlarını yönetme'),
  ('marketing.manage', 'Kampanya ve pazarlama içeriklerini yönetme'),
  ('audit.view', 'Audit log kayıtlarını görüntüleme')
on conflict (key) do update set description = excluded.description;

-- Admin rolü izin kataloğunun tamamına sahiptir.
insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.name = 'admin'
on conflict do nothing;

-- Yetkili rolünün standart operasyon izinleri. Kritik yönetim/secret izinleri dahil değildir.
insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.key in (
  'user.view',
  'customer.view', 'customer.create', 'customer.update',
  'product.view', 'product.create', 'product.update', 'product.managePrice', 'product.manageStock',
  'order.view', 'order.create', 'order.changeStatus', 'order.cancel', 'order.print',
  'return.view', 'return.manage',
  'invoice.view', 'invoice.manage',
  'account.view', 'account.createTransaction', 'account.collectPayment', 'account.editDueDate',
  'account.viewStatement', 'account.exportStatement',
  'xml.view', 'xml.create', 'xml.sync',
  'report.view', 'report.export',
  'marketing.manage'
)
where role.name = 'staff'
on conflict do nothing;
