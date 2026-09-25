import type { Metadata, Viewport } from 'next';
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
  description: 'Hệ thống quản lý quy trình đấu thầu nội bộ của Nhà xuất bản Chính trị quốc gia Sự thật',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#8B1E24',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={vietnameseFont.variable}>
      <body className="bg-[#F7F7F8] font-sans text-[#1F2328] antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              border: '1px solid #E4E7EC',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(16, 24, 40, 0.10)',
              color: '#1F2328',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#287A4B', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#B42318', secondary: '#FFFFFF' } },
          }}
        />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
