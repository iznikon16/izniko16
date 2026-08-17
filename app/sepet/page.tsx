"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "../../context/CartContext";

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    vatAmount,
    total,
    itemCount
  } = useCart();

  // Simulated B2B Authentication State (Default true for demo)
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState("iznikon-depo");
  const [paymentMethod, setPaymentMethod] = useState("card");

  // Simulated Auto-Pulled B2B Member Account Data
  const b2bMemberProfile = {
    companyName: "İZNİK YAPI MARKET NALBURİYE A.Ş.",
    cariCode: "BAYİ-88421",
    taxOffice: "İznik Vergi Dairesi",
    taxNo: "4820194821",
    phone: "0 (224) 757 12 34",
    addresses: [
      { id: "iznikon-depo", title: "İznikon Depodan Teslim (Gel-Al)", address: "İznik Sanayi Sitesi 1. Blok No: 14, İznik / Bursa (Depomuzdan Doğrudan Teslim Alınacak)" },
      { id: "depo-1", title: "Firma Merkez Depo & Mağaza", address: "Mustafakemalpaşa Mah. Sanayi Cad. No: 14, İznik / Bursa" },
      { id: "depo-2", title: "Şantiye Teslimat Adresi", address: "Göllüce Mah. Yeni Sahil Çevreyolu No: 88, İznik / Bursa" }
    ]
  };

  const formatCurrency = (amount: number) => {
    return "₺" + amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("Sipariş vermek için lütfen B2B Bayi Girişi yapın.");
      return;
    }
    if (cart.length === 0) {
      alert("Sepetinizde ürün bulunmamaktadır.");
      return;
    }
    alert(`Tebrikler! Siparişiniz başarıyla alındı. Sipariş Numarası: IZN-${Math.floor(100000 + Math.random() * 900000)}`);
    clearCart();
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* HEADER */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo">
            <img src="/logo.png" alt="İZNİKON Logo" className="logo-img" />
          </Link>

          <nav className="main-nav">
            <Link href="/" className="nav-link">
              Ana Sayfa
            </Link>

            {/* CATEGORIES DROPDOWN */}
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
            <button
              onClick={() => setIsLoggedIn(!isLoggedIn)}
              style={{
                background: isLoggedIn ? "#16a34a" : "#cbd5e1",
                color: isLoggedIn ? "white" : "#0f172a",
                border: "none",
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              {isLoggedIn ? "Oturum: B2B Bayi Girişi Yapıldı" : "Oturum: Üye Girişi Yok (Tıkla ve Giriş Yap)"}
            </button>

            <Link href="/" className="btn-b2b">
              &lsaquo; Alışverişe Devam Et
            </Link>
          </div>
        </div>
      </header>

      {/* PAGE BANNER */}
      <div style={{ background: "#0f172a", color: "white", padding: "2rem 0" }}>
        <div className="container">
          <h1 style={{ fontSize: "2rem", fontWeight: "800", margin: "0 0 0.5rem 0" }}>
            İznikon Sipariş Sistemi
          </h1>
          <p style={{ color: "#cbd5e1", margin: 0, fontSize: "0.95rem" }}>
            Kayıtlı firma bilgileriniz ve teslimat adresleriniz otomatik olarak çekilmektedir.
          </p>
        </div>
      </div>

      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        {cart.length === 0 ? (
          <div style={{ background: "white", padding: "4rem 2rem", borderRadius: "16px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1rem" }}>
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <h2 style={{ fontSize: "1.5rem", color: "#0f172a", marginBottom: "0.5rem" }}>Sepetinizde Ürün Bulunmuyor</h2>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Kataloğumuzdan ihtiyacınız olan ürünleri seçip sepete ekleyebilirsiniz.</p>
            <Link
              href="/"
              style={{ background: "#d97706", color: "white", padding: "0.75rem 1.75rem", borderRadius: "10px", fontWeight: "800", textDecoration: "none", fontSize: "1rem" }}
            >
              Ürün Kataloğuna Git &rsaquo;
            </Link>
          </div>
        ) : !isLoggedIn ? (
          /* NON-LOGGED IN MEMBER LOCK BOX */
          <div style={{ background: "white", padding: "3rem 2rem", borderRadius: "16px", border: "2px solid #e2e8f0", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", maxWidth: "650px", margin: "0 auto" }}>
            <div style={{ width: "64px", height: "64px", background: "#fef3c7", color: "#d97706", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.75rem" }}>
              Sadece Onaylı B2B Bayilerimiz Sipariş Verebilir
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "2rem" }}>
              Siparişler doğrudan bayi hesabınıza tanımlandığı için işlem yapmadan önce üye girişi yapmanız gerekmektedir.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setIsLoggedIn(true)}
                style={{ background: "#0f172a", color: "white", padding: "0.85rem 1.75rem", borderRadius: "10px", fontWeight: "800", fontSize: "0.95rem", border: "none", cursor: "pointer" }}
              >
                Bayi Girişi Yap
              </button>
              <Link
                href="/toptan-musteri-ol"
                style={{ background: "#f1f5f9", color: "#0f172a", padding: "0.85rem 1.75rem", borderRadius: "10px", fontWeight: "800", fontSize: "0.95rem", textDecoration: "none", border: "1px solid #cbd5e1" }}
              >
                B2B Bayilik Başvurusu Yap
              </Link>
            </div>
          </div>
        ) : (
          /* LOGGED IN B2B MEMBER ORDER */
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
            {/* AUTOMATED MEMBER INFORMATION BADGE */}
            <div style={{ background: "#0f172a", color: "white", padding: "1.25rem 1.5rem", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: "800", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                  OTOMATİK ÇEKİLEN B2B BAYİ HESABI
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", margin: 0 }}>
                  {b2bMemberProfile.companyName} <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: "600" }}>({b2bMemberProfile.cariCode})</span>
                </h3>
                <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "0.25rem" }}>
                  {b2bMemberProfile.taxOffice} &bull; Vergi No: {b2bMemberProfile.taxNo}
                </div>
              </div>
            </div>

            {/* MAIN ORDER CONTENT */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
              {/* CART TABLE */}
              <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    Sipariş Kalemleri ({itemCount} Çeşit)
                  </h3>
                  <button
                    onClick={clearCart}
                    style={{ background: "#fef2f2", color: "#ef4444", border: "none", padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Tüm Sepeti Temizle
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem",
                        background: "#f8fafc",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      <img src={item.img} alt={item.name} style={{ width: "64px", height: "64px", objectFit: "contain", background: "white", padding: "4px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "#64748b", fontWeight: "700" }}>{item.code}</span>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", margin: "0.15rem 0 0.3rem 0" }}>
                          {item.name}
                        </h4>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Birim Fiyat: {item.price} +KDV</span>
                      </div>

                      {/* STEPPER */}
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white" }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ width: "32px", height: "32px", border: "none", background: "#f1f5f9", fontWeight: "800", cursor: "pointer", fontSize: "1rem" }}
                        >
                          -
                        </button>
                        <span style={{ width: "40px", textAlign: "center", fontSize: "0.95rem", fontWeight: "800", color: "#0f172a" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ width: "32px", height: "32px", border: "none", background: "#f1f5f9", fontWeight: "800", cursor: "pointer", fontSize: "1rem" }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ textAlign: "right", minWidth: "110px" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>
                          {formatCurrency(item.numericPrice * item.quantity)}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>+KDV</span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AUTOMATED ADDRESS SELECTION & PAYMENT FORM */}
              <form onSubmit={handleOrderSubmit} style={{ background: "white", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>
                  Kayıtlı Teslimat Adresi Seçimi
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {b2bMemberProfile.addresses.map((addr) => (
                    <label
                      key={addr.id}
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        padding: "1rem",
                        border: selectedAddress === addr.id ? "2px solid #d97706" : "1px solid #cbd5e1",
                        borderRadius: "10px",
                        background: selectedAddress === addr.id ? "#fffbeb" : "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddress === addr.id}
                        onChange={() => setSelectedAddress(addr.id)}
                        style={{ marginTop: "0.2rem" }}
                      />
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.2rem" }}>
                          {addr.title}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                          {addr.address}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* PAYMENT METHOD (No Açık Hesap / No Açık Cari) */}
                <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "#0f172a", margin: "1.5rem 0 0.85rem 0" }}>Ödeme Yöntemi Seçin</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1rem", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", background: paymentMethod === "card" ? "#fffbeb" : "white" }}>
                    <input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
                    <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>Kredi Kartı ile Öde (256 Bit SSL Güvenli)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1rem", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", background: paymentMethod === "eft" ? "#fffbeb" : "white" }}>
                    <input type="radio" name="payment" value="eft" checked={paymentMethod === "eft"} onChange={() => setPaymentMethod("eft")} />
                    <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>Banka Havalesi / EFT (%3 Ekstra Iskonto)</span>
                  </label>
                </div>

                {/* SUMMARY BOX */}
                <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem", color: "#64748b" }}>
                    <span>Ara Toplam:</span>
                    <strong style={{ color: "#0f172a" }}>{formatCurrency(subtotal)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem", color: "#64748b" }}>
                    <span>KDV (%20):</span>
                    <strong style={{ color: "#0f172a" }}>{formatCurrency(vatAmount)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
                    <span>Genel Toplam:</span>
                    <span style={{ color: "#d97706" }}>{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "0.95rem",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.3)"
                  }}
                >
                  Siparişi Onayla &amp; Öde &rsaquo;
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <div>
              &copy; 2026 <strong>İZNİKON Nalbur &amp; Hırdavat Toptancısı A.Ş.</strong> Tüm hakları saklıdır.
            </div>

            <a href="https://www.tanitimx.com/" target="_blank" rel="noopener noreferrer">
              <img src="/tanitimx-official.png" alt="TanıtımX" style={{ height: "35px", width: "auto" }} />
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
