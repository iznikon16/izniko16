"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import { SafeImage } from '@/components/ui/safe-image';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    vatAmount,
    total,
    itemCount
  } = useCart();

  if (!isCartOpen) return null;

  // Format currency
  const formatCurrency = (amount: number) => {
    return "₺" + amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={() => setIsCartOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "100%",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 40px rgba(0,0,0,0.3)",
          animation: "slideInRight 0.25s ease-out"
        }}
      >
        {/* DRAWER HEADER */}
        <div style={{ background: "#0f172a", color: "white", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {itemCount > 0 && (
                <span style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.7rem", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {itemCount}
                </span>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", margin: 0, color: "white" }}>Sepetim</h3>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{itemCount} çeşit ürün eklendi</span>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "white", borderRadius: "8px", width: "32px", height: "32px", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* CART ITEMS LIST */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1rem" }}>
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <h4 style={{ fontSize: "1.1rem", color: "#0f172a", marginBottom: "0.5rem" }}>Sepetiniz Henüz Boş</h4>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>Ürün listesinden sepete ürün ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "0.875rem",
                    padding: "0.875rem",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    alignItems: "center"
                  }}
                >
                  <SafeImage src={item.img} alt={item.name} style={{ width: "52px", height: "52px", objectFit: "contain", background: "white", borderRadius: "8px", padding: "4px", border: "1px solid #f1f5f9" }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#64748b", fontWeight: "700" }}>{item.code}</div>
                    <div style={{ fontSize: "0.825rem", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", lineHeight: "1.25", margin: "0.15rem 0 0.4rem 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {/* STEPPER */}
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white", overflow: "hidden" }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ width: "26px", height: "26px", border: "none", background: "#f1f5f9", fontWeight: "800", cursor: "pointer", color: "#0f172a" }}
                        >
                          -
                        </button>
                        <span style={{ width: "32px", textAlign: "center", fontSize: "0.85rem", fontWeight: "800", color: "#0f172a" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ width: "26px", height: "26px", border: "none", background: "#f1f5f9", fontWeight: "800", cursor: "pointer", color: "#0f172a" }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#0f172a" }}>
                        {formatCurrency(item.numericPrice * item.quantity)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    title="Sil"
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DRAWER FOOTER SUMMARY */}
        {cart.length > 0 && (
          <div style={{ borderTop: "2px solid #f1f5f9", padding: "1.25rem", background: "#ffffff" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#64748b" }}>
                <span>Ara Toplam:</span>
                <strong style={{ color: "#0f172a" }}>{formatCurrency(subtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#64748b" }}>
                <span>KDV (%20):</span>
                <strong style={{ color: "#0f172a" }}>{formatCurrency(vatAmount)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", paddingTop: "0.5rem", borderTop: "1px stroke #e2e8f0" }}>
                <span>Genel Toplam:</span>
                <span style={{ color: "#d97706" }}>{formatCurrency(total)}</span>
              </div>
            </div>

            <Link
              href="/sepet"
              onClick={() => setIsCartOpen(false)}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "white",
                borderRadius: "10px",
                fontWeight: "800",
                fontSize: "1rem",
                textDecoration: "none",
                textAlign: "center",
                display: "block",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.3)"
              }}
            >
              Siparişi Tamamla &rsaquo;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
