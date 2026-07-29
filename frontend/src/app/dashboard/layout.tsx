'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationPanel from '@/components/NotificationPanel';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, hydrate, setUser, logout } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading || !user) return;

    let cancelled = false;
    api
      .getProfile()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        if (!cancelled) {
          logout();
          router.replace('/login');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user?.id, logout, router, setUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar onOpenNotifications={() => setNotifOpen(true)} />
      <main className="relative h-screen min-w-0 flex-1 overflow-y-auto bg-[#f5f7fb] px-3 py-4 sm:px-4 lg:px-5 lg:py-5 xl:px-6 2xl:px-10 2xl:py-8">
        {/* Brand watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none fixed inset-0 flex flex-col items-center justify-center"
          style={{ left: 'clamp(244px, 18vw, 272px)', zIndex: 0 }}
        >
          <img
            src="/logo.png"
            alt=""
            style={{
              width: '280px',
              height: '280px',
              objectFit: 'contain',
              opacity: 0.035,
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
              opacity: 0.05,
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
            className="mx-auto w-full max-w-[1800px]"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
