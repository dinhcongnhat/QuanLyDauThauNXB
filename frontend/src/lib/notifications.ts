'use client';

import { create } from 'zustand';
import { api } from './api';
import type { NotificationEvent } from './socket';

interface NotificationState {
  notifications: NotificationEvent[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: NotificationEvent) => void;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  setUnreadCount: (count) => set({ unreadCount: count }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  fetchNotifications: async (reset = false) => {
    const page = reset ? 1 : get().page;
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const data = await api.getNotifications(page);
      set((state) => ({
        notifications: reset ? data.notifications : [...state.notifications, ...data.notifications],
        hasMore: page < data.totalPages,
        page: page + 1,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await api.getUnreadCount();
      set({ unreadCount: data.count });
    } catch {
      // silent fail
    }
  },

  markRead: async (id) => {
    try {
      await api.markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silent fail
    }
  },

  markAllRead: async () => {
    try {
      await api.markAllNotificationsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent fail
    }
  },
}));
