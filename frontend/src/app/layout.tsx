import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { Be_Vietnam_Pro } from 'next/font/google';

const vietnameseFont = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-vietnamese',
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
    <html lang="vi" className={vietnameseFont.variable}>
      <body className="font-sans antialiased text-slate-800 bg-[#f8fafc]">
        <Toaster position="top-right" />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
