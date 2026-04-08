'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}/notifications`
  : '/notifications';

export function useSocket(onDocumentUpdate?: (data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    if (onDocumentUpdate) {
      socket.on('document:updated', onDocumentUpdate);
    }

    socketRef.current = socket;
  }, [onDocumentUpdate]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return socketRef;
}
