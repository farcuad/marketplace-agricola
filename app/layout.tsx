import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgroMarket Venezuela | Compra y Vende Animales, Tractores y más",
  description:
    "El marketplace agrícola de Venezuela. Compra y vende animales de granja, tractores, herramientas, semillas y fertilizantes. Conecta directamente con vendedores vía WhatsApp.",
  keywords: ["marketplace agrícola", "Venezuela", "animales", "tractores", "herramientas", "semillas", "ganado"],
  openGraph: {
    title: "AgroMarket Venezuela",
    description: "El marketplace agrícola número 1 de Venezuela",
    type: "website",
  },
};

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${outfit.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
