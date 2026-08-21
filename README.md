# İZNİKON B2B Yönetim Platformu

Kurumsal satış, müşteri, sipariş, stok, cari, tahsilat ve entegrasyon süreçlerini tek merkezden yönetmek için geliştirilen kapsamlı B2B yönetim platformu.

![Status](https://img.shields.io/badge/status-development-blue)
![Platform](https://img.shields.io/badge/platform-B2B-informational)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## Hakkında

B2B Yönetim Platformu; işletmelerin operasyonel ve finansal süreçlerini tek panel üzerinden yönetebilmesini sağlayan merkezi bir yönetim çözümüdür.

Platform; müşteri yönetimi, ürün ve fiyatlandırma, sipariş operasyonları, stok takibi, cari hesap yönetimi, tahsilat süreçleri, raporlama ve harici servis entegrasyonlarını ortak bir yapı altında toplar.

---

## Öne Çıkan Modüller

* Supabase Auth bağlantılı müşteri ve yönetici hesapları
* Süper Admin, Admin, Yetkili ve Müşteri rol yönetimi
* Güvenli kullanıcı oluşturma, şifre değiştirme, pasife alma ve silme
* Ürün, kategori ve marka yönetimi
* Fiyat listeleri ve müşteriye özel fiyatlandırma
* Sipariş ve sepet yönetimi
* Sipariş durum takibi
* Stok ve stok hareketleri
* Kritik stok takibi
* Cari hesap ve borç/alacak yönetimi
* Tahsilat ve kısmi tahsilat
* Vade ve geciken ödeme takibi
* Müşteri risk limiti
* Cari ekstre
* PDF / Excel / CSV çıktıları
* XML ürün entegrasyonu
* Netgsm SMS entegrasyonu
* Ödeal ödeme entegrasyonu
* PayTR ve iyzico güvenli kredi kartı akışı
* SMTP ve e-posta bildirimleri
* Rol ve yetki yönetimi
* Audit Log
* Toast ve bildirim sistemi
* Yedekleme sistemi
* Yönetim Dashboard'u
* Raporlama ve operasyon takibi

---

## Ön Muhasebe ve Cari

Platform içerisinde müşteri bazlı finansal hareketlerin takip edilmesini sağlayan cari yönetim altyapısı bulunur.

Başlıca özellikler:

* Cari hesap
* Borç / alacak bakiyesi
* Siparişlerin otomatik cariye işlenmesi
* Tahsilat girişi
* Kısmi tahsilat
* Vade tarihi
* Geciken ödemeler
* Cari ekstre
* PDF / Excel ekstre
* Risk limiti
* Müşterinin kendi bakiyesini görüntüleyebilmesi

---

## Entegrasyonlar

| Entegrasyon  | Amaç                                                   |
| ------------ | ------------------------------------------------------ |
| **XML**      | Ürün, fiyat, stok, kategori ve görsel senkronizasyonu  |
| **Netgsm**   | Sipariş, vade ve ödeme SMS bildirimleri                |
| **PayTR**    | Güvenli iframe üzerinden kredi kartı tahsilatı         |
| **iyzico**   | Sağlayıcının güvenli sayfasında kredi kartı tahsilatı  |
| **Ödeal**    | Ödeme işlemleri ve tahsilat entegrasyonu               |
| **SMTP**     | Sistem ve müşteri e-posta bildirimleri                 |
| **Supabase** | PostgreSQL, Auth, Storage, RLS ve sunucu veri altyapısı |

Kart numarası ve CVV uygulama veritabanında saklanmaz. Checkout ekranında yalnızca aktif, desteklenen ve zorunlu API bilgileri tamamlanmış PayTR/iyzico yöntemleri gösterilir. Kart bilgileri seçilen sağlayıcının güvenli ekranında işlenir.

---

## Yönetim Paneli

Admin Dashboard üzerinden işletmenin operasyonel durumu merkezi olarak takip edilir.

Dashboard içerisinde öne çıkan göstergeler:

* Toplam ürün
* Aktif ürün
* Toplam müşteri
* Toplam sipariş
* Bekleyen sipariş
* Bugünkü siparişler
* Kritik stoklar
* Toplam cari alacak
* Bugünkü tahsilat
* Vadesi geçmiş tutar
* Geciken ödemeler
* Risk limitine yaklaşan müşteriler
* Sipariş trafiği
* Tahsilat hareketleri
* Entegrasyon sağlık durumu

---

## Kullanıcı Rolleri

Platform rol ve yetki bazlı erişim kontrolü kullanır.

### Süper Admin

Yönetici ve kullanıcı hesaplarını yönetebilir. Yetkili veya işlem geçmişi olmayan müşteri hesaplarını kalıcı olarak silebilir. Kendi hesabını, başka bir Süper Admin hesabını veya doğrudan Admin hesabını silemez.

### Admin

Sistemin yönetim ve operasyon alanlarına erişir. Kritik hesap silme işlemleri Süper Admin ile sınırlandırılmıştır.

### Yetkili

Tanımlanan görev ve izinlere göre operasyonel işlemleri gerçekleştirir.

### Müşteri

Yalnızca kendi hesabı, fiyatları, siparişleri, belgeleri ve cari bilgilerine erişebilir.

Finansal geçmişi bulunan müşteriler muhasebe bütünlüğü nedeniyle fiziksel olarak silinmez; gerektiğinde pasife alınır.

---

## Teknoloji Altyapısı

* Next.js 16.3.1 ve React 19
* TypeScript 5
* Supabase PostgreSQL, Auth, Storage ve Row Level Security
* Tailwind CSS 4
* Jest ve Playwright
* Supabase CLI ve pgTAP

---

## Yerel Kurulum

Gereksinimler:

* Node.js 20 veya üzeri
* npm
* Yerel Supabase kullanılacaksa Docker Desktop ve Supabase CLI

Kurulum:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Uygulama geliştirme ortamında [http://localhost:3006](http://localhost:3006) adresinde açılır.

Yerel Supabase kullanımı isteğe bağlıdır:

```powershell
npx supabase start
npx supabase migration up --local
npx supabase test db
```

Canlı Supabase projesi için `.env.local` içindeki URL ve anahtarlar kullanılır. Migration’lar sıra numarasıyla `supabase/migrations` altında tutulur. Canlı veritabanına migration gönderimi yalnızca doğrulama ve yedekleme prosedürü tamamlandıktan sonra yapılmalıdır.

---

## Ortam Değişkenleri

Başlangıç şablonu `.env.example` dosyasındadır. Temel değişkenler:

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* `NEXT_PUBLIC_SITE_URL`
* `APP_ENCRYPTION_KEY`
* `GITHUB_SYNC_ENCRYPTION_KEY`

SMTP, Netgsm ve Ödeal değerleri ilgili entegrasyon kullanılacaksa tanımlanır. PayTR ve iyzico kimlik bilgileri Yönetim Paneli > Ödeme Yöntemleri alanından girilir ve yalnızca sunucu tarafında işlenir.

> [!CAUTION]
> `.env.local`, service-role anahtarı, API anahtarları ve gerçek kullanıcı şifreleri GitHub’a yüklenmemelidir.

---

## Kalite ve Testler

```powershell
npm run check:utf8
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:e2e
npm run build
npx supabase test db
```

`__tests__`, `e2e` ve `supabase/tests` klasörleri otomatik doğrulama senaryolarını içerir. Bu dosyalar production sayfası olarak yayınlanmaz; regresyonları ve yetki/veri bütünlüğü hatalarını yakalamak için GitHub’da tutulur.

---

## Güvenlik İlkeleri

* Server Action ve korumalı route’lar her istekte kimlik ve rol doğrular.
* Admin panelinde sabit kullanıcı veya geliştirme bypass girişi bulunmaz.
* Müşteri verileri RLS ve ownership kontrolleriyle ayrıştırılır.
* Cari hareketler immutable ledger mantığıyla tutulur; reversal ve idempotency desteklenir.
* Kritik kullanıcı işlemleri audit log’a yazılır.
* Kart numarası, CVV ve düz metin entegrasyon sırrı saklanmaz.
* Kaynak dosyalar UTF-8 olarak doğrulanır.

---

## Proje Durumu

> [!NOTE]
> Proje aktif geliştirme aşamasındadır.

Temel B2B, cari, müşteri portalı, Supabase Auth/RBAC ve ödeme altyapısı aktiftir. Harici servislerin canlı tahsilat veya teslimat testleri için ilgili sağlayıcılardan alınan gerçek API bilgileri gereklidir.

---

## Kullanım ve Haklar

> [!IMPORTANT]
> Bu proje özel ve kapalı kaynak kodlu bir yazılımdır.

Kaynak kodun, tasarımın veya proje bileşenlerinin yetkisiz şekilde kopyalanması, paylaşılması, dağıtılması, yeniden yayınlanması veya ticari amaçla kullanılması yasaktır.

**Proprietary Software — All Rights Reserved**

---

<div align="center">

### TanıtımX

**Bu proje TanıtımX tarafından tasarlanmış ve geliştirilmiştir.**

Kurumsal yazılım çözümleri • Dijital sistemler • İş süreçleri otomasyonu

**© 2026 TanıtımX. Tüm hakları saklıdır.**

</div>
