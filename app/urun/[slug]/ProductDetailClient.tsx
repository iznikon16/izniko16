"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "../../../context/CartContext";

export default function ProductDetailClient({ product }: { product: any }) {
  const { addToCart, setIsCartOpen, itemCount, subtotal } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo" aria-label="İZNİKON Ana Sayfasına Git">
            <img src="/logo.png" alt="İZNİKON Logo" className="logo-img" />
          </Link>

          <nav className="main-nav" aria-label="Ana Menü">
            <Link href="/" className="nav-link">Ana Sayfa</Link>
            <Link href="/kategori/hirdavat" className="nav-link">Kategoriler</Link>
            <Link href="/" className="nav-link">Tüm Ürünler</Link>
            <a href="#" className="nav-link">B2B Toptan Fiyat Listesi</a>
            <Link href="/iletisim" className="nav-link">İletişim &amp; Destek</Link>
          </nav>

          <div className="header-actions">
            <a href="#" className="nav-link user-orders-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Siparişlerim
            </a>
            <a href="#" className="nav-link btn-login">Giriş Yap</a>
            
            <div
              onClick={() => setIsCartOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff",
                padding: "0.45rem 1.15rem 0.45rem 0.85rem", borderRadius: "12px", cursor: "pointer",
                border: "1px solid rgba(217, 119, 6, 0.4)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)", whiteSpace: "nowrap"
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", background: "rgba(217, 119, 6, 0.15)", borderRadius: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", color: "white", borderRadius: "9999px", minWidth: "18px", height: "18px", fontSize: "0.68rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", padding: "0 4px", boxShadow: "0 2px 6px rgba(239, 68, 68, 0.5)" }}>
                  {itemCount}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: "800", color: "#f59e0b", letterSpacing: "0.05em" }}>SEPETİM</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "800", color: "#ffffff", lineHeight: "1.1" }}>₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "600" }}>+KDV</span></span>
              </div>
            </div>

            <Link href="/toptan-musteri-ol" className="btn-b2b">Toptan Müşteri Ol</Link>
          </div>
        </div>
      </header>

      {/* BREADCRUMB */}
      <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "1rem 0" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#64748b", fontWeight: "500" }}>
            <Link href="/" style={{ color: "#0f172a", textDecoration: "none" }}>Ana Sayfa</Link>
            <span>/</span>
            <span style={{ color: "#0f172a" }}>{product.category}</span>
            <span>/</span>
            <span style={{ color: "#d97706" }}>{product.name}</span>
          </div>
        </div>
      </div>

      <main className="container" style={{ padding: "3rem 0", display: "flex", gap: "3rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* PRODUCT IMAGE GALLERY */}
        <div style={{ flex: "1 1 500px", background: "#ffffff", padding: "3rem", borderRadius: "24px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "center", alignItems: "center", position: "relative", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
          <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem" }}>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "0.4rem 0.8rem", borderRadius: "8px", fontWeight: "800", fontSize: "0.8rem" }}>
              ✓ STOKTA VAR
            </span>
          </div>
          <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}>
            <button style={{ background: "white", border: "1px solid #e2e8f0", width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
              </svg>
            </button>
          </div>
          <img src={product.img} alt={product.name} style={{ width: "100%", maxWidth: "450px", height: "auto", objectFit: "contain" }} />
        </div>

        {/* PRODUCT DETAILS & BUY BOX */}
        <div style={{ flex: "1 1 500px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <span style={{ color: "#d97706", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.9rem" }}>
              {product.category}
            </span>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#cbd5e1" }}></span>
            <span style={{ color: "#64748b", fontWeight: "600", fontSize: "0.9rem" }}>
              Marka: <strong style={{ color: "#0f172a" }}>{product.brand}</strong>
            </span>
          </div>
          
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "#0f172a", marginBottom: "1.5rem", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
            {product.name}
          </h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
            <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "0.4rem 0.8rem", borderRadius: "8px", fontWeight: "bold", color: "#475569", border: "1px solid #e2e8f0" }}>
              SKU: {product.code}
            </span>
          </div>

          {/* PRICE BOX */}
          <div style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", padding: "2rem", borderRadius: "20px", border: "1px solid #e2e8f0", marginBottom: "2.5rem", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "150px", height: "150px", background: "radial-gradient(circle, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0) 70%)", transform: "translate(30%, -30%)" }}></div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
              <div style={{ color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Toptan B2B Fiyatı</div>
              {product.customerPriceSource && product.customerPriceSource !== 'Standart Fiyat' && (
                <span style={{ background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "800" }}>
                  {product.customerPriceSource}
                </span>
              )}
            </div>
            
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "3.5rem", fontWeight: "900", color: "#0f172a", lineHeight: "1", letterSpacing: "-0.03em" }}>{product.price}</span>
              <span style={{ fontSize: "1.25rem", fontWeight: "800", color: "#94a3b8" }}>+KDV / {product.unit}</span>
            </div>
            
            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Miktar</span>
                <input 
                  type="number" 
                  value={qty} 
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1} 
                  style={{ width: "90px", height: "54px", fontSize: "1.25rem", textAlign: "center", fontWeight: "800", border: "2px solid #cbd5e1", borderRadius: "12px", outline: "none", color: "#0f172a", background: "white" }} 
                />
              </div>
              <button 
                onClick={() => {
                  addToCart(product, qty);
                  setIsCartOpen(true);
                }}
                style={{ flex: 1, height: "54px", alignSelf: "flex-end", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", fontSize: "1.1rem", fontWeight: "800", border: "none", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 10px 25px rgba(15, 23, 42, 0.2)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Sepete Ekle
              </button>
            </div>
          </div>

          {/* QUICK FEATURES */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "white", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", border: "1px solid #e2e8f0" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "0.95rem" }}>Orijinal Ürün Garantisi</div>
                <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: "500" }}>Tüm ürünlerimiz distribütör garantilidir.</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "white", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", border: "1px solid #e2e8f0" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
              </div>
              <div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "0.95rem" }}>Aynı Gün Kargo</div>
                <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: "500" }}>Saat 15:00'a kadar verilen siparişler aynı gün kargoda.</div>
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          {product.description && (
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#0f172a", marginBottom: "1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                Ürün Detayları
              </h3>
              <div style={{ color: "#475569", lineHeight: "1.8", fontSize: "1rem", fontWeight: "500" }} dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="footer" style={{ marginTop: "4rem" }}>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/logo.png" alt="İZNİKON Logo" style={{ height: "48px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }} />
              <p>Türkiye&apos;nin en hızlı B2B toptan nalbur, cıvata, elektrik ve tesisat malzemeleri tedarik platformu. 10.000+ çeşit orijinal stoklu ürün.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <div>&copy; 2026 <strong>İZNİKON Nalbur &amp; Hırdavat Toptancısı A.Ş.</strong> Tüm hakları saklıdır.</div>
          </div>
        </div>
      </footer>
    </>
  );
}
