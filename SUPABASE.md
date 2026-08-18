# Supabase Kurulum Paketi

Bu proje **local-first** mimaride çalışır. Tüm business logic (ürün, müşteri, sipariş, stok, cari, tahsilat, fiyatlandırma, görsel/dosya işlemleri) **Next.js server katmanı** üzerinden çalışır. Supabase yalnızca **persistence / storage / auth provider** olarak kullanılır.

> ⚠️ **Önemli:** Supabase'i doğrudan frontend'den CRUD için KULLANMA. Tüm mutation işlemleri Server Action / Route Handler üzerinden geçer.

---

## 1. Ortam Değişkenleri

`.env.local` dosyasına ekleyin (yalnızca **publishable key** — service_role key asla istemciye gitmez):

```env
NEXT_PUBLIC_SUPABASE_URL=https://gulpzppljunptzlefxit.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Storage bucket adı (Supabase Storage'da oluşturulmalı)
SUPABASE_STORAGE_BUCKET=product-media
```

**Server tarafında** admin/servis işlemleri için ayrıca `SUPABASE_SERVICE_ROLE_KEY` gerekir
(manüel olarak dashboard > Settings > API keys > service_role):

```env
SUPABASE_SERVICE_ROLE_KEY=<dashboard-api-keys-sayfasından-kopyalayın>
```

> ⚠️ Service role key'i `.env.local` dışında bir yere yazmayın, Git'e commit'slemeyin.

---

## 2. Migration Sırası (Supabase SQL Editor)

Her dosyayı **sırasıyla** ve **tamamen** çalıştırın:

| Sıra | Dosya                     | İçerik                                                                                                    |
| ---- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | `01_enums.sql`            | Enum tipleri (order_status, payment_provider, vb.)                                                        |
| 2    | `02_tables.sql`           | Tüm tablolar + FK'lar                                                                                     |
| 3    | `03_functions.sql`        | `generate_order_number`, `is_admin`                                                                       |
| 4    | `04_indexes.sql`          | Performans indexleri                                                                                      |
| 5    | `05_rls.sql`              | RLS enable + public/customer politikaları                                                                 |
| 6    | `06_admin_rls.sql`        | Admin (is_admin) politikaları                                                                             |
| 7    | `07_storage_triggers.sql` | Storage bucket + auth trigger                                                                             |
| 8    | `08_seed.sql`             | İlk kurulum verisi (ödeme yöntemi, SMTP, video)                                                           |
| 9    | `09_cari.sql`             | **Ön Muhasebe/Cari** — cari hesap, ledger, tahsilat, stok hareketi, audit, bildirim, SMS, sistem ayarları |
| 10   | `10_stok.sql`             | **Stok** — products üzerinde stock_quantity + critical_stock, apply_stock_change fonksiyonu               |
| 11   | `11_xml_netgsm_odeal.sql` | **Entegrasyonlar** — XML kaynakları/mapping/sync, Netgsm ve Ödeal ayarları                                |
| 12   | `12_fiyat_rbac.sql`       | **Fiyatlandırma + RBAC** — fiyat listeleri, müşteri fiyatı/indirimi, roller/izinler                       |

> 💡 Alternatif: [Supabase CLI](https://supabase.com/docs/guides/cli) kullanıyorsanız dosyaları
> `supabase/migrations/` klasörüne koyup `supabase db push` komutuyla çalıştırın.

---

## 3. RLS (Row Level Security) Açıklaması

- **Service role key** tüm RLS kurallarını **bypass eder** → Next.js server katmanındaki admin/servis işlemleri RLS'den etkilenmez.
- **Publishable key** (istemci) yalnızca aşağıdakilere erişebilir:
  - **Public katalog** (yayınlanmış ürün, aktif kategori, marka, kampanya vb.) — salt okunur.
  - **Müşterinin kendi verileri** (`auth.uid() = user_id`) — kendi profili, adresleri, sepeti, siparişleri.
- Ekstre PDF/Excel, cari verileri gibi finansal alanlar RLS ile **default kapalı** tutulur ve yalnızca server katmanından (service role) erişilir.

---

## 4. Admin Hesabı Oluşturma

1. Supabase Dashboard → **Authentication → Users** → **Add user** ile bir kullanıcı oluşturun (ör. `admin@izniko.com`).
2. SQL Editor'da aşağıdaki sorguyu çalıştırarak bu kullanıcıyı admin yapın:

```sql
insert into public.admin_users (user_id, email, full_name, role, is_super_admin)
values (
  (select id from auth.users where email = 'admin@izniko.com'),
  'admin@izniko.com',
  'Yönetici',
  'admin',
  true
)
on conflict (user_id) do nothing;
```

3. Artık `/admin/login` sayfasından giriş yapabilirsiniz.

---

## 5. Auth E-posta Ayarları

Supabase Dashboard → **Authentication → Providers → Email** için:

- **Confirm email** açık/kapalı tercihine göre ayarlayın.
- SMTP kullanacaksanız **Authentication → SMTP Settings**'den canlı e-posta gönderimi yapılandırın (Gmail, SendGrid vb.).

---

## 6. Doğrulama Kontrolleri

Migration sonrası aşağıdaki sorgularla tutarlılığı doğrulayın:

```sql
-- Tablo sayısı (beklenen tablolar)
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;

-- Enum varlıkları
select typname from pg_type
where typnamespace = 'public'::regnamespace
  and typtype = 'e' order by typname;

-- RLS durumu (tüm tablolar açık olmalı)
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;

-- Admin fonksiyonu
select public.is_admin((select id from auth.users where email = 'admin@izniko.com'));
```

---

## 7. Next.js Tarafında Bağlantı

Proje, ilgili kodları zaten içerir:

- `lib/supabase/server.ts` — Server Component / Server Action client (cookie tabanlı)
- `lib/supabase/client.ts` — Browser client (yalnızca auth/session)
- `lib/supabase/admin.ts` — Service role client (server, RLS bypass)
- `lib/supabase/middleware.ts` — Oturum yenileme

Env değişkenleri eklenip migration'lar çalıştırıldıktan sonra `npm run dev` ile projeyi başlatın.
Artık `DEV_BYPASS_AUTH` kapatılırsa gerçek Supabase auth devreye girer.

---

## 8. Önemli Notlar

- **resim/dosya işlemleri** Next.js üzerinden (server action) Supabase Storage'a yüklenir — key vermedən, mevcut `actions.ts` zaten bu akışı kullanır.
- `session` / `service_role` key'leri asla client bundle'a girmez.
- Ekstra finansal modüller (cari, stok, XML, Netgsm, Ödeal) ayrı fazlarda eklenecektir ve kendi migration dosyalarını alacaktır.
