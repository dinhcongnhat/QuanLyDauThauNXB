'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Sidebar } from '@/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 overflow-auto relative">
        {/* Brand watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none fixed inset-0 flex flex-col items-center justify-center"
          style={{ left: '256px', zIndex: 0 }}
        >
          <img
            src="/logo.png"
            alt=""
            style={{
              width: '280px',
              height: '280px',
              objectFit: 'contain',
              opacity: 0.09,
              filter: 'blur(0.5px) grayscale(10%)',
              userSelect: 'none',
            }}
          />
          <p
            style={{
              marginTop: '12px',
              fontSize: '16px',
              fontWeight: 700,
              color: '#8B0000',
              opacity: 0.12,
              filter: 'blur(0.4px)',
              letterSpacing: '1.5px',
              textAlign: 'center',
              userSelect: 'none',
              lineHeight: 1.3,
            }}
          >
            NHÀ XUẤT BẢN CHÍNH TRỊ QUỐC GIA SỰ THẬT
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
