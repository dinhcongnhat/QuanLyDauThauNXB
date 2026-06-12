'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}/chat`
  : '/chat';

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  type: string; // TEXT, FILE, IMAGE
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  module?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
  };
}

export function useChatSocket(projectId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const onMessageRef = useRef<((msg: ChatMessage) => void) | null>(null);

  const setOnMessage = useCallback((handler: (msg: ChatMessage) => void) => {
    onMessageRef.current = handler;
  }, []);

  const connect = useCallback(() => {
    if (!projectId) return;
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
      setIsConnected(true);
      socket.emit('join-project', { projectId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Chat] WebSocket connection error:', err.message);
    });

    socket.on('new-message', (msg: ChatMessage) => {
      if (onMessageRef.current) {
        onMessageRef.current(msg);
      }
    });

    socket.on('user-typing', (data: { userId: string }) => {
      setTypingUsers(prev => {
        if (prev.includes(data.userId)) return prev;
        return [...prev, data.userId];
      });

      // Clear typing after 3 seconds
      if (typingTimers.current[data.userId]) {
        clearTimeout(typingTimers.current[data.userId]);
      }
      typingTimers.current[data.userId] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }, 3000);
    });

    socketRef.current = socket;
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        if (projectId) {
          socketRef.current.emit('leave-project', { projectId });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      // Clear typing timers
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
    };
  }, [connect, projectId]);

  const sendMessage = useCallback((content: string, module?: string) => {
    if (!socketRef.current || !projectId) return;
    socketRef.current.emit('send-message', { projectId, content, module });
  }, [projectId]);

  const emitTyping = useCallback(() => {
    if (!socketRef.current || !projectId) return;
    socketRef.current.emit('typing', { projectId });
  }, [projectId]);

  return {
    isConnected,
    sendMessage,
    emitTyping,
    typingUsers,
    setOnMessage,
  };
}
