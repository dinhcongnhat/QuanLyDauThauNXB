'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { NotificationEvent } from '@/lib/socket';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale/vi';
import { useRouter } from 'next/navigation';

const typeIcons: Record<string, { icon: JSX.Element }> = {
  DOC_APPROVED: { icon: <span className="w-5 h-5 text-green-500">✓</span> },
  DOC_REJECTED: { icon: <span className="w-5 h-5 text-red-500">✕</span> },
  DOC_SUBMITTED: { icon: <span className="w-5 h-5 text-blue-500">↑</span> },
  GDN_APPROVED: { icon: <span className="w-5 h-5 text-green-500">✓</span> },
  PCDI_APPROVED: { icon: <span className="w-5 h-5 text-green-500">✓</span> },
  QD_APPROVED: { icon: <span className="w-5 h-5 text-green-500">✓</span> },
  STEP_APPROVED: { icon: <span className="w-5 h-5 text-green-500">✓</span> },
  STEP_REJECTED: { icon: <span className="w-5 h-5 text-red-500">✕</span> },
  STEP_PENDING_APPROVAL: { icon: <span className="w-5 h-5 text-orange-500">⏳</span> },
  STEP_COMPLETED: { icon: <span className="w-5 h-5 text-purple-500">✓</span> },
  PAYMENT_CREATED: { icon: <span className="w-5 h-5 text-blue-500">$</span> },
  PAYMENT_COMPLETED: { icon: <span className="w-5 h-5 text-green-500">$</span> },
  BID_RESULT: { icon: <span className="w-5 h-5 text-yellow-500">★</span> },
  ASSIGNMENT: { icon: <span className="w-5 h-5 text-orange-500">👤</span> },
  PROJECT_COMPLETED: { icon: <span className="w-5 h-5 text-green-500">🏠</span> },
  SYSTEM: { icon: <span className="w-5 h-5 text-gray-500">ℹ</span> },
};

function groupByDate(notifications: NotificationEvent[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationEvent[] }[] = [
    { label: 'Hôm nay', items: [] },
    { label: 'Hôm qua', items: [] },
    { label: 'Trước đó', items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      groups[0].items.push(n);
    } else if (d.getTime() === yesterday.getTime()) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }
  return groups.filter((g) => g.items.length > 0);
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const loadNotifications = useCallback(async (reset = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/notifications?page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('[NotificationPanel] Load failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      console.error('[NotificationPanel] Unread count failed:', e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadUnreadCount();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, loadNotifications, loadUnreadCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('[NotificationPanel] Mark read failed:', e);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('[NotificationPanel] Mark all read failed:', e);
    }
  };

  const handleNotificationClick = async (notification: NotificationEvent) => {
    if (!notification.isRead) {
      await handleMarkRead(notification.id);
    }
    if (notification.link) {
      onClose();
      router.push(notification.link);
    }
  };

  const groups = groupByDate(notifications);
  const hasNotifications = notifications && notifications.length > 0;
  const isEmpty = !isLoading && (!hasNotifications || notifications.length === 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Thông báo</h2>
          <div className="flex items-center gap-2">
            {hasNotifications && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && !hasNotifications ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
              <p className="text-sm">Đang tải thông báo...</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">Không có thông báo nào</p>
              <p className="text-xs mt-1 text-gray-300">Bạn sẽ nhận thông báo khi có cập nhật</p>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {group.label}
                  </div>
                  {group.items.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {typeIcons[notification.type]?.icon || typeIcons.SYSTEM.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
