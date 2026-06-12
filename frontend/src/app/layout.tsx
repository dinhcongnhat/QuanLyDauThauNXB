import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'QLĐT - Hệ thống Quản lý Đấu thầu',
  description: 'Hệ thống quản lý quy trình đấu thầu mua sắm',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  themeColor: '#ea580c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased text-slate-800 bg-[#f8fafc]">
        <Toaster position="top-right" />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
