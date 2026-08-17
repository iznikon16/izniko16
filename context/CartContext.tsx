"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: number;
  name: string;
  code: string;
  price: string;
  numericPrice: number;
  unit: string;
  img: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: { id: number; name: string; code: string; price: string; unit: string; img: string }, qty?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  subtotal: number;
  vatAmount: number;
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
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    } finally {
      setIsHydrated(true);
    }
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
  const addToCart = (product: { id: number; name: string; code: string; price: string; unit: string; img: string }, qty: number = 1) => {
    const numPrice = parsePrice(product.price);
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += qty;
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
            quantity: qty
          }
        ];
      }
    });
    // DO NOT trigger popup drawer automatically as requested!
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.numericPrice * item.quantity, 0);
  const vatAmount = subtotal * 0.20; // 20% KDV
  const total = subtotal + vatAmount;
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
