'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface NotificationBellProps {
  onOpenNotifications: () => void;
}

export default function NotificationBell({ onOpenNotifications }: NotificationBellProps) {
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const initRef = useRef(false);

  const loadUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const resp = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) {
      console.error('[NotificationBell] Unread count failed:', e);
    }
  }, []);

  const subscribePush = async () => {
    try {
      if ((window as any).Notification?.permission === 'denied') return;

      const reg = await navigator.serviceWorker.ready;
      const token = localStorage.getItem('token');
      if (!token) return;

      const vapidResp = await fetch('/api/notifications/vapid-public-key', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!vapidResp.ok) return;

      const { publicKey } = await vapidResp.json() as { publicKey: string };
      if (!publicKey) return;

      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });
      }

      const sub = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        }),
      });
    } catch (e) {
      console.error('[NotificationBell] Push subscribe failed:', e);
    }
  };

  const init = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await loadUnreadCount();
    } catch (e) {
      console.error('[NotificationBell] Init failed:', e);
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
      subscribePush();
    }
  }, [loadUnreadCount]);

  useEffect(() => {
    setMounted(true);
    if (initRef.current) return;
    initRef.current = true;
    init();
  }, [init]);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.serviceWorker) return;

    navigator.serviceWorker.ready.then(() => {
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        const data = event.data;
        if (data && typeof data === 'object' && data.type === 'NOTIFICATION_CLICK' && data.url) {
          window.location.href = data.url;
        }
      });
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return (
    <button
      onClick={onOpenNotifications}
      className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      title="Thông báo"
      type="button"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {mounted && unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 ring-2 ring-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
