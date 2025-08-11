

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SupervIA",
  description: "Supervision intelligente • Dashboards • Zabbix",
};

import StoreProvider from "./StoreProvider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import ClientAppShell from "../components/layout/ClientAppShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // client component wrapper for sidebar state
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StoreProvider>
          <ThemeProvider>
            <ClientAppShell>{children}</ClientAppShell>
            <Toaster />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
