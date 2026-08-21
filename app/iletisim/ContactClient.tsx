"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StorefrontAccountAction } from "@/components/storefront/storefront-account-action";
import { useCart } from "../../context/CartContext";
import { SafeImage } from '@/components/ui/safe-image';

export default function ContactClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { setIsCartOpen, itemCount, subtotal } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Toptan Sipariş & Teklif",
    message: ""
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
            <Link href="/iletisim" className="nav-link active">
              İletişim &amp; Destek
            </Link>
          </nav>

          <div className="header-actions">
            <StorefrontAccountAction isAuthenticated={isAuthenticated} nextPath="/iletisim" />

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
      <section style={{ background: "linear-gradient(135deg, #090e1a 0%, #0f172a 100%)", color: "white", padding: "3.5rem 0 4rem 0" }}>
        <div className="container" style={{ textAlign: "center", maxWidth: "800px" }}>
          <span style={{ background: "rgba(217, 119, 6, 0.2)", color: "#f59e0b", padding: "0.4rem 1rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: "800", letterSpacing: "0.05em", display: "inline-block", marginBottom: "1.25rem", border: "1px solid rgba(217, 119, 6, 0.4)" }}>
            İZNİKON İLETİŞİM &amp; MÜŞTERİ DESTEK
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: "800", margin: "0 0 1rem 0", lineHeight: "1.15" }}>
            Bizimle İletişime Geçin
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#cbd5e1", margin: 0, lineHeight: "1.6" }}>
            Toptan siparişleriniz, fiyat teklifleri ve teknik destek talepleriniz için uzman ekibimiz hizmetinizdedir.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="container" style={{ marginTop: "-2rem", paddingBottom: "5rem", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>

          {/* CONTACT INFO CARDS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* ADDRESS CARD */}
            <div style={{ background: "white", padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ width: "48px", height: "48px", background: "#fef3c7", color: "#d97706", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>MERKEZ ADRESİMİZ</h3>
                  <span style={{ fontSize: "0.8rem", color: "#d97706", fontWeight: "700" }}>Fabrika &amp; Depo</span>
                </div>
              </div>
              <p style={{ fontSize: "1rem", color: "#334155", margin: 0, lineHeight: "1.6", fontWeight: "600" }}>
                Dikmeli Mücavir Mevkii 903 Sk. No: 3 A<br />
                Dikmeli Köyü, Çilimli, Düzce
              </p>
            </div>

            {/* PHONE CARD */}
            <div style={{ background: "white", padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ width: "48px", height: "48px", background: "#dcfce7", color: "#16a34a", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>TELEFON HATTINIZ</h3>
                  <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: "700" }}>Müşteri Hizmetleri &amp; Sipariş</span>
                </div>
              </div>
              <a
                href="tel:05526766516"
                style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", textDecoration: "none", display: "block" }}
              >
                0552 676 65 16
              </a>
              <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                Hafta İçi: 08:30 - 18:30 | Cumartesi: 08:30 - 14:00
              </span>
            </div>

            {/* EMAIL & SUPPORT CARD */}
            <div style={{ background: "white", padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ width: "48px", height: "48px", background: "#e0f2fe", color: "#0284c7", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>E-POSTA ADRESİMİZ</h3>
                  <span style={{ fontSize: "0.8rem", color: "#0284c7", fontWeight: "700" }}>Teklif &amp; Destek</span>
                </div>
              </div>
              <a
                href="mailto:info@iznikon.com"
                style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", textDecoration: "none" }}
              >
                info@iznikon.com
              </a>
            </div>

          </div>

          {/* CONTACT FORM */}
          <div style={{ background: "white", padding: "2.25rem", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 15px 45px rgba(0,0,0,0.05)" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ width: "64px", height: "64px", background: "#dcfce7", color: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.5rem" }}>
                  Mesajınız Başarıyla İletildi!
                </h2>
                <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "2rem" }}>
                  Temsilcilerimiz talebinizi inceleyip en kısa sürede tarafınıza dönüş yapacaktır.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{ background: "#0f172a", color: "white", border: "none", padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
                >
                  Yeni Mesaj Gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", margin: "0 0 0.4rem 0" }}>
                  Hızlı Mesaj Gönderin
                </h2>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1.5rem 0" }}>
                  Talebinizi aşağıdaki form üzerinden iletebilirsiniz.
                </p>

                <div style={{ marginBottom: "1.1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Adınız Soyadınız / Firma Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahmet Yılmaz / Yapı Ltd."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>E-Posta Adresi *</label>
                    <input
                      type="email"
                      required
                      placeholder="bilgi@firma.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Telefon *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0552 676 65 16"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Konu</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem", background: "white" }}
                  >
                    <option value="Toptan Sipariş & Teklif">Toptan Sipariş &amp; Teklif</option>
                    <option value="Ürün & Fiyat Bilgisi">Ürün &amp; Fiyat Bilgisi</option>
                    <option value="Kargo & Teslimat Takibi">Kargo &amp; Teslimat Takibi</option>
                    <option value="Bayilik & Üyelik">Bayilik &amp; Üyelik</option>
                  </select>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem" }}>Mesajınız *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="İletmek istediğiniz mesaj..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 0.9rem", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "0.9rem",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(15,23,42,0.3)"
                  }}
                >
                  Mesajı Gönder &rsaquo;
                </button>
              </form>
            )}
          </div>
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
