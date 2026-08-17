"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "../../../context/CartContext";

// Category Data Dictionary
const categoryDataMap: Record<string, { name: string; description: string }> = {
  "hirdavat": { name: "Hırdavat & Cıvata", description: "Paslanmaz çelik şerit metreler, altıköşe somunlu cıvatalar, somun, pul ve şantiye hırdavat malzemeleri." },
  "elektrik": { name: "Elektrik & Tesisat", description: "Bakır NYM kablolar, prizler, sigortalar ve sanayi tipi elektrik tesisat ürünleri." },
  "boru": { name: "Boru & Profil", description: "PPRC temiz su plastik boruları, pis su boruları, vanalar ve tesisat ek parçaları." },
  "baglanti": { name: "Bağlantı Elemanları", description: "Ağır yük kimyasal dübeller, sac vidaları, kelepçeler ve çelik halat klemensleri." },
  "el-aletleri": { name: "El Aletleri & Garaj", description: "Profesyonel darbeli matkaplar, penseler, avuç taşlama makineleri ve lokma takımları." },
  "kimyasal": { name: "Boya & Kimyasallar", description: "Şeffaf akrilik silikon mastikler, poliüretan köpükler, yapıştırıcılar ve boyalar." }
};

// All Master Products
const allProducts = [
  { id: 1, name: "İznikon Şerit Metre 5m x 19mm", code: "IZN-M50", category: "hirdavat", price: "₺145,00", unit: "Adet", img: "/logo.png" },
  { id: 2, name: "İznikon Darbeli Matkap 850W Dual-Speed", code: "IZN-M850", category: "el-aletleri", price: "₺1.850,00", unit: "Adet", img: "/logo.png" },
  { id: 3, name: "YB Altıköşe Cıvata M8x50mm", code: "YB-850", category: "hirdavat", price: "₺320,00", unit: "Kutu", img: "/logo.png" },
  { id: 4, name: "İznikon Plastik Boru 25mm 4m", code: "IZN-P25", category: "boru", price: "₺65,00", unit: "Boy", img: "/logo.png" },
  { id: 5, name: "HES Bakır Elektrik Kablosu 100m", code: "NYM-325", category: "elektrik", price: "₺2.450,00", unit: "Rulo", img: "/logo.png" },
  { id: 6, name: "İznikon Akrilik Silikon 310ml", code: "IZN-S310", category: "kimyasal", price: "₺75,00", unit: "Tüp", img: "/logo.png" },
  { id: 7, name: "İznikon İzoleli Pense 180mm", code: "IZN-P180", category: "el-aletleri", price: "₺185,00", unit: "Adet", img: "/logo.png" },
  { id: 8, name: "İznikon Avuç Taşlama 115mm 750W", code: "IZN-AT115", category: "el-aletleri", price: "₺1.290,00", unit: "Adet", img: "/logo.png" },
  { id: 9, name: "Fischer Plastik Dübel Seti 8mm", code: "FSC-SX8", category: "baglanti", price: "₺215,00", unit: "Kutu", img: "/logo.png" },
  { id: 10, name: "İznikon Su Terazisi 60cm Mıknatıslı", code: "IZN-ST60", category: "el-aletleri", price: "₺290,00", unit: "Adet", img: "/logo.png" }
];

export default function CategoryPage() {
  const { addToCart, setIsCartOpen, itemCount, subtotal } = useCart();
  const params = useParams();
  const slug = (params?.slug as string) || "hirdavat";

  const currentCategory = categoryDataMap[slug] || {
    name: "Toptan Ürün Kataloğu",
    description: "Toptan satın almak istediğiniz ürünü kolayca seçin."
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle scroll lock and Escape key for search modal
  useEffect(() => {
    if (isDropdownOpen && searchQuery.trim().length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };

    if (isDropdownOpen && searchQuery.trim().length > 0) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
    if (searchQuery.trim().length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const liveSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const matchSearch =
        !appliedSearch ||
        p.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(appliedSearch.toLowerCase());
      return matchSearch;
    });
  }, [appliedSearch]);

  return (
    <>
      {/* MAIN SITE HEADER */}
      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo" aria-label="İZNİKON Ana Sayfasına Git">
            <img src="/logo.png" alt="İZNİKON Logo" className="logo-img" />
          </Link>

          <nav className="main-nav" aria-label="Ana Menü">
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
                zIndex: 40,
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
            <Link href="/iletisim" className="nav-link">
              İletişim &amp; Destek
            </Link>
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
            
            {/* ULTRA-LUXURY HEADER CART WIDGET */}
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
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                whiteSpace: "nowrap"
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

      {/* HERO & SEARCH BAR */}
      <section className="hero" style={{ padding: "2.5rem 0" }}>
        <img src="/hero-bg.jpg" alt="İZNİKON Arka Plan" className="hero-bg" />
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">{currentCategory.name} Kataloğu</h1>
            <p className="hero-subtitle">
              {currentCategory.description}
            </p>

            {/* LIVE SEARCH BAR */}
            <div className="search-wrapper" ref={wrapperRef}>
              <form
                className="search-bar"
                onSubmit={handleSearchSubmit}
                style={{
                  borderColor: searchQuery.trim() ? "#d97706" : "transparent",
                  boxShadow: searchQuery.trim()
                    ? "0 0 35px rgba(217, 119, 6, 0.45), 0 20px 45px -10px rgba(0, 0, 0, 0.4)"
                    : "0 20px 45px -10px rgba(0, 0, 0, 0.4)"
                }}
              >
                <span className="search-icon" style={{ color: searchQuery.trim() ? "#d97706" : "#64748b" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="search-input"
                  placeholder={`${currentCategory.name} içinde ürün adı veya SKU ara... (Örn: matkap, kablo)`}
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setAppliedSearch(val);
                    if (val.trim().length > 0) setIsDropdownOpen(true);
                    else setIsDropdownOpen(false);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
                  }}
                />
                {searchQuery.trim().length > 0 && (
                  <span style={{ fontSize: "0.725rem", fontWeight: "700", background: "#fef3c7", color: "#b45309", padding: "0.25rem 0.6rem", borderRadius: "9999px", whiteSpace: "nowrap" }}>
                    Yazılıyor...
                  </span>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setAppliedSearch(""); setIsDropdownOpen(false); }}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0 0.5rem", fontSize: "1rem" }}
                  >
                    ✕
                  </button>
                )}
                <button type="submit" className="search-button">
                  {searchQuery.trim() ? "CANLI ARA" : "ARA"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 5-COLUMN LIVE SEARCH MODAL WINDOW */}
      {isDropdownOpen && searchQuery.trim().length > 0 && (
        <div
          className="search-modal-backdrop"
          onClick={() => setIsDropdownOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            className="search-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "1350px",
              maxHeight: "88vh",
              borderRadius: "20px",
              boxShadow: "0 30px 90px rgba(0, 0, 0, 0.5)",
              overflowY: "auto",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "680px" }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Pencere içinde canlı aramaya devam edin..."
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      setAppliedSearch(val);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.8rem 1.25rem 0.8rem 3rem",
                      fontSize: "1.05rem",
                      fontWeight: "700",
                      color: "#0f172a",
                      border: "2px solid #d97706",
                      borderRadius: "12px",
                      outline: "none",
                      boxShadow: "0 0 25px rgba(217, 119, 6, 0.25)",
                      background: "#fffbeb"
                    }}
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }}>
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#0f172a" }}>
                    &quot;{searchQuery}&quot; Sonuçları
                  </span>
                  <span style={{ fontSize: "0.775rem", color: "#d97706", fontWeight: "700" }}>
                    {liveSearchResults.length} Ürün Canlı Listeleniyor
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsDropdownOpen(false)}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "0.6rem 1.35rem",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  fontWeight: "800",
                  cursor: "pointer"
                }}
              >
                ✕ PENCEREYİ KAPAT
              </button>
            </div>

            <div className="b2b-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
              {liveSearchResults.map((product) => (
                <div key={product.id} className="b2b-cell" style={{ flexDirection: "column", padding: "1rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "monospace", marginBottom: "0.2rem" }}>
                    {product.code}
                  </div>
                  <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={product.img} alt={product.name} style={{ maxHeight: "50px" }} />
                  </div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", margin: "0.5rem 0" }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "800", color: "#0f172a", marginTop: "auto" }}>
                    {product.price} <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>+KDV</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CATEGORY BODY */}
      <main className="main container">
        {/* CATEGORY SWITCHER PILLS */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", margin: "1.5rem 0 2rem 0" }}>
          <Link
            href="/"
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "700",
              textDecoration: "none",
              background: "#f1f5f9",
              color: "#334155"
            }}
          >
            Tüm Kategoriler
          </Link>
          {Object.entries(categoryDataMap).map(([key, cat]) => (
            <Link
              key={key}
              href={`/kategori/${key}`}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "700",
                textDecoration: "none",
                background: key === slug ? "#0f172a" : "#ffffff",
                color: key === slug ? "white" : "#334155",
                border: key === slug ? "none" : "1px solid #cbd5e1"
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* PRODUCTS GRID */}
        <div className="b2b-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {filtered.map((product) => (
            <div
              key={product.id}
              className="b2b-cell"
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                padding: "1.15rem 1rem",
                background: "#ffffff",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#64748b", fontFamily: "monospace", background: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                  {product.code}
                </span>
                <span style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: "700" }}>
                  Stokta Var
                </span>
              </div>

              <div style={{ textAlign: "center", padding: "0.5rem", background: "#f8fafc", borderRadius: "8px", marginBottom: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                <img src={product.img} alt={product.name} style={{ maxHeight: "64px", maxWidth: "100%", objectFit: "contain" }} />
              </div>

              <div
                className="b2b-cell-title"
                style={{
                  fontSize: "0.825rem",
                  fontWeight: "700",
                  color: "#0f172a",
                  textTransform: "uppercase",
                  lineHeight: "1.3",
                  marginBottom: "0.75rem",
                  minHeight: "2.6em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {product.name}
              </div>

              <div style={{ marginTop: "auto", paddingTop: "0.6rem", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ marginBottom: "0.6rem", textAlign: "left" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>{product.price}</span>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: "600", marginLeft: "4px" }}>+KDV / {product.unit}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="number"
                    defaultValue={1}
                    min={1}
                    style={{
                      width: "46px",
                      height: "34px",
                      textAlign: "center",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontWeight: "700",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={() => addToCart(product, 1)}
                    style={{
                      flex: 1,
                      height: "34px",
                      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.775rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      whiteSpace: "nowrap"
                    }}
                  >
                    + Sepete Ekle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ULTRA-LUXURY FLOATING STICKY QUICK CART WIDGET */}
      <div
        onClick={() => setIsCartOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9990,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "0.65rem 1.35rem 0.65rem 0.85rem",
          borderRadius: "9999px",
          cursor: "pointer",
          boxShadow: "0 15px 40px rgba(0, 0, 0, 0.45), 0 0 25px rgba(217, 119, 6, 0.35)",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          border: "2px solid #d97706",
          backdropFilter: "blur(12px)"
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)", borderRadius: "50%" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#ef4444", color: "white", borderRadius: "9999px", minWidth: "18px", height: "18px", fontSize: "0.68rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", padding: "0 4px", boxShadow: "0 2px 8px rgba(239, 68, 68, 0.6)" }}>
            {itemCount}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "#f59e0b", letterSpacing: "0.06em" }}>SEPETİM</span>
          <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#ffffff", lineHeight: "1.1" }}>₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: "600" }}>+KDV</span></span>
        </div>
      </div>

      {/* ULTRA-PREMIUM B2B FOOTER WITH TANITIMX LOGO */}
      <footer className="footer" style={{ marginTop: "4rem" }}>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/logo.png" alt="İZNİKON Logo" style={{ height: "48px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }} />
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

            <div>
              <h4 className="footer-col-title">Toptan Kategoriler</h4>
              <ul className="footer-links">
                <li><Link href="/kategori/hirdavat">Hırdavat &amp; Cıvata Grubu</Link></li>
                <li><Link href="/kategori/elektrik">Elektrik &amp; Tesisat Ürünleri</Link></li>
                <li><Link href="/kategori/boru">Boru &amp; Profil Grubu</Link></li>
                <li><Link href="/kategori/baglanti">Bağlantı Elemanları &amp; Dübel</Link></li>
                <li><Link href="/kategori/el-aletleri">El Aletleri &amp; Ölçü Cihazları</Link></li>
                <li><Link href="/kategori/kimyasal">Boya &amp; Yapı Kimyasalları</Link></li>
              </ul>
            </div>

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

            <div>
              <h4 className="footer-col-title">E-Bülten &amp; Fiyat Kataloğu</h4>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem", lineHeight: "1.5" }}>
                Yeni toptan fiyat listelerimizden ve haftalık kampanya kataloglarımızdan anında haberdar olun.
              </p>
              <form className="footer-newsletter-form" onSubmit={(e) => { e.preventDefault(); alert("B2B E-Bülten kaydınız tamamlandı!"); }}>
                <input type="email" placeholder="E-posta adresiniz..." className="footer-newsletter-input" required />
                <button type="submit" className="footer-newsletter-btn">Kayıt Ol</button>
              </form>
            </div>
          </div>

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
                borderRadius: "6px"
              }}
            >
              <img
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
