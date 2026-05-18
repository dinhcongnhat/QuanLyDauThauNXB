'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}/notifications`
  : '/notifications';

export interface NotificationEvent {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

type UnreadCountHandler = (count: number) => void;
type NotificationHandler = (notification: NotificationEvent) => void;

export function useSocket(
  onNotification?: NotificationHandler,
  onUnreadCount?: UnreadCountHandler,
  onDocumentUpdate?: (data: any) => void,
) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
    });

    if (onNotification) {
      socket.on('notification', onNotification);
    }

    if (onUnreadCount) {
      socket.on('unread-count', onUnreadCount);
    }

    if (onDocumentUpdate) {
      socket.on('document:updated', onDocumentUpdate);
    }

    socketRef.current = socket;
  }, [onNotification, onUnreadCount, onDocumentUpdate]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return socketRef;
}
