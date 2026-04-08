import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'QLĐT - Hệ thống Quản lý Đấu thầu',
  description: 'Hệ thống quản lý quy trình đấu thầu mua sắm',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
