import { expect, test } from '@playwright/test';

test.describe('admin session boundary', () => {
  test('oturumsuz admin isteğini login sayfasına yönlendirir', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { name: /yönetici girişi/i })).toBeVisible();
  });

  for (const path of ['/admin/customers', '/admin/orders', '/admin/accounting', '/admin/integrations', '/admin/returns', '/admin/invoices', '/admin/stock', '/admin/reports', '/admin/yonetim/audit']) {
    test(`oturumsuz ${path} erişimini engeller`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    });
  }

  test('oturumsuz dashboard raporu verisini engeller', async ({ request }) => {
    const response = await request.get('/api/export/dashboard?days=30');
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Oturum açmanız gerekiyor.' });
  });

  test('stale ve uydurma auth cookie erişim sağlamaz', async ({ context, page }) => {
    await context.addCookies([{
      name: 'sb-invalid-auth-token',
      value: 'stale-session',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
    }]);
    await page.goto('/admin/accounting');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('sabit admin bilgileriyle yetkisiz giriş yapılamaz ve hata Türkçedir', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/e-posta/i).fill('admin@example.invalid');
    await page.getByLabel(/^şifre$/i).fill('admin');
    await page.getByRole('button', { name: /yönetim paneline giriş yap/i }).click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText('E-posta veya şifre hatalı.', { exact: true })).toBeVisible();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('cron bildirimi secret olmadan çalışmaz', async ({ request }) => {
    const response = await request.post('/api/cron/payment-reminders');
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  test('global admin araması oturum olmadan veri döndürmez', async ({ request }) => {
    const response = await request.get('/api/admin/search?q=musteri');
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: 'Oturum gerekli.' });
  });
});

test.describe('gerçek admin logout akışı', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'E2E admin hesabı tanımlanmadı.');

  test('login, logout, back ve korumalı route regresyonu', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/e-posta/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/^şifre$/i).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /yönetim paneline giriş yap/i }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });

    await page.getByRole('button', { name: /çıkış yap/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.goto('/admin/accounting');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('yetkili admin Supabase kullanıcı ve rol yönetimi sayfasını açar', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/e-posta/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/^şifre$/i).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /yönetim paneline giriş yap/i }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });

    await page.goto('/admin/yonetim/kullanicilar');
    await expect(page.getByRole('heading', { name: /kullanıcı ve rol yönetimi/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /yönetici \/ kullanıcı ekle/i })).toBeVisible();
    await expect(page.getByText(/Supabase Auth hesaplarını/i)).toBeVisible();
  });

  test('admin sidebar grupları tekil ve erişilebilir görünür', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/e-posta/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/^şifre$/i).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /yönetim paneline giriş yap/i }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });

    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByRole('button', { name: 'Katalog' })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Ön Muhasebe' })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Raporlar' })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Ayarlar' })).toBeVisible();
    await expect(sidebar.getByText('Yedekleme Merkezi', { exact: true })).toHaveCount(0);

    await sidebar.getByRole('button', { name: 'Yönetim' }).click();
    await expect(sidebar.getByRole('link', { name: /Yedekleme Merkezi/i })).toBeVisible();
  });
});

test.describe('müşteri session sınırı', () => {
  test('oturumsuz hesabım isteğini güvenli next ile müşteri girişine yönlendirir', async ({ page }) => {
    await page.goto('/hesabim/cari?donem=2026');
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Fcari%3Fdonem%3D2026$/);
    await expect(page.getByRole('heading', { name: /^giriş yap$/i })).toBeVisible();
  });

  test('oturumsuz sipariş sevkiyat detayını güvenli next ile girişe yönlendirir', async ({ page }) => {
    await page.goto('/hesabim/siparislerim/00000000-0000-0000-0000-000000000001');
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Fsiparislerim%2F00000000-0000-0000-0000-000000000001$/);
  });

  test('oturumsuz iade talepleri sayfasını güvenli next ile girişe yönlendirir', async ({ page }) => {
    await page.goto('/hesabim/iadelerim');
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Fiadelerim$/);
  });

  test('oturumsuz faturalar sayfasını güvenli next ile girişe yönlendirir', async ({ page }) => {
    await page.goto('/hesabim/faturalarim');
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Ffaturalarim$/);
  });

  test('stale ve uydurma cookie müşteri portalına erişim sağlamaz', async ({ context, page }) => {
    await context.addCookies([{
      name: 'sb-invalid-auth-token',
      value: 'stale-customer-session',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
    }]);

    await page.goto('/hesabim/cari');
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Fcari$/);
  });

  test('harici veya protokol-relative next hedefini kabul etmez', async ({ page }) => {
    await page.goto('/giris?next=%2F%2Fevil.example%2Fhesap');
    await expect(page.locator('input[name="next"]')).toHaveValue('/hesabim/cari');
  });

  test('eksik e-posta doğrulama bağlantısı güvenli sonuç ekranı gösterir', async ({ page }) => {
    await page.goto('/e-posta-onayla');
    await expect(page.getByRole('heading', { name: /doğrulama tamamlanamadı/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /giriş ekranına git/i })).toHaveAttribute('href', '/giris');
  });

  test('şifre kurtarma ekranları hesap bilgisi sızdırmadan güvenli durum gösterir', async ({ page }) => {
    await page.goto('/sifremi-unuttum');
    await expect(page.getByRole('heading', { name: /şifrenizi yenileyin/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /yenileme bağlantısı gönder/i })).toBeVisible();

    await page.goto('/sifre-yenile');
    await expect(page.getByRole('heading', { name: /bağlantı geçersiz/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /yeni bağlantı iste/i })).toHaveAttribute('href', '/sifremi-unuttum');
  });

  for (const [path, expectedNext] of [
    ['/', '/'],
    ['/kategori/hirdavat', '/kategori/hirdavat'],
    ['/iletisim', '/iletisim'],
    ['/toptan-musteri-ol', '/toptan-musteri-ol'],
    ['/sepet', '/sepet'],
  ] as const) {
    test(`oturumsuz ${path} headerında yalnız gerçek giriş aksiyonunu gösterir`, async ({ page }) => {
      await page.goto(path);
      const accountAction = page.locator('[data-storefront-account-action]');
      await expect(accountAction).toHaveCount(1);
      await expect(accountAction).toHaveText(/giriş yap/i);
      await expect(accountAction).toHaveAttribute('href', `/giris?next=${encodeURIComponent(expectedNext)}`);
      await expect(page.getByRole('link', { name: /^hesabım$/i })).toHaveCount(0);
    });
  }

  test('sepet sayfasında demo oturum değiştirme kontrolü bulunmaz', async ({ page }) => {
    await page.goto('/sepet');
    await expect(page.getByText(/oturum: b2b bayi/i)).toHaveCount(0);
    await expect(page.getByText(/tıkla ve giriş yap/i)).toHaveCount(0);
  });

  test('ürün detay headerı da gerçek müşteri giriş aksiyonunu kullanır', async ({ page }) => {
    await page.goto('/');
    const productHref = await page.locator('a[href^="/urun/"]').first().getAttribute('href');
    expect(productHref).toBeTruthy();

    await page.goto(productHref!);
    const accountAction = page.locator('[data-storefront-account-action]');
    await expect(accountAction).toHaveCount(1);
    await expect(accountAction).toHaveText(/giriş yap/i);
    await expect(accountAction).toHaveAttribute('href', `/giris?next=${encodeURIComponent(productHref!)}`);
  });
});

test.describe('gerçek müşteri login ve logout akışı', () => {
  test.skip(!process.env.E2E_CUSTOMER_EMAIL || !process.env.E2E_CUSTOMER_PASSWORD, 'E2E müşteri hesabı tanımlanmadı.');

  test('login, koşullu header, global logout, back ve korumalı route regresyonu', async ({ page }) => {
    await page.goto('/giris?next=%2Fhesabim%2Fcari');
    await page.getByLabel(/e-posta adresi/i).fill(process.env.E2E_CUSTOMER_EMAIL!);
    await page.getByLabel(/^şifre$/i).fill(process.env.E2E_CUSTOMER_PASSWORD!);
    await page.getByRole('button', { name: /hesabıma giriş yap/i }).click();
    await expect(page).toHaveURL(/\/hesabim\/cari$/, { timeout: 20_000 });

    await page.goto('/');
    await expect(page.locator('[data-storefront-account-action]')).toHaveText(/hesabım/i);
    await expect(page.getByRole('link', { name: /^giriş yap$/i })).toHaveCount(0);

    await page.goto('/hesabim/cari');
    await page.getByRole('button', { name: /çıkış yap/i }).click();
    await expect(page).toHaveURL(/\/giris$/, { timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Fcari$/);

    await page.goto('/hesabim/cari');
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesabim%2Fcari$/);
  });

  test('profil, adres ve favori portalı yalnız doğrulanmış müşteriyle açılır', async ({ page }) => {
    await page.goto('/giris?next=%2Fhesabim%2Fprofil');
    await page.getByLabel(/e-posta adresi/i).fill(process.env.E2E_CUSTOMER_EMAIL!);
    await page.getByLabel(/^şifre$/i).fill(process.env.E2E_CUSTOMER_PASSWORD!);
    await page.getByRole('button', { name: /hesabıma giriş yap/i }).click();
    await expect(page).toHaveURL(/\/hesabim\/profil$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /^profilim$/i })).toBeVisible();

    await page.goto('/hesabim/adreslerim');
    await expect(page.getByRole('heading', { name: /^adreslerim$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /yeni adres/i })).toBeVisible();

    await page.goto('/hesabim/favorilerim');
    await expect(page.getByRole('heading', { name: /^favorilerim$/i })).toBeVisible();
  });
});

test.describe('gerçek storefront checkout geçişi', () => {
  test.skip(!process.env.E2E_CUSTOMER_EMAIL || !process.env.E2E_CUSTOMER_PASSWORD, 'E2E müşteri hesabı tanımlanmadı.');

  test('istemci sepetini güvenli sunucu checkout ekranına taşır', async ({ page }) => {
    await page.goto('/giris?next=%2F');
    await page.getByLabel(/e-posta adresi/i).fill(process.env.E2E_CUSTOMER_EMAIL!);
    await page.getByLabel(/^şifre$/i).fill(process.env.E2E_CUSTOMER_PASSWORD!);
    await page.getByRole('button', { name: /hesabıma giriş yap/i }).click();
    await expect(page).toHaveURL(new RegExp('/$'));

    const addButton = page.getByRole('button', { name: /^sepete ekle$/i }).first();
    await expect(addButton).toBeEnabled();
    await addButton.click();
    await page.goto('/sepet');
    await expect(page.getByRole('heading', { name: /siparişinizi gözden geçirin/i })).toBeVisible();
    await page.getByRole('button', { name: /güvenli ödemeye geç/i }).click();
    await expect(page).toHaveURL(/\/odeme$/);
    await expect(page.getByText('Cari Bakiyeden Öde', { exact: true })).toBeVisible();
    await expect(page.getByText('Cari durum', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /teslimat adresi/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /siparişi güvenle tamamla/i })).toBeVisible();
  });
});
