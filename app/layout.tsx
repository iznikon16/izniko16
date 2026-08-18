import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";
import CartDrawer from "../components/CartDrawer";
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "İZNİKON - Nalbur & Hırdavat Toptancısı",
  description: "İznikon Nalbur ve Hırdavat Toptan Satış Platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          {children}
          <CartDrawer />
          <Toaster position="top-right" richColors />
        </CartProvider>
      </body>
    </html>
  );
}
