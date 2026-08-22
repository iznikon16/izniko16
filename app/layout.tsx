import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";
import CartDrawer from "../components/CartDrawer";
import { Toaster } from 'sonner';

const inter = Inter({
  variable: "--font-inter",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <CartProvider>
          {children}
          <CartDrawer />
          <Toaster position="top-right" richColors />
        </CartProvider>
      </body>
    </html>
  );
}
