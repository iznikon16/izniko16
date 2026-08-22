"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StorefrontAccountAction } from "../../../components/storefront/storefront-account-action";
import { useCart } from "../../../context/CartContext";
import { SafeImage } from '@/components/ui/safe-image';

type ProductDetail = {
  id: string | number;
  name: string;
  slug?: string;
  category: string;
  brand: string;
  code: string;
  price: string;
  unit: string;
  img: string;
  tags: string[];
  inStock: boolean;
  boxQty: string;
  description: string;
  customerPriceSource: string | null;
  minimumOrderQuantity: number;
  taxRate: number | null;
};

export default function ProductDetailClient({ product, isAuthenticated }: { product: ProductDetail; isAuthenticated: boolean }) {
  const { addToCart, setIsCartOpen, itemCount, subtotal } = useCart();
  const [qty, setQty] = useState(product.minimumOrderQuantity);

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo" aria-label="İZNİKON Ana Sayfasına Git">
            <SafeImage src="/logo.png" alt="İZNİKON Logo" width={1024} height={682} className="logo-img" />
          </Link>

          <nav className="main-nav" aria-label="Ana Menü">
            <Link href="/" className="nav-link">Ana Sayfa</Link>
            <Link href="/kategori/hirdavat" className="nav-link">Kategoriler</Link>
            <Link href="/" className="nav-link">Tüm Ürünler</Link>
            <a href="#" className="nav-link">B2B Toptan Fiyat Listesi</a>
            <Link href="/iletisim" className="nav-link">İletişim &amp; Destek</Link>
          </nav>

          <div className="header-actions">
            <StorefrontAccountAction isAuthenticated={isAuthenticated} nextPath={`/urun/${product.slug ?? ''}`} />
            
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
                <span style={{ fontSize: "0.9rem", fontWeight: "800", color: "#ffffff", lineHeight: "1.1" }}>₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "600" }}>KDV dahil</span></span>
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
            <Link href={`/kategori/${product.category.toLowerCase().replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`} style={{ color: "#0f172a", textDecoration: "none" }}>
              {product.category}
            </Link>
            <span>/</span>
            <span style={{ color: "#d97706" }}>{product.name}</span>
          </div>
        </div>
      </div>

      <main className="container" style={{ padding: "3rem 0", display: "flex", gap: "3rem", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center" }}>
        
        {/* PRODUCT IMAGE GALLERY */}
        <div style={{ flex: "1 1 45%", maxWidth: "500px", background: "#ffffff", padding: "1.5rem", borderRadius: "20px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "center", alignItems: "center", position: "relative", boxShadow: "0 10px 40px rgba(0,0,0,0.03)", minHeight: "350px" }}>
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
          <SafeImage src={product.img} alt={product.name} style={{ width: "100%", maxWidth: "100%", maxHeight: "400px", height: "auto", objectFit: "contain" }} />
        </div>

        {/* PRODUCT DETAILS & BUY BOX */}
        <div style={{ flex: "1 1 50%", maxWidth: "550px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <span style={{ color: "#d97706", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.9rem" }}>
              {product.category}
            </span>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#cbd5e1" }}></span>
            <span style={{ color: "#64748b", fontWeight: "600", fontSize: "0.9rem" }}>
              Marka: <strong style={{ color: "#0f172a" }}>{product.brand}</strong>
            </span>
          </div>
          
          <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "#0f172a", marginBottom: "1rem", lineHeight: "1.3", letterSpacing: "-0.01em" }}>
            {product.name}
          </h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
            <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "0.4rem 0.8rem", borderRadius: "8px", fontWeight: "bold", color: "#475569", border: "1px solid #e2e8f0" }}>
              SKU: {product.code}
            </span>
          </div>

          {/* PRICE BOX */}
          <div style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "2rem", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ color: "#475569", fontWeight: "700", fontSize: "0.9rem" }}>Toptan B2B Fiyatı</div>
              {product.customerPriceSource && product.customerPriceSource !== 'Standart Fiyat' && (
                <span style={{ background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "800" }}>
                  {product.customerPriceSource}
                </span>
              )}
            </div>
            
            {isAuthenticated ? <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontSize: "2.25rem", fontWeight: "900", color: "#0f172a", lineHeight: "1", letterSpacing: "-0.02em" }}>{product.price}</span>
              <span style={{ fontSize: "1rem", fontWeight: "700", color: product.taxRate == null ? "#b91c1c" : "#64748b" }}>{product.taxRate == null ? 'KDV oranı tanımlanmamış' : `%${product.taxRate} KDV dahil / ${product.unit}`}</span>
            </div> : <div><p style={{ color: '#475569', fontWeight: 700 }}>Fiyatları görmek için giriş yapın</p><Link href={`/giris?next=/urun/${product.slug ?? ''}`} style={{ display: 'inline-flex', marginTop: '0.75rem', borderRadius: '8px', background: '#d97706', color: 'white', fontWeight: 700, padding: '0.6rem 1rem' }}>Giriş Yap</Link></div>}
            
            {isAuthenticated ? <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Miktar</span>
                <input 
                  type="number" 
                  value={qty} 
                  onChange={(e) => setQty(Math.max(product.minimumOrderQuantity, parseInt(e.target.value) || product.minimumOrderQuantity))}
                  min={product.minimumOrderQuantity}
                  style={{ width: "80px", height: "48px", fontSize: "1.1rem", textAlign: "center", fontWeight: "800", border: "2px solid #cbd5e1", borderRadius: "8px", outline: "none", color: "#0f172a", background: "white" }}
                />
              </div>
              {product.minimumOrderQuantity > 1 ? <p style={{ color: '#b45309', fontSize: '0.8rem', fontWeight: 700 }}>Minimum: {product.minimumOrderQuantity} Adet</p> : null}
              <button 
                onClick={() => {
                  addToCart(product, qty);
                  setIsCartOpen(true);
                }}
                style={{ flex: 1, height: "48px", alignSelf: "flex-end", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", fontSize: "1rem", fontWeight: "700", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Sepete Ekle
              </button>
            </div> : null}
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
                <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: "500" }}>Saat 15:00&apos;a kadar verilen siparişler aynı gün kargoda.</div>
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
            {/* BRAND COLUMN */}
            <div className="footer-brand">
              <SafeImage src="/logo.png" alt="İZNİKON Logo" width={1024} height={682} className="footer-logo" />
              <p>
                Türkiye&apos;nin en hızlı B2B toptan nalbur, cıvata, elektrik ve tesisat malzemeleri tedarik platformu. 10.000+ çeşit orijinal stoklu ürün.
              </p>
              <ul className="footer-contact-list">
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>0 (850) 308 16 16 &bull; Toptan Destek</span>
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span>destek@iznikon.com.tr</span>
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>İznik Sanayi Sitesi 1. Blok No: 14, Bursa</span>
                </li>
              </ul>
            </div>

            {/* COLUMN 2: TOPTAN KATEGORİLER */}
            <div>
              <h4 className="footer-col-title">Toptan Kategoriler</h4>
              <ul className="footer-links">
                <li><a href="#">Hırdavat &amp; Cıvata Grubu</a></li>
                <li><a href="#">Elektrik &amp; Tesisat Ürünleri</a></li>
                <li><a href="#">Boru &amp; Profil Grubu</a></li>
                <li><a href="#">Bağlantı Elemanları &amp; Dübel</a></li>
                <li><a href="#">El Aletleri &amp; Ölçü Cihazları</a></li>
                <li><a href="#">Boya &amp; Yapı Kimyasalları</a></li>
              </ul>
            </div>

            {/* COLUMN 3: KURUMSAL */}
            <div>
              <h4 className="footer-col-title">Kurumsal</h4>
              <ul className="footer-links">
                <li><a href="#">Mesafeli Satış Sözleşmesi</a></li>
                <li><a href="#">İptal ve İade Koşulları</a></li>
                <li><a href="#">KVKK Aydınlatma Metni</a></li>
                <li><a href="#">Ön Bilgilendirme Formu</a></li>
                <li><Link href="/iletisim">İletişim</Link></li>
              </ul>
            </div>

            {/* COLUMN 4: E-BÜLTEN & SOSYAL MEDYA */}
            <div>
              <h4 className="footer-col-title">E-Bülten &amp; Fiyat Kataloğu</h4>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem", lineHeight: "1.5" }}>
                Yeni toptan fiyat listelerimizden ve haftalık kampanya kataloglarımızdan anında haberdar olun.
              </p>
              <form className="footer-newsletter-form" onSubmit={(e) => { e.preventDefault(); alert("B2B E-Bülten kaydınız tamamlandı!"); }}>
                <input
                  type="email"
                  placeholder="E-posta adresiniz..."
                  className="footer-newsletter-input"
                  required
                />
                <button type="submit" className="footer-newsletter-btn">
                  Kayıt Ol
                </button>
              </form>

              <div className="social-links">
                <a href="#" className="social-link" title="LinkedIn">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.75a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Z"/></svg>
                </a>
                <a href="#" className="social-link" title="Instagram">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="social-link" title="WhatsApp">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.106 4.037 4.103-1.076z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* BOTTOM COPYRIGHT & PAYMENT BADGES */}
          <div className="footer-bottom">
            <div>
              &copy; 2026 <strong>İZNİKON Nalbur &amp; Hırdavat Toptancısı A.Ş.</strong> Tüm hakları saklıdır.
            </div>

            {/* TANITIMX LOGO LINKED TO HTTPS://WWW.TANITIMX.COM/ */}
            <a
              href="https://www.tanitimx.com/"
              target="_blank"
              rel="noopener noreferrer"
              title="TanıtımX Web Tasarım &amp; Dijital Ajans"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.25rem 0.5rem",
                background: "transparent",
                borderRadius: "6px",
                transition: "opacity 0.2s, transform 0.2s"
              }}
            >
              <SafeImage
                src="/tanitimx-official.png"
                alt="TanıtımX"
                style={{ height: "35px", width: "auto", objectFit: "contain", display: "block" }}
              />
            </a>

            <div className="payment-badges">
              <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                256 Bit SSL Güvenli Alışveriş
              </span>
              <span className="payment-badge">VISA</span>
              <span className="payment-badge">MasterCard</span>
              <span className="payment-badge">TROY</span>
              <span className="payment-badge">Havale / EFT</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
