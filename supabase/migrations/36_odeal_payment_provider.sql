-- Faz 24: Ödeal ödeme girişimleri ve geri ödemeleri enum ile güvenli biçimde ilişkilendirilsin.

alter type public.payment_provider add value if not exists 'odeal';
