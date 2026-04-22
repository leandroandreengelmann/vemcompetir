import type { Metadata } from "next";
import { Inter, Bangers } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bangers = Bangers({
  variable: "--font-bangers",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COMPETIR",
  description: "Plataforma de competições",
};

import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/CookieBanner";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { ConfirmDialogHost } from "@/components/panel/ConfirmDialog";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${bangers.variable} antialiased font-sans`} suppressHydrationWarning>
        {children}
        <CookieBanner />
        <WhatsAppFloatingButton />
        <Toaster position="top-right" />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
