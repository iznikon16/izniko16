"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";

interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  code: string;
  price: string;
  unit: string;
  img: string;
  tags: string[];
  inStock: boolean;
  boxQty: string;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "İznikon Paslanmaz Çelik Şerit Metre 5m x 19mm",
    category: "Ölçü Aletleri",
    brand: "İznikon",
    code: "IZN-M50",
    price: "₺145,00",
    unit: "Adet",
    boxQty: "1 Kutu = 12 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z'/><circle cx='7.5' cy='7.5' r='1.5' fill='%23d97706'/></svg>",
    tags: ["metre", "serit", "olcu", "paslanmaz", "5m"],
    inStock: true
  },
  {
    id: 2,
    name: "İznikon Profesyonel Darbeli Matkap 850W Dual-Speed",
    category: "Elektrikli El Aletleri",
    brand: "İznikon",
    code: "IZN-M850",
    price: "₺1.850,00",
    unit: "Adet",
    boxQty: "1 Koli = 4 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.9 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'/><path d='m8 13 4 4' stroke='%23d97706'/></svg>",
    tags: ["matkap", "darbeli", "elektrikli", "delme", "850w"],
    inStock: true
  },
  {
    id: 3,
    name: "YB Çelik Altıköşe Somunlu Cıvata M8x50mm",
    category: "Bağlantı Elemanları",
    brand: "YB Cıvata",
    code: "YB-850",
    price: "₺320,00",
    unit: "Kutu",
    boxQty: "1 Kutu = 100 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2v20'/><path d='m17 7-5-5-5 5'/><path d='m17 17-5 5-5-5'/></svg>",
    tags: ["civata", "somun", "m8", "baglanti", "celik", "vida"],
    inStock: true
  },
  {
    id: 4,
    name: "İznikon PPRC Tesisat Plastik Boru 25mm 4 Metre",
    category: "Tesisat & Boru",
    brand: "İznikon",
    code: "IZN-P25",
    price: "₺65,00",
    unit: "Boy",
    boxQty: "1 Bağ = 25 Boy",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2'/><path d='M7 7h10v10H7z' fill='%23d97706' opacity='0.2'/></svg>",
    tags: ["pprc", "boru", "tesisat", "plastik", "su"],
    inStock: true
  },
  {
    id: 5,
    name: "HES NYM Antigron Bakır Elektrik Kablosu 3x2.5mm² (100m Rulo)",
    category: "Elektrik & Aydınlatma",
    brand: "HES Kablo",
    code: "NYM-325",
    price: "₺2.450,00",
    unit: "Rulo",
    boxQty: "1 Koli = 100 Metre",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 3'/></svg>",
    tags: ["kablo", "elektrik", "antigron", "hes", "bakir"],
    inStock: true
  },
  {
    id: 6,
    name: "İznikon Şeffaf Akrilik Silikon Mastik 310ml",
    category: "Kimyasallar & Boya",
    brand: "İznikon",
    code: "IZN-S310",
    price: "₺75,00",
    unit: "Tüp",
    boxQty: "1 Koli = 24 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M19 11 12 2 5 11a7 7 0 1 0 14 0z'/><circle cx='12' cy='13' r='2' fill='%23d97706'/></svg>",
    tags: ["silikon", "mastik", "seffaf", "akrilik", "yapistirici"],
    inStock: true
  },
  {
    id: 7,
    name: "İznikon Ergo Saplı İzoleli Kombine Pense 180mm",
    category: "El Aletleri",
    brand: "İznikon",
    code: "IZN-P180",
    price: "₺185,00",
    unit: "Adet",
    boxQty: "1 Kutu = 6 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9'/><path d='m18 15 4-4'/><path d='m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5'/></svg>",
    tags: ["pense", "kombine", "izoleli", "el aletleri"],
    inStock: true
  },
  {
    id: 8,
    name: "İznikon Avuç Taşlama Makinesi 115mm 750W",
    category: "Elektrikli El Aletleri",
    brand: "İznikon",
    code: "IZN-AT115",
    price: "₺1.290,00",
    unit: "Adet",
    boxQty: "1 Koli = 6 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='3' fill='%230f172a'/></svg>",
    tags: ["taslama", "avuc taslama", "spiral", "elektrikli", "750w"],
    inStock: true
  },
  {
    id: 9,
    name: "Fischer SX Plastik Dübel Seti 8mm (200 Adet)",
    category: "Bağlantı Elemanları",
    brand: "Fischer",
    code: "FSC-SX8",
    price: "₺215,00",
    unit: "Kutu",
    boxQty: "1 Kutu = 200 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='7' y='2' width='10' height='20' rx='2'/><path d='M7 8h10'/><path d='M7 14h10'/></svg>",
    tags: ["dubel", "fischer", "8mm", "baglanti", "vida"],
    inStock: true
  },
  {
    id: 10,
    name: "İznikon Alüminyum Mıknatıslı Su Terazisi 60cm",
    category: "Ölçü Aletleri",
    brand: "İznikon",
    code: "IZN-ST60",
    price: "₺290,00",
    unit: "Adet",
    boxQty: "1 Koli = 10 Adet",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect width='20' height='8' x='2' y='8' rx='2'/><circle cx='12' cy='12' r='2' fill='%23d97706'/></svg>",
    tags: ["su terazisi", "terazi", "terazi 60cm", "olcu", "miknatisli"],
    inStock: true
  },
  {
    id: 11,
    name: "Toptan Nitro Kauçuk Kaplı İş Eldiveni (12 Çift)",
    category: "İş Güvenliği",
    brand: "İznikon",
    code: "IZN-E100",
    price: "₺180,00",
    unit: "Paket",
    boxQty: "1 Paket = 12 Çift",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%23d97706' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0'/><path d='M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6'/><path d='M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8'/><path d='M18 8a2 2 0 0 1 2 2v4a8 8 0 0 1-8 8h-2c-2.5 0-4.5-1.5-5.3-3.8l-1.4-4.2a2 2 0 0 1 1.2-2.5v0a2 2 0 0 1 2.3.9l1.2 2.1'/></svg>",
    tags: ["eldiven", "is eldiveni", "nitril", "kaucuk", "is guvenligi"],
    inStock: true
  },
  {
    id: 12,
    name: "İznikon Cr-V Çelik Lokma Takımı 24 Parça 1/2",
    category: "El Aletleri",
    brand: "İznikon",
    code: "IZN-LK24",
    price: "₺1.450,00",
    unit: "Set",
    boxQty: "1 Çanta = 24 Parça",
    img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='14' x='3' y='6' rx='2'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M12 12v3' stroke='%23d97706'/></svg>",
    tags: ["lokma", "lokma takimi", "anahtar", "el aletleri", "24 parca"],
    inStock: true
  }
];

function normalizeTurkish(str: string): string {
  if (!str) return "";
  return str
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase()
    .trim();
}

export default function Home() {
  const { addToCart, setIsCartOpen, itemCount, subtotal } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"b2b" | "grid">("b2b");
  const [showPrices, setShowPrices] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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

  // Filter products semantically supporting Turkish characters
  const liveSearchResults = useMemo(() => {
    const queryNorm = normalizeTurkish(searchQuery);
    if (!queryNorm) return [];

    const tokens = queryNorm.split(/\s+/).filter(Boolean);

    return SAMPLE_PRODUCTS.filter((product) => {
      const nameNorm = normalizeTurkish(product.name);
      const catNorm = normalizeTurkish(product.category);
      const brandNorm = normalizeTurkish(product.brand);
      const codeNorm = normalizeTurkish(product.code);
      const tagsNorm = product.tags.map(normalizeTurkish).join(" ");

      const combinedText = `${nameNorm} ${catNorm} ${brandNorm} ${codeNorm} ${tagsNorm}`;

      return tokens.every((token) => combinedText.includes(token));
    });
  }, [searchQuery]);

  // Active grid products after submission or empty search
  const gridProducts = useMemo(() => {
    const queryNorm = normalizeTurkish(appliedSearch);
    if (!queryNorm) return SAMPLE_PRODUCTS;

    const tokens = queryNorm.split(/\s+/).filter(Boolean);

    return SAMPLE_PRODUCTS.filter((product) => {
      const nameNorm = normalizeTurkish(product.name);
      const catNorm = normalizeTurkish(product.category);
      const brandNorm = normalizeTurkish(product.brand);
      const codeNorm = normalizeTurkish(product.code);
      const tagsNorm = product.tags.map(normalizeTurkish).join(" ");

      const combinedText = `${nameNorm} ${catNorm} ${brandNorm} ${codeNorm} ${tagsNorm}`;

      return tokens.every((token) => combinedText.includes(token));
    });
  }, [appliedSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchQuery);
    setIsDropdownOpen(false);
  };

  const handleSelectProduct = (productName: string) => {
    setSearchQuery(productName);
    setAppliedSearch(productName);
    setIsDropdownOpen(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setAppliedSearch("");
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="container header-container">
          {/* BRAND LOGO */}
          <a href="#" onClick={clearFilters} className="logo" aria-label="İZNİKON Ana Sayfasına Git">
            <img src="/logo.png" alt="İZNİKON Logo" className="logo-img" />
          </a>

          {/* CENTER NAVIGATION MENU */}
          <nav className="main-nav" aria-label="Ana Menü">
            <Link href="/" className="nav-link active">
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

            <a href="#" onClick={clearFilters} className="nav-link">
              Tüm Ürünler
            </a>
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

          {/* RIGHT ACTION BUTTONS */}
          <div className="header-actions">
            <a href="#" className="nav-link user-orders-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Siparişlerim
            </a>
            <a href="#" className="nav-link btn-login">
              Giriş Yap
            </a>

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

            <Link href="/toptan-musteri-ol" className="btn-b2b">
              Toptan Müşteri Ol
            </Link>
          </div>
        </div>
      </header>

      {/* HERO & SEMANTIC SEARCH ENGINE */}
      <section className="hero">
        <img src="/hero-bg.jpg" alt="İZNİKON Arka Plan" className="hero-bg" />
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">İZNİKON Nalbur &amp; Hırdavat Toptancısı</h1>
            <p className="hero-subtitle">
              Türkiye’nin en hızlı B2B toptan nalbur, cıvata, elektrik ve tesisat ürünleri platformu. 10.000+ çeşit stoklu ürün.
            </p>

            {/* LIVE SEMANTIC SEARCH BAR */}
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
                  placeholder="Ürün adı, marka, ürün kodu (SKU) veya kategori ara... (Örn: matkap, kablo, civata)"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setAppliedSearch(val);
                    if (val.trim().length > 0) {
                      setIsDropdownOpen(true);
                    } else {
                      setIsDropdownOpen(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
                  }}
                />
                {searchQuery.trim().length > 0 && (
                  <span
                    style={{
                      fontSize: "0.725rem",
                      fontWeight: "700",
                      background: "#fef3c7",
                      color: "#b45309",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "9999px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#d97706", display: "inline-block", animation: "pulse 1.2s infinite" }}></span>
                    Yazılıyor...
                  </span>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setAppliedSearch("");
                      setIsDropdownOpen(false);
                    }}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0 0.5rem", fontSize: "1rem" }}
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="search-button"
                  style={{
                    background: searchQuery.trim()
                      ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
                      : "linear-gradient(135deg, #d97706 0%, #eab308 100%)",
                    transform: searchQuery.trim() ? "scale(1.03)" : "none"
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  {searchQuery.trim() ? "CANLI ARA" : "ARA"}
                </button>
              </form>
            </div>

      {/* ULTRA-CLEAR 5-COLUMN LIVE SEARCH MODAL POPUP WINDOW */}
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
            {/* MODAL HEADER WITH LIVE INTERACTIVE INPUT BOX */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "680px" }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Pencere içinde canlı aramaya devam edin... (Örn: matkap, kablo, civata)"
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
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setAppliedSearch(""); }}
                      style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", fontSize: "1.1rem", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  )}
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
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)"
                }}
              >
                ✕ PENCEREYİ KAPAT
              </button>
            </div>

            {/* MODAL 5-COLUMN GRID */}
            {liveSearchResults.length > 0 ? (
              <div className="b2b-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                {liveSearchResults.map((product) => (
                  <div
                    key={product.id}
                    className="b2b-cell"
                    onClick={() => {
                      handleSelectProduct(product.name);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="b2b-cell-img-wrapper">
                      <img src={product.img} alt={product.name} className="b2b-cell-img" />
                    </div>
                    <div className="b2b-cell-info">
                      <div className="b2b-cell-code">{product.code}</div>
                      <div className="b2b-cell-title">{product.name}</div>
                      <div className="b2b-cell-price-row">
                        <span className="b2b-cell-price-val">{product.price}</span>
                        <span className="b2b-cell-unit">+KDV / {product.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#64748b" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                <h3 style={{ fontSize: "1.25rem", color: "#0f172a", marginBottom: "0.5rem" }}>
                  &quot;{searchQuery}&quot; ile eşleşen ürün bulunamadı.
                </h3>
                <p style={{ fontSize: "0.95rem" }}>Lütfen başka bir arama terimi veya stok kodu deneyin.</p>
              </div>
            )}
          </div>
        </div>
      )}

            {/* POPULAR KEYWORD CHIPS */}
            <div className="popular-keywords">
              <span className="popular-title">Hızlı Arama:</span>
              <button className="popular-chip" onClick={() => handleSelectProduct("Matkap")}>
                Matkap
              </button>
              <button className="popular-chip" onClick={() => handleSelectProduct("Kablo")}>
                Kablo
              </button>
              <button className="popular-chip" onClick={() => handleSelectProduct("Cıvata")}>
                Cıvata
              </button>
              <button className="popular-chip" onClick={() => handleSelectProduct("Boru")}>
                Boru
              </button>
              <button className="popular-chip" onClick={() => handleSelectProduct("Silikon")}>
                Silikon
              </button>
              <button className="popular-chip" onClick={() => handleSelectProduct("Pense")}>
                Pense
              </button>
              <button className="popular-chip" onClick={() => handleSelectProduct("Metre")}>
                Metre
              </button>
            </div>
          </div>

          {/* HERO BADGES */}
          <div className="hero-badges">
            <div className="badge">
              <span className="badge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span>
                <span className="badge-title">Orijinal Garanti</span>
                <span className="badge-text">%100 sertifikalı toptan sanayi ürünleri.</span>
              </span>
            </div>
            <div className="badge">
              <span className="badge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                  <path d="M15 18H9" />
                  <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                  <circle cx="17" cy="18" r="2" />
                  <circle cx="7" cy="18" r="2" />
                </svg>
              </span>
              <span>
                <span className="badge-title">Hızlı Teslimat</span>
                <span className="badge-text">Siparişleriniz aynı gün kargoya verilir.</span>
              </span>
            </div>
            <div className="badge">
              <span className="badge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>
                <span className="badge-title">Güvenli Alışveriş</span>
                <span className="badge-text">256 Bit SSL altyapısıyla B2B koruma.</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="main container">
        <div className="main-grid">
          {/* SIDEBAR FILTERS */}
          <aside className="sidebar">
            <div style={{ marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>
              <h2 className="sidebar-title" style={{ fontSize: "1.15rem", margin: "0 0 0.2rem 0" }}>Filtreler &amp; Kategoriler</h2>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", display: "block" }}>10.482 Stoklu Ürün</span>
            </div>

            <ul className="category-list">
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); clearFilters(); }}
                  style={{ fontWeight: !appliedSearch ? "700" : "500", color: !appliedSearch ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span>Tüm Kategoriler</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSearchQuery("hırdavat"); setAppliedSearch("hırdavat"); }}
                  style={{ fontWeight: appliedSearch === "hırdavat" ? "700" : "500", color: appliedSearch === "hırdavat" ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  <span>Hırdavat &amp; Cıvata</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSearchQuery("elektrik"); setAppliedSearch("elektrik"); }}
                  style={{ fontWeight: appliedSearch === "elektrik" ? "700" : "500", color: appliedSearch === "elektrik" ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Elektrik &amp; Tesisat</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSearchQuery("boru"); setAppliedSearch("boru"); }}
                  style={{ fontWeight: appliedSearch === "boru" ? "700" : "500", color: appliedSearch === "boru" ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <span>Boru &amp; Profil</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSearchQuery("bağlantı"); setAppliedSearch("bağlantı"); }}
                  style={{ fontWeight: appliedSearch === "bağlantı" ? "700" : "500", color: appliedSearch === "bağlantı" ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v10" />
                    <path d="M7 12h10" />
                  </svg>
                  <span>Bağlantı Elemanları</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSearchQuery("el aletleri"); setAppliedSearch("el aletleri"); }}
                  style={{ fontWeight: appliedSearch === "el aletleri" ? "700" : "500", color: appliedSearch === "el aletleri" ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 5 4 4" />
                    <path d="M13 7 4 16v3h3l9-9" />
                    <path d="m18 2 4 4-2 2-4-4Z" />
                  </svg>
                  <span>El Aletleri &amp; Garaj</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setSearchQuery("kimyasal"); setAppliedSearch("kimyasal"); }}
                  style={{ fontWeight: appliedSearch === "kimyasal" ? "700" : "500", color: appliedSearch === "kimyasal" ? "#d97706" : "inherit", display: "flex", alignItems: "center", gap: "0.6rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z" />
                    <path d="m5 2 5 5" />
                    <path d="M2 13h15" />
                  </svg>
                  <span>Boya &amp; Kimyasallar</span>
                </a>
              </li>
            </ul>
          </aside>

          {/* MAIN CATALOG AREA */}
          <section>
            {/* CATALOG TOOLBAR */}
            <div className="catalog-toolbar">
              <div className="catalog-stats">
                <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "1.1rem" }}>
                  {appliedSearch ? `"${appliedSearch}" Arama Sonuçları` : "Toptan Ürün Kataloğu"}
                </span>
                <span className="catalog-count-badge">
                  {gridProducts.length} Ürün Gösteriliyor
                </span>
              </div>

              <div className="catalog-controls">
                <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <button
                    onClick={() => setViewMode("b2b")}
                    style={{
                      padding: "0.4rem 0.875rem",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      borderRadius: "6px",
                      border: "none",
                      background: viewMode === "b2b" ? "#0f172a" : "transparent",
                      color: viewMode === "b2b" ? "white" : "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    Toptan Liste Görünümü
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    style={{
                      padding: "0.4rem 0.875rem",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      borderRadius: "6px",
                      border: "none",
                      background: viewMode === "grid" ? "#0f172a" : "transparent",
                      color: viewMode === "grid" ? "white" : "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    Kart Görünümü
                  </button>
                </div>

                <button
                  onClick={() => setShowPrices(!showPrices)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: showPrices ? "#fef3c7" : "#white",
                    color: showPrices ? "#b45309" : "#334155",
                    cursor: "pointer"
                  }}
                >
                  {showPrices ? "Fiyatlar Açık" : "Fiyatları Göster"}
                </button>
                {appliedSearch && (
                  <button
                    onClick={clearFilters}
                    style={{ fontSize: "0.8rem", color: "#d97706", background: "#fef3c7", border: "none", padding: "0.4rem 0.75rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                  >
                    ✕ Aramayı Temizle ({appliedSearch})
                  </button>
                )}
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Sırala:</span>
                <select className="sort-select" defaultValue="popular">
                  <option value="popular">Önerilen (En Çok Satanlar)</option>
                  <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
                  <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
                  <option value="code">Ürün Kodu (A-Z)</option>
                  <option value="stock">Stok Miktarına Göre</option>
                </select>
              </div>
            </div>

            {/* PRODUCTS GRID / B2B MATRIX TABLE VIEW */}
            {viewMode === "b2b" ? (
              <div className="b2b-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                {gridProducts.length > 0 ? (
                  gridProducts.map((product) => (
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
                      {/* CELL TOP: SKU CODE & STOCK STATUS */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#64748b", fontFamily: "monospace", background: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                          {product.code}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: "700" }}>
                          Stokta Var
                        </span>
                      </div>

                      {/* PRODUCT THUMBNAIL */}
                      <div style={{ textAlign: "center", padding: "0.5rem", background: "#f8fafc", borderRadius: "8px", marginBottom: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", height: "80px" }}>
                        <img
                          src={product.img}
                          alt={product.name}
                          style={{ maxHeight: "64px", maxWidth: "100%", objectFit: "contain" }}
                        />
                      </div>

                      {/* PRODUCT TITLE */}
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

                      {/* B2B PRICE & USER-FRIENDLY ORDER CONTROL */}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, 1);
                            }}
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
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="9" cy="21" r="1" />
                              <circle cx="20" cy="21" r="1" />
                              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Sepete Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    Aramanızla eşleşen ürün bulunamadı.
                  </div>
                )}
              </div>
            ) : (
              <div className="products">
                {gridProducts.length > 0 ? (
                  gridProducts.map((product) => (
                    <article key={product.id} className="product-card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.7rem", background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.5rem", borderRadius: "6px", fontWeight: "700" }}>
                          ✓ Stokta Var
                        </span>
                        <button className="favorite-btn" aria-label="Favorilere ekle" style={{ position: "static" }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                          </svg>
                        </button>
                      </div>

                      <div style={{ textAlign: "center", padding: "1.25rem 0.75rem", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: "10px", marginBottom: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", height: "145px" }}>
                        <img
                          className="product-img"
                          src={product.img}
                          alt={product.name}
                          style={{ maxHeight: "115px", maxWidth: "100%", objectFit: "contain" }}
                        />
                      </div>

                      <div className="product-category" style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
                        {product.category}
                      </div>

                      <h3 className="product-title" style={{ fontSize: "0.975rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.75rem", minHeight: "2.8em", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {product.name}
                      </h3>

                      <div style={{ fontSize: "0.775rem", color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "0.5rem 0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Stok Kodu:</span>
                          <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "0.825rem" }}>{product.code}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
                          <span>Toptan Ambalaj:</span>
                          <strong style={{ color: "#0f172a" }}>{product.boxQty}</strong>
                        </div>
                      </div>

                      <div className="product-footer" style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "500" }}>Birim: {product.unit}</span>
                          <div style={{ textAlign: "right" }}>
                            {showPrices ? (
                              <>
                                <span style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a" }}>{product.price}</span>
                                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginLeft: "4px" }}>+KDV</span>
                              </>
                            ) : (
                              <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#0f172a" }}>Fiyatı görmek için giriş yapın</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="number"
                            defaultValue={1}
                            min={1}
                            style={{ width: "56px", height: "40px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: "700", fontSize: "0.95rem", color: "#0f172a", outline: "none" }}
                          />
                          <button
                            className="add-cart"
                            aria-label="Sepete ekle"
                            style={{
                              flex: 1,
                              height: "40px",
                              padding: "0 1rem",
                              fontSize: "0.85rem",
                              fontWeight: "700",
                              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                              cursor: "pointer",
                              whiteSpace: "nowrap"
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="9" cy="21" r="1" />
                              <circle cx="20" cy="21" r="1" />
                              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Sepete Ekle
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3.5rem 1.5rem", color: "#64748b", background: "white", borderRadius: "1rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                    <h3 style={{ fontSize: "1.2rem", color: "#0f172a", marginBottom: "0.5rem" }}>Aramanızla Eşleşen Ürün Bulunamadı</h3>
                    <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Lütfen farklı bir arama kelimesi veya ürün kodu girmeyi deneyin.</p>
                    <button
                      onClick={clearFilters}
                      style={{ background: "#d97706", color: "white", border: "none", padding: "0.6rem 1.25rem", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Tüm Ürünleri Göster
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CATALOG PAGINATION */}
            <div className="pagination-bar">
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Gösterilen: <strong style={{ color: "#0f172a" }}>1 - {gridProducts.length}</strong> / Toplam <strong style={{ color: "#0f172a" }}>10.482</strong> Toptan Ürün (437 Sayfa)
              </div>

              <div className="pagination-pages">
                <button className="page-num disabled">&laquo;</button>
                <button className="page-num disabled">&lsaquo;</button>
                <button className="page-num active">1</button>
                <button className="page-num">2</button>
                <button className="page-num">3</button>
                <button className="page-num">4</button>
                <button className="page-num">5</button>
                <span style={{ padding: "0 0.25rem", color: "#94a3b8" }}>...</span>
                <button className="page-num">437</button>
                <button className="page-num">&rsaquo;</button>
                <button className="page-num">&raquo;</button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
                <span>Sayfa Başına:</span>
                <select className="per-page-select" defaultValue="24">
                  <option value="24">24 Ürün</option>
                  <option value="48">48 Ürün</option>
                  <option value="96">96 Ürün</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* SUPPORT STRIP */}
        <div className="support-strip" style={{ marginTop: "3rem" }}>
          <div className="support-item">
            <span className="support-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
              </svg>
            </span>
            <span>
              <span className="support-title">Destek Merkezi</span>
              <span className="support-text">Hafta içi 09:00 - 18:00</span>
            </span>
          </div>
          <div className="support-item">
            <span className="support-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
              </svg>
            </span>
            <span>
              <span className="support-title">0 (850) 308 16 16</span>
              <span className="support-text">Bizi arayın</span>
            </span>
          </div>
          <div className="support-item">
            <span className="support-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                <rect x="2" y="4" width="20" height="16" rx="2" />
              </svg>
            </span>
            <span>
              <span className="support-title">destek@iznikon.com.tr</span>
              <span className="support-text">Bize yazın</span>
            </span>
          </div>
          <div className="support-item">
            <span className="support-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span>
              <span className="support-title">Güvenli Ödeme</span>
              <span className="support-text">256 Bit SSL ile korunur</span>
            </span>
          </div>
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

      {/* ULTRA-PREMIUM B2B FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            {/* BRAND COLUMN */}
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
