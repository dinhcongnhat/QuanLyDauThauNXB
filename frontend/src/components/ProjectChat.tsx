'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useChatSocket, ChatMessage } from '@/lib/chat-socket';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { OnlyOfficeFilePreview } from '@/components/OnlyOfficeFilePreview';

interface ProjectChatProps {
  projectId: string;
  module?: string;
  projectName?: string;
}

export function ProjectChat({ projectId, module, projectName }: ProjectChatProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activePreviewFile, setActivePreviewFile] = useState<{ path: string; name: string } | null>(null);
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  const { isConnected, sendMessage: wsSendMessage, emitTyping, typingUsers, setOnMessage } = useChatSocket(
    isOpen ? projectId : null,
  );

  // Handle incoming messages via WebSocket
  const handleNewMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    if (!isOpen && msg.userId !== user?.id) {
      setUnreadCount(prev => prev + 1);
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    setOnMessage(handleNewMessage);
  }, [setOnMessage, handleNewMessage]);

  // Load messages when chat opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadMessages();
      setUnreadCount(0);
    }
  }, [isOpen, projectId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: isFirstLoad.current ? 'auto' : 'smooth' });
      isFirstLoad.current = false;
    }
  }, [messages, isOpen]);

  const loadMessages = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await api.getChatMessages(projectId, module, cursor);
      if (cursor) {
        setMessages(prev => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
        isFirstLoad.current = true;
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      toast.error('Không thể tải tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    // Send via WebSocket for real-time
    wsSendMessage(text, module);

    // Also send via REST as backup
    try {
      await api.sendChatMessage(projectId, text, module);
    } catch (err) {
      // WebSocket already sent it
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      // Emit typing
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => emitTyping(), 300);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploadChatFile(projectId, file);
      const isImage = result.fileType.startsWith('image/');
      const type = isImage ? 'IMAGE' : 'FILE';
      await api.sendChatMessage(
        projectId,
        result.fileName,
        module,
        type,
        result.fileUrl,
        result.fileName,
        result.fileType,
      );
    } catch (err: any) {
      toast.error('Tải file thất bại');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const loadMore = () => {
    if (nextCursor && !loading) {
      loadMessages(nextCursor);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isMe = msg.userId === user?.id;
    const time = format(new Date(msg.createdAt), 'HH:mm', { locale: vi });
    const initial = msg.user.name?.charAt(0)?.toUpperCase() || '?';

    const handleFileClick = (msg: ChatMessage) => {
      if (!msg.fileUrl) return;
      const url = msg.fileUrl;
      const filename = msg.fileName || '';
      const ext = filename.split('.').pop()?.toLowerCase();
      
      if (ext && ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
        const objectPath = url.replace(/^\/qldanxb\//, '');
        setActivePreviewFile({ path: objectPath, name: filename });
      } else {
        window.open(url, '_blank');
      }
    };

    return (
      <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {!isMe && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
        )}

        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
          {!isMe && (
            <span className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.user.name}</span>
          )}
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              isMe
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}
          >
            {msg.type === 'IMAGE' && msg.fileUrl && (
              <div className="mb-1.5">
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName || 'Image'}
                  className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveImagePreview(msg.fileUrl!)}
                />
              </div>
            )}
            {msg.type === 'FILE' && msg.fileUrl && (
              <button
                type="button"
                onClick={() => handleFileClick(msg)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg mb-1.5 text-left ${
                  isMe ? 'bg-blue-500/30 hover:bg-blue-500/40 text-white' : 'bg-white hover:bg-gray-50 border text-gray-800'
                } transition-colors`}
              >
                <span className="text-lg">
                  {msg.fileType?.includes('pdf') ? '📄' :
                   msg.fileType?.includes('word') || msg.fileType?.includes('document') ? '📝' :
                   msg.fileType?.includes('sheet') || msg.fileType?.includes('excel') ? '📊' :
                   msg.fileType?.includes('presentation') || msg.fileType?.includes('powerpoint') ? '📊' : '📎'}
                </span>
                <span className="text-xs truncate">{msg.fileName}</span>
              </button>
            )}
            {msg.type === 'TEXT' && <span className="whitespace-pre-wrap break-words">{msg.content}</span>}
            {msg.type !== 'TEXT' && msg.content !== msg.fileName && (
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
            )}
          </div>
          <span className={`text-[10px] text-gray-400 mt-0.5 px-1 ${isMe ? 'text-right' : ''}`}>{time}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="Thảo luận dự án"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">💬 Thảo luận</h3>
                  <p className="text-[11px] text-blue-100 truncate">
                    {projectName || 'Dự án'}
                    {module && ` · ${module.replace(/_/g, ' ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isConnected && (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Đã kết nối" />
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                style={{ overscrollBehavior: 'contain' }}
              >
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Đang tải...' : '↑ Tải thêm tin nhắn cũ'}
                    </button>
                  </div>
                )}

                {loading && messages.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                    <p className="text-sm">Chưa có tin nhắn</p>
                    <p className="text-xs">Bắt đầu thảo luận dự án!</p>
                  </div>
                )}

                {messages.map(renderMessage)}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Đang gõ...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t bg-white px-3 py-2.5 shrink-0">
                <div className="flex items-end gap-2">
                  {/* File attach */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    title="Đính kèm file"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                      </svg>
                    )}
                  </button>

                  {/* Text input */}
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    rows={1}
                    className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 max-h-24 transition-all"
                    style={{ minHeight: '38px' }}
                  />

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Image Lightbox Preview */}
      <AnimatePresence>
        {activeImagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]"
            onClick={() => setActiveImagePreview(null)}
          >
            <button
              onClick={() => setActiveImagePreview(null)}
              className="absolute top-5 right-5 text-white hover:text-gray-300 text-3xl font-bold z-[71]"
            >
              &times;
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={activeImagePreview}
              alt="Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* OnlyOffice Document Preview */}
      <AnimatePresence>
        {activePreviewFile && (
          <OnlyOfficeFilePreview
            objectPath={activePreviewFile.path}
            onClose={() => setActivePreviewFile(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
