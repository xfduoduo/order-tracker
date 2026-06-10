import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Viewport } from "next";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "订单追踪系统",
  description: "客户销售订单智能表格",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 flex flex-col">
        <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6 shadow-sm">
          <Link href="/" className="font-bold text-lg text-gray-800 hover:text-blue-600">
            📊 订单追踪
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">
            订单表格
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">
            仪表盘
          </Link>
        </nav>
        <main className="flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
