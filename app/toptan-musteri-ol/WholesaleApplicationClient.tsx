"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StorefrontAccountAction } from "@/components/storefront/storefront-account-action";
import { useCart } from "../../context/CartContext";
import { SafeImage } from '@/components/ui/safe-image';

export default function WholesaleApplicationClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { setIsCartOpen, itemCount, subtotal } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    taxOffice: "",
    taxNo: "",
    sector: "Nalbur & Yapı Market",
    city: "Bursa",
    district: "İznik",
    monthlyVolume: "100k-250k",
    note: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* HEADER */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo">
            <SafeImage src="/logo.png" alt="İZNİKON Logo" className="logo-img" />
          </Link>

          <nav className="main-nav" aria-label="Ana Menü">
            <Link href="/" className="nav-link">
              Ana Sayfa
            </Link>

            <div className="nav-dropdown">
              <span className="nav-link" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                Kategoriler
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </span>
              <div className="dropdown-menu" style={{
                position: "absolute",
                top: "100%",
                left: 0,
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                padding: "0.6rem",
                minWidth: "220px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
                zIndex: 100,
                display: "none",
                flexDirection: "column",
                gap: "0.25rem"
              }}>
                <Link href="/kategori/hirdavat" className="dropdown-item">Hırdavat &amp; Cıvata</Link>
                <Link href="/kategori/elektrik" className="dropdown-item">Elektrik &amp; Tesisat</Link>
                <Link href="/kategori/boru" className="dropdown-item">Boru &amp; Profil</Link>
                <Link href="/kategori/baglanti" className="dropdown-item">Bağlantı Elemanları</Link>
                <Link href="/kategori/el-aletleri" className="dropdown-item">El Aletleri &amp; Garaj</Link>
                <Link href="/kategori/kimyasal" className="dropdown-item">Boya &amp; Kimyasallar</Link>
              </div>
            </div>

            <Link href="/" className="nav-link">
              Tüm Ürünler
            </Link>
            <a href="#" className="nav-link">
              B2B Toptan Fiyat Listesi
            </a>
            <a href="#" className="nav-link">
              Hakkımızda
            </a>
            <a href="#" className="nav-link">
              İletişim &amp; Destek
            </a>
          </nav>

          <div className="header-actions">
            <StorefrontAccountAction isAuthenticated={isAuthenticated} nextPath="/toptan-musteri-ol" />

            {/* HEADER CART WIDGET */}
            <div
              onClick={() => setIsCartOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                padding: "0.45rem 1.15rem 0.45rem 0.85rem",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid rgba(217, 119, 6, 0.4)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                whiteSpace: "nowrap"
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", background: "rgba(217, 119, 6, 0.15)", borderRadius: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", color: "white", borderRadius: "9999px", minWidth: "18px", height: "18px", fontSize: "0.68rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", padding: "0 4px" }}>
                  {itemCount}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: "800", color: "#f59e0b", letterSpacing: "0.05em" }}>SEPETİM</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "800", color: "#ffffff", lineHeight: "1.1" }}>₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "600" }}>+KDV</span></span>
              </div>
            </div>

            <Link href="/toptan-musteri-ol" className="btn-b2b">
              Toptan Müşteri Ol
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section style={{ background: "linear-gradient(135deg, #090e1a 0%, #0f172a 100%)", color: "white", padding: "3.5rem 0 4rem 0", position: "relative" }}>
        <div className="container" style={{ textAlign: "center", maxWidth: "850px" }}>
          <span style={{ background: "rgba(217, 119, 6, 0.2)", color: "#f59e0b", padding: "0.4rem 1rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: "800", letterSpacing: "0.05em", display: "inline-block", marginBottom: "1.25rem", border: "1px solid rgba(217, 119, 6, 0.4)" }}>
            B2B TOPTAN BAYİLİK PORTALI
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: "800", margin: "0 0 1rem 0", lineHeight: "1.15" }}>
            İZNİKON Toptan Bayi Ağına Katılın
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#cbd5e1", margin: 0, lineHeight: "1.6" }}>
            Türkiye&apos;nin en hızlı B2B toptan nalbur, cıvata, elektrik ve tesisat tedarik ağında yerinizi alın. Özel bayi iskontoları ve hızlı depo teslimat ayrıcalıklarından hemen yararlanın.
          </p>
        </div>
      </section>

      <main className="container" style={{ marginTop: "-2rem", paddingBottom: "5rem", position: "relative", zIndex: 10 }}>
        {/* ADVANTAGES CARDS (Clean 3-Card Layout without Vadeli Açık Hesap) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "3rem" }}>
          <div style={{ background: "white", padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "46px", height: "46px", background: "#fef3c7", color: "#d97706", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="5" x2="5" y2="19"/>
                <circle cx="6.5" cy="6.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.5rem 0" }}>Özel Bayi Iskontoları</h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
              Liste fiyatları üzerinden onaylı bayilerimize özel ek toptan bayi iskontosu ve hacimli alım avantajları.
            </p>
          </div>

          <div style={{ background: "white", padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "46px", height: "46px", background: "#e0f2fe", color: "#0284c7", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.5rem 0" }}>Hızlı Depo Sevkiyatı</h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
              Saat 15:00&apos;e kadar verilen tüm toptan siparişler aynı gün merkez depomuzdan kargoya veya ambara verilir.
            </p>
          </div>

          <div style={{ background: "white", padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
            <div style={{ width: "46px", height: "46px", background: "#f3e8ff", color: "#9333ea", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7.5 4.27 9 5.15"/>
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.5rem 0" }}>10.000+ Stoklu Ürün</h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
              Cıvatadan kabloya, el aletlerinden tesisat borularına tek noktadan eksiksiz orijinal ürün tedariki.
            </p>
          </div>
        </div>

        {/* APPLICATION FORM CONTAINER */}
        <div style={{ maxWidth: "800px", margin: "0 auto", background: "white", borderRadius: "20px", padding: "2.5rem", border: "1px solid #e2e8f0", boxShadow: "0 15px 45px rgba(0,0,0,0.05)" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ width: "64px", height: "64px", background: "#dcfce7", color: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
                Bayilik Başvurunuz Başarıyla Alındı!
              </h2>
              <p style={{ color: "#475569", fontSize: "1rem", lineHeight: "1.6", maxWidth: "550px", margin: "0 auto 2rem auto" }}>
                Toptan satış temsilcilerimiz firmanızı inceleyerek bayi iskontolarınızı tanımlamak üzere 24 saat içerisinde sizinle iletişime geçecektir.
              </p>
              <Link
                href="/"
                style={{ background: "#0f172a", color: "white", padding: "0.85rem 2rem", borderRadius: "10px", fontWeight: "800", textDecoration: "none", fontSize: "0.95rem" }}
              >
                Kataloğu İncelemeye Devam Et &rsaquo;
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "1.25rem", marginBottom: "1.75rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.4rem 0" }}>
                  B2B Toptan Bayilik Başvuru Formu
                </h2>
                <p style={{ fontSize: "0.9rem", color: "#64748b", margin: 0 }}>
                  Lütfen firmanıza ait resmi bilgileri eksiksiz doldurunuz.
                </p>
              </div>

              {/* SECTION 1: COMPANY & AUTHORIZED */}
              <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "#d97706", margin: "0 0 1rem 0" }}>
                1. Firma &amp; Yetkili Bilgileri
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Resmi Firma Ünvanı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: ABC Yapı Market Ltd. Şti."
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Yetkili Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahmet Yılmaz"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>E-Posta Adresi *</label>
                  <input
                    type="email"
                    required
                    placeholder="Örn: siparis@abcyapi.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Telefon / Cep *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Örn: 0532 123 45 67"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>
              </div>

              {/* SECTION 2: TAX & SECTOR */}
              <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "#d97706", margin: "0 0 1rem 0" }}>
                2. Ticari &amp; Sektörel Bilgiler
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Vergi Dairesi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: İznik Vergi Dairesi"
                    value={formData.taxOffice}
                    onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Vergi No / T.C. No *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 1230456789"
                    value={formData.taxNo}
                    onChange={(e) => setFormData({ ...formData, taxNo: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Faaliyet Alanınız *</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem", background: "white" }}
                  >
                    <option value="Nalbur & Yapı Market">Nalbur &amp; Yapı Market</option>
                    <option value="Elektrik & Tesisat Mağazası">Elektrik &amp; Tesisat Mağazası</option>
                    <option value="İnşaat & Müteahhitlik">İnşaat &amp; Müteahhitlik</option>
                    <option value="Sanayi & Fabrika Tedariki">Sanayi &amp; Fabrika Tedariki</option>
                    <option value="Atölye & İmalathane">Atölye &amp; İmalathane</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Aylık Tahmini Toptan Alım Hacmi</label>
                  <select
                    value={formData.monthlyVolume}
                    onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem", background: "white" }}
                  >
                    <option value="50k-100k">₺50.000 - ₺100.000</option>
                    <option value="100k-250k">₺100.000 - ₺250.000</option>
                    <option value="250k-500k">₺250.000 - ₺500.000</option>
                    <option value="500k+">₺500.000 ve Üzeri</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Ek Not / Mesajınız</label>
                <textarea
                  rows={3}
                  placeholder="Başvurunuzla ilgili iletmek istediğiniz detaylar..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "800",
                  fontSize: "1.05rem",
                  cursor: "pointer",
                  boxShadow: "0 8px 25px rgba(15, 23, 42, 0.3)"
                }}
              >
                B2B Bayilik Başvurusunu Gönder &rsaquo;
              </button>
            </form>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <div>
              &copy; 2026 <strong>İZNİKON Nalbur &amp; Hırdavat Toptancısı A.Ş.</strong> Tüm hakları saklıdır.
            </div>

            <a href="https://www.tanitimx.com/" target="_blank" rel="noopener noreferrer">
              <SafeImage src="/tanitimx-official.png" alt="TanıtımX" style={{ height: "35px", width: "auto" }} />
            </a>

            <div className="payment-badges">
              <span className="payment-badge">VISA</span>
              <span className="payment-badge">MasterCard</span>
              <span className="payment-badge">TROY</span>
              <span className="payment-badge">Havale / EFT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
