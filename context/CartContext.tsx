"use client";

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { toast } from 'sonner';

export interface CartItem {
  id: string | number;
  name: string;
  code: string;
  price: string;
  numericPrice: number;
  unit: string;
  img: string;
  quantity: number;
  minimumOrderQuantity: number;
  taxRate: number | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: { id: string | number; name: string; code: string; price: string; unit: string; img: string; minimumOrderQuantity?: number; taxRate?: number | null }, qty?: number) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, qty: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  subtotal: number;
  vatAmount: number | null;
  total: number;
  itemCount: number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "iznikon_b2b_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on client mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            setCart(parsed.map((item) => ({ ...item, minimumOrderQuantity: Math.max(1, Number(item.minimumOrderQuantity) || 1), taxRate: Number.isFinite(Number(item.taxRate)) ? Number(item.taxRate) : null })));
          }
        }
      } catch (error) {
        console.error("Failed to load cart from localStorage", error);
      } finally {
        setIsHydrated(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Save cart to localStorage whenever cart state updates
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (e) {
        console.error("Failed to save cart to localStorage", e);
      }
    }
  }, [cart, isHydrated]);

  // Helper to parse numeric price from string like "₺145,00"
  const parsePrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  // Add to cart without opening popup drawer
  const addToCart = (product: { id: string | number; name: string; code: string; price: string; unit: string; img: string; minimumOrderQuantity?: number; taxRate?: number | null }, qty?: number) => {
    const numPrice = parsePrice(product.price);
    const minimumOrderQuantity = Math.max(1, Math.trunc(product.minimumOrderQuantity ?? 1));
    const requestedQuantity = Math.max(minimumOrderQuantity, Math.trunc(qty ?? minimumOrderQuantity));
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity = Math.max(minimumOrderQuantity, updated[existingIndex].quantity + requestedQuantity);
        updated[existingIndex].minimumOrderQuantity = minimumOrderQuantity;
        updated[existingIndex].taxRate = product.taxRate ?? null;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            code: product.code,
            price: product.price,
            numericPrice: numPrice,
            unit: product.unit,
            img: product.img,
            quantity: requestedQuantity,
            minimumOrderQuantity,
            taxRate: product.taxRate ?? null,
          }
        ];
      }
    });
    toast.success('Ürün sepete eklendi.');
    // DO NOT trigger popup drawer automatically as requested!
  };

  const removeFromCart = (productId: string | number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string | number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => prev.map((item) => {
      if (item.id !== productId) return item;
      if (qty < item.minimumOrderQuantity) {
        toast.error(`Bu ürün için minimum sipariş adedi ${item.minimumOrderQuantity}'tir.`);
        return item;
      }
      return { ...item, quantity: qty };
    }));
  };

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.numericPrice * item.quantity, 0);
  // Storefront prices are KDV dahil; checkout recalculates the authoritative total on the server.
  const total = subtotal;
  const vatAmount = cart.every((item) => item.taxRate != null)
    ? cart.reduce((sum, item) => {
        const lineTotal = item.numericPrice * item.quantity;
        return sum + lineTotal - (lineTotal / (1 + (item.taxRate ?? 0) / 100));
      }, 0)
    : null;
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        subtotal,
        vatAmount,
        total,
        itemCount,
        isHydrated
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
