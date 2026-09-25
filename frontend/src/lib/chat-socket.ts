'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/chat`
    : '/chat';

export interface ChatAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: 'IMAGE' | 'VIDEO' | 'OFFICE' | 'PDF' | 'FILE';
  url: string;
}

export interface ChatMention {
  userId: string;
  start: number;
  length: number;
  label: string;
}

export interface ChatReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface ReactionUpdate {
  projectId: string;
  messageId: string;
  reactions: ChatReaction[];
}

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  clientMessageId?: string;
  content: string;
  type: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  module?: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  mentions?: ChatMention[];
  reactions?: ChatReaction[];
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    position?: string;
  };
}

export interface TypingUser {
  projectId: string;
  userId: string;
  name: string;
}

export interface SendMessagePayload {
  content: string;
  clientMessageId: string;
  attachmentId?: string;
  mentions?: ChatMention[];
}

export function useChatSocket(projectIds: string[]) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onMessageRef = useRef<((message: ChatMessage) => void) | null>(null);
  const onReactionRef = useRef<((update: ReactionUpdate) => void) | null>(null);
  const subscriptionKey = useMemo(
    () => Array.from(new Set(projectIds)).sort().join(','),
    [projectIds],
  );

  const setOnMessage = useCallback(
    (handler: (message: ChatMessage) => void) => {
      onMessageRef.current = handler;
    },
    [],
  );

  const setOnReaction = useCallback(
    (handler: (update: ReactionUpdate) => void) => {
      onReactionRef.current = handler;
    },
    [],
  );

  useEffect(() => {
    const subscriptions = subscriptionKey
      .split(',')
      .filter(Boolean);
    if (!subscriptions.length) {
      setIsConnected(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(false);
      socket.timeout(7000).emit(
        'chat:join-many',
        { projectIds: subscriptions },
        (
          error: Error | null,
          response?: { ok?: boolean; message?: string },
        ) => {
          if (error || !response?.ok) {
            setIsConnected(false);
            return;
          }
          setIsConnected(true);
        },
      );
    });
    socket.on('connect_error', () => setIsConnected(false));
    socket.on('disconnect', () => {
      setIsConnected(false);
      setTypingUsers([]);
    });
    socket.on('message:new', (message: ChatMessage) => {
      onMessageRef.current?.(message);
    });
    socket.on('reaction:update', (update: ReactionUpdate) => {
      onReactionRef.current?.(update);
    });
    socket.on('typing:start', (typingUser: TypingUser) => {
      const timerKey = `${typingUser.projectId}:${typingUser.userId}`;
      setTypingUsers((current) => [
        ...current.filter(
          (item) =>
            item.userId !== typingUser.userId
            || item.projectId !== typingUser.projectId,
        ),
        typingUser,
      ]);
      if (typingTimers.current[timerKey]) {
        clearTimeout(typingTimers.current[timerKey]);
      }
      typingTimers.current[timerKey] = setTimeout(() => {
        setTypingUsers((current) =>
          current.filter(
            (item) =>
              item.userId !== typingUser.userId
              || item.projectId !== typingUser.projectId,
          ),
        );
      }, 3000);
    });
    socket.on('typing:stop', (typingUser: TypingUser) => {
      const timerKey = `${typingUser.projectId}:${typingUser.userId}`;
      if (typingTimers.current[timerKey]) {
        clearTimeout(typingTimers.current[timerKey]);
      }
      setTypingUsers((current) =>
        current.filter(
          (item) =>
            item.userId !== typingUser.userId
            || item.projectId !== typingUser.projectId,
        ),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
    };
  }, [subscriptionKey]);

  const sendMessage = useCallback(
    (projectId: string, payload: SendMessagePayload) =>
      new Promise<ChatMessage | null>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket?.connected || !isConnected || !projectId) {
          resolve(null);
          return;
        }
        socket.timeout(7000).emit(
          'message:send',
          { projectId, ...payload },
          (error: Error | null, response: ChatMessage) => {
            if (error) reject(error);
            else resolve(response);
          },
        );
      }),
    [isConnected],
  );

  const startTyping = useCallback((projectId: string) => {
    if (!isConnected || !projectId) return;
    socketRef.current?.emit('typing:start', { projectId });
  }, [isConnected]);

  const stopTyping = useCallback((projectId: string) => {
    if (!projectId) return;
    socketRef.current?.emit('typing:stop', { projectId });
  }, []);

  const toggleReaction = useCallback(
    (projectId: string, messageId: string, emoji: string) =>
      new Promise<ReactionUpdate | null>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket?.connected || !isConnected || !projectId) {
          resolve(null);
          return;
        }
        socket.timeout(7000).emit(
          'reaction:toggle',
          { projectId, messageId, emoji },
          (error: Error | null, response: ReactionUpdate) => {
            if (error) reject(error);
            else resolve(response);
          },
        );
      }),
    [isConnected],
  );

  return {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    typingUsers,
    setOnMessage,
    setOnReaction,
    toggleReaction,
  };
}
