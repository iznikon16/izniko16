-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE SEED VERİSİ
-- 08_seed.sql — İlk kurulum verisi
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ödeme yöntemleri (manuel / havale)
-- ----------------------------------------------------------------------------
insert into public.payment_methods (code, name, description, instructions, provider, integration_type, config, sort_order, is_active)
values
  ('havale-iban', 'Havale / EFT', 'Banka havalesi ile ödeme',
   'Siparişinizi havale/EFT ile ödeyebilirsiniz. Ödemeniz onaylandığında siparişiniz hazırlanmaya başlar.',
   'offline', 'manual',
   '{"bank_name": "Örnek Bank", "account_owner": "İzniko Ticaret", "iban": "TR00 0000 0000 0000 0000 00 00", "support_phone": ""}'::jsonb,
   1, true)
on conflict (code) do nothing;

-- ----------------------------------------------------------------------------
-- SMTP ayarları (tek satır başlangıç)
-- ----------------------------------------------------------------------------
insert into public.smtp_settings (id)
values ('main')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Home video ayarları (tek satır başlangıç)
-- ----------------------------------------------------------------------------
insert into public.home_video_settings (id, title, eyebrow, description, video_url, video_id, is_active)
values ('main', 'Tanıtım Videosu', 'Video', '', '', '', false)
on conflict (id) do nothing;
