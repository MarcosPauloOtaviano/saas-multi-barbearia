import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DemoProvider } from "@/components/demo-provider";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Barbearia Stilo Sampa — Agende seu horário",
  description: "Agende seu corte, acompanhe seus horários e cuide do seu estilo pelo celular.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><DemoProvider><PwaRegistration />{children}</DemoProvider></body>
    </html>
  );
}
