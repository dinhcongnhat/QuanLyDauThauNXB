'use client';

import { OnlyOfficeFilePreview } from '@/components/OnlyOfficeFilePreview';
import {
  ChatAttachment,
  ChatMention,
  ChatMessage,
  ReactionUpdate,
  useChatSocket,
} from '@/lib/chat-socket';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  Download,
  FileText,
  MessageCircle,
  MessagesSquare,
  Paperclip,
  Search,
  Send,
  SmilePlus,
  Users,
  X,
} from 'lucide-react';
import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

interface ChatMember {
  id: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
  projectRole: string;
}

interface ChatConversation {
  projectId: string;
  projectName: string;
  procurementType: string;
  status: string;
  projectRole: string;
  memberCount: number;
  unreadCount: number;
  lastMessage: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: string;
    module?: string;
    createdAt: string;
  } | null;
}

type PendingMention = { userId: string; label: string };
const CHAT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'] as const;

function createClientMessageId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProjectChat() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [conversationQuery, setConversationQuery] = useState('');
  const [showConversationList, setShowConversationList] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [officePreview, setOfficePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectIds = useMemo(
    () => conversations.map((conversation) => conversation.projectId),
    [conversations],
  );
  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.projectId === selectedProjectId,
      ) || null,
    [conversations, selectedProjectId],
  );
  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );
  const visibleConversations = useMemo(() => {
    const query = conversationQuery.trim().toLocaleLowerCase('vi');
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      conversation.projectName.toLocaleLowerCase('vi').includes(query),
    );
  }, [conversationQuery, conversations]);

  const {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    typingUsers,
    setOnMessage,
    setOnReaction,
    toggleReaction,
  } = useChatSocket(projectIds);

  const fetchConversations = useCallback(async () => {
    try {
      const next = await api.getChatConversations();
      setConversations(next);
      setSelectedProjectId((current) => {
        if (next.some((item) => item.projectId === current)) return current;
        const requestedProjectId =
          typeof window !== 'undefined'
            ? (
                new URLSearchParams(window.location.search).get('project')
                || new URLSearchParams(window.location.search).get('projectId')
              )
            : null;
        return (
          next.find((item) => item.projectId === requestedProjectId)?.projectId
          || next.find((item) => item.unreadCount > 0)?.projectId
          || next[0]?.projectId
          || ''
        );
      });
    } catch {
      // Dashboard remains usable if the conversation list is temporarily down.
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
    const interval = window.setInterval(fetchConversations, 30000);
    const refreshOnFocus = () => void fetchConversations();
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [fetchConversations]);

  const markLatestRead = useCallback(
    async (projectId: string, messageId?: string) => {
      try {
        await api.markChatRead(projectId, undefined, messageId);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.projectId === projectId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      } catch {
        // The message list remains usable if a read receipt briefly fails.
      }
    },
    [],
  );

  const handleNewMessage = useCallback(
    (message: ChatMessage) => {
      const isCurrentConversation =
        message.projectId === selectedProjectId;
      if (isCurrentConversation) {
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message],
        );
      }
      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation.projectId === message.projectId
            ? {
                ...conversation,
                unreadCount:
                  message.userId === user?.id
                  || (isOpen && isCurrentConversation)
                    ? 0
                    : conversation.unreadCount + 1,
                lastMessage: {
                  id: message.id,
                  userId: message.userId,
                  userName: message.user.name,
                  content:
                    message.attachments?.[0]?.originalName
                    || message.content,
                  type: message.type,
                  module: message.module,
                  createdAt: message.createdAt,
                },
              }
            : conversation,
        );
        return next.sort((left, right) => {
          const leftTime = left.lastMessage
            ? new Date(left.lastMessage.createdAt).getTime()
            : 0;
          const rightTime = right.lastMessage
            ? new Date(right.lastMessage.createdAt).getTime()
            : 0;
          return rightTime - leftTime;
        });
      });
      if (
        message.userId !== user?.id
        && isOpen
        && isCurrentConversation
      ) {
        void markLatestRead(message.projectId, message.id);
      }
    },
    [isOpen, markLatestRead, selectedProjectId, user?.id],
  );

  useEffect(() => {
    setOnMessage(handleNewMessage);
  }, [handleNewMessage, setOnMessage]);

  const handleReactionUpdate = useCallback((update: ReactionUpdate) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === update.messageId
          ? { ...message, reactions: update.reactions }
          : message,
      ),
    );
  }, []);

  useEffect(() => {
    setOnReaction(handleReactionUpdate);
  }, [handleReactionUpdate, setOnReaction]);

  const loadMessages = useCallback(
    async (cursor?: string) => {
      if (!selectedProjectId) return;
      setLoading(true);
      try {
        const data = await api.getChatMessages(
          selectedProjectId,
          undefined,
          cursor,
        );
        setMessages((current) =>
          cursor ? [...data.messages, ...current] : data.messages,
        );
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        if (!cursor) {
          const latest = data.messages[data.messages.length - 1];
          await markLatestRead(selectedProjectId, latest?.id);
        }
      } catch (error: any) {
        toast.error(error.message || 'Không thể tải tin nhắn');
      } finally {
        setLoading(false);
      }
    },
    [markLatestRead, selectedProjectId],
  );

  useEffect(() => {
    setMessages([]);
    setMembers([]);
    setHasMore(false);
    setNextCursor(null);
    setInput('');
    setPendingMentions([]);
    setMentionQuery(null);
    setShowMembers(false);
    if (!isOpen || !selectedProjectId) return;
    void loadMessages();
    api
      .getChatMembers(selectedProjectId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [isOpen, loadMessages, selectedProjectId]);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages]);

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (selectedProjectId) stopTyping(selectedProjectId);
    },
    [selectedProjectId, stopTyping],
  );

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLocaleLowerCase('vi');
    return members
      .filter((member) => member.id !== user?.id)
      .filter(
        (member) =>
          !query
          || member.name.toLocaleLowerCase('vi').includes(query)
          || member.email.toLocaleLowerCase('vi').includes(query),
      )
      .slice(0, 8);
  }, [members, mentionQuery, user?.id]);

  useEffect(() => setMentionIndex(0), [mentionQuery]);

  const handleInputChange = (value: string, cursor: number) => {
    setInput(value);
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
    if (selectedProjectId) startTyping(selectedProjectId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (selectedProjectId) stopTyping(selectedProjectId);
    }, 3000);
  };

  const chooseMention = (member: ChatMember) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) return;
    const tokenStart = cursor - match[1].length - 1;
    const label = `@${member.name}`;
    const next =
      `${input.slice(0, tokenStart)}${label} ${input.slice(cursor)}`;
    setInput(next);
    setPendingMentions((current) => [
      ...current.filter((item) => item.userId !== member.id),
      { userId: member.id, label },
    ]);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const nextCursor = tokenStart + label.length + 1;
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const buildMentions = (content: string): ChatMention[] => {
    let searchFrom = 0;
    return pendingMentions.flatMap((mention) => {
      const start = content.indexOf(mention.label, searchFrom);
      if (start < 0) return [];
      searchFrom = start + mention.label.length;
      return [
        {
          userId: mention.userId,
          start,
          length: mention.label.length,
          label: mention.label,
        },
      ];
    });
  };

  const sendWithFallback = async (
    content: string,
    attachmentId?: string,
    mentions: ChatMention[] = [],
  ) => {
    const payload = {
      content,
      clientMessageId: createClientMessageId(),
      attachmentId,
      mentions,
    };
    try {
      const acknowledgement = await sendMessage(selectedProjectId, payload);
      if (acknowledgement) {
        handleNewMessage(acknowledgement);
        return;
      }
    } catch {
      // A timeout may still mean the server committed the message. REST uses
      // the same idempotency key and safely returns the existing row.
    }
    const fallback = await api.sendChatMessage(selectedProjectId, {
      ...payload,
    });
    handleNewMessage(fallback);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    const mentions = buildMentions(content);
    setInput('');
    setPendingMentions([]);
    setMentionQuery(null);
    stopTyping(selectedProjectId);
    try {
      await sendWithFallback(content, undefined, mentions);
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi tin nhắn');
      setInput(content);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionIndex((index) => (index + 1) % filteredMembers.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionIndex(
          (index) => (index - 1 + filteredMembers.length) % filteredMembers.length,
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        chooseMention(filteredMembers[mentionIndex]);
        return;
      }
      if (event.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Tệp đính kèm không được vượt quá 50 MB');
      return;
    }
    if (!selectedProjectId) {
      toast.error('Vui lòng chọn một dự án để gửi tệp');
      return;
    }
    setUploading(true);
    try {
      const attachment = await api.uploadChatFile(selectedProjectId, file);
      await sendWithFallback(attachment.originalName, attachment.id);
    } catch (error: any) {
      toast.error(error.message || 'Tải tệp thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openAttachment = async (attachment: ChatAttachment) => {
    let url = attachment.url;
    try {
      const refreshed = await api.getChatAttachmentUrl(attachment.id);
      url = refreshed.url;
    } catch {
      // The short-lived URL already in the message may still be valid.
    }
    if (attachment.kind === 'IMAGE') setImagePreview(url);
    else if (attachment.kind === 'PDF') setPdfPreview(url);
    else if (attachment.kind === 'OFFICE') setOfficePreview(attachment.id);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedProjectId) return;
    try {
      const acknowledgement = await toggleReaction(
        selectedProjectId,
        messageId,
        emoji,
      );
      if (acknowledgement) {
        handleReactionUpdate(acknowledgement);
        return;
      }
      const fallback = await api.toggleChatReaction(
        selectedProjectId,
        messageId,
        emoji,
      );
      handleReactionUpdate(fallback);
    } catch (error: any) {
      toast.error(error.message || 'Không thể thả cảm xúc');
    }
  };

  const selectedTypingUsers = typingUsers.filter(
    (typingUser) => typingUser.projectId === selectedProjectId,
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:scale-105 hover:border-slate-300 hover:shadow-xl"
        title="Thảo luận dự án"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold ring-2 ring-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              aria-label="Đóng chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:w-[820px]"
            >
              <header className="relative flex items-center justify-between border-b border-sky-100 bg-white px-4 py-3 text-slate-800 shadow-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowConversationList((current) => !current)
                    }
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:hidden"
                    title="Danh sách hội thoại"
                  >
                    {showConversationList ? (
                      <ChevronLeft className="h-5 w-5" />
                    ) : (
                      <MessagesSquare className="h-5 w-5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      Tin nhắn dự án
                    </h3>
                    <p className="truncate text-[11px] text-slate-500">
                      {selectedConversation?.projectName
                        || 'Chọn một dự án để thảo luận'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowMembers((value) => !value)}
                      className="flex items-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                      title="Thành viên dự án"
                    >
                      <div className="flex -space-x-1.5">
                        {members.slice(0, 3).map((member) => (
                          <span
                            key={member.id}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-700 shadow-sm"
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <span className="ml-2 text-xs font-semibold">
                        {members.length
                          || selectedConversation?.memberCount
                          || 0}
                      </span>
                      <Users className="ml-1 h-3.5 w-3.5" />
                    </button>
                    {showMembers && (
                      <div className="absolute right-0 top-10 z-10 max-h-72 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{member.name}</p>
                              <p className="truncate text-[10px] text-slate-400">
                                {[member.position, member.department].filter(Boolean).join(' · ') || member.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isConnected ? 'bg-emerald-300' : 'bg-slate-300'
                    }`}
                    title={isConnected ? 'Đã kết nối realtime' : 'Đang kết nối lại'}
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              <div className="flex min-h-0 flex-1">
                <aside
                  className={`min-h-0 w-full shrink-0 flex-col border-r border-slate-200 bg-white sm:flex sm:w-[300px] ${
                    showConversationList ? 'flex' : 'hidden'
                  }`}
                >
                  <div className="border-b border-slate-200 bg-white p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        value={conversationQuery}
                        onChange={(event) =>
                          setConversationQuery(event.target.value)
                        }
                        placeholder="Tìm dự án..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {conversationsLoading && (
                      <div className="flex h-24 items-center justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      </div>
                    )}
                    {!conversationsLoading
                      && visibleConversations.length === 0 && (
                        <p className="px-3 py-8 text-center text-xs leading-5 text-slate-400">
                          Bạn chưa được thêm vào dự án nào.
                        </p>
                      )}
                    {visibleConversations.map((conversation) => (
                      <button
                        key={conversation.projectId}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(conversation.projectId);
                          setShowConversationList(false);
                        }}
                        className={`mb-1 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition ${
                          conversation.projectId === selectedProjectId
                            ? 'border border-slate-200 bg-slate-50 text-slate-900 shadow-sm'
                            : 'border border-transparent bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm">
                          {conversation.projectName.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-xs font-semibold">
                              {conversation.projectName}
                            </span>
                            {conversation.lastMessage && (
                              <span className="shrink-0 text-[9px] text-slate-400">
                                {formatConversationTime(
                                  conversation.lastMessage.createdAt,
                                )}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[10px] text-slate-500">
                              {conversation.lastMessage
                                ? `${conversation.lastMessage.userName}: ${conversation.lastMessage.content}`
                                : 'Chưa có tin nhắn'}
                            </span>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                                {conversation.unreadCount > 99
                                  ? '99+'
                                  : conversation.unreadCount}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </aside>

                <section
                  className={`min-w-0 flex-1 flex-col bg-white ${
                    showConversationList ? 'hidden sm:flex' : 'flex'
                  }`}
                >
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {hasMore && (
                      <div className="text-center">
                        <button
                          disabled={loading}
                          onClick={() =>
                            nextCursor && loadMessages(nextCursor)
                          }
                          className="text-xs font-medium text-blue-600 disabled:opacity-50"
                        >
                          {loading
                            ? 'Đang tải...'
                            : 'Tải thêm tin nhắn cũ'}
                        </button>
                      </div>
                    )}
                    {loading && messages.length === 0 && (
                      <div className="flex h-32 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      </div>
                    )}
                    {!selectedConversation && !loading && (
                      <div className="flex h-full min-h-56 flex-col items-center justify-center text-slate-400">
                        <MessagesSquare className="mb-3 h-10 w-10" />
                        <p className="text-sm font-medium">
                          Chọn dự án trong danh sách tin nhắn
                        </p>
                      </div>
                    )}
                    {selectedConversation
                      && !loading
                      && messages.length === 0 && (
                        <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                          <p className="text-sm font-medium">
                            Chưa có tin nhắn
                          </p>
                          <p className="mt-1 text-xs">
                            Bắt đầu thảo luận dự án.
                          </p>
                        </div>
                      )}
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isMine={message.userId === user?.id}
                        currentUserId={user?.id || ''}
                        onOpenAttachment={openAttachment}
                        onToggleReaction={handleToggleReaction}
                      />
                    ))}
                    {selectedTypingUsers.length > 0 && (
                      <p className="text-xs italic text-slate-400">
                        {selectedTypingUsers.length === 1
                          ? `${selectedTypingUsers[0].name} đang soạn tin nhắn...`
                          : `${selectedTypingUsers
                              .map((item) => item.name)
                              .join(', ')} đang soạn tin nhắn...`}
                      </p>
                    )}
                    <div ref={endRef} />
                  </div>

                  <footer className="relative border-t border-slate-200 bg-white px-3 py-2.5 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]">
                {mentionQuery !== null && (
                  <div className="absolute bottom-full left-12 right-12 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {filteredMembers.length ? (
                      filteredMembers.map((member, index) => (
                        <button
                          key={member.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseMention(member)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                            index === mentionIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-700">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{member.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">
                              {member.position || member.department || member.email}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-xs text-slate-400">
                        Không tìm thấy thành viên
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/mp4,video/webm,video/ogg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
                    onChange={(event) => void uploadFile(event.target.files?.[0])}
                  />
                  <button
                    disabled={uploading || !selectedConversation}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                  >
                    {uploading ? (
                      <span className="block h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    rows={1}
                    disabled={!selectedConversation}
                    placeholder={
                      selectedConversation
                        ? 'Nhập tin nhắn, dùng @ để nhắc tên...'
                        : 'Chọn dự án để bắt đầu trò chuyện'
                    }
                    onChange={(event) =>
                      handleInputChange(
                        event.target.value,
                        event.target.selectionStart,
                      )
                    }
                    onKeyDown={handleKeyDown}
                    className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                  <button
                    disabled={!input.trim() || !selectedConversation}
                    onClick={() => void handleSend()}
                    className="rounded-xl bg-slate-900 p-2.5 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                  </footer>
                </section>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {imagePreview && (
        <PreviewOverlay onClose={() => setImagePreview(null)}>
          <img
            src={imagePreview}
            alt="Ảnh đính kèm"
            className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
          />
        </PreviewOverlay>
      )}
      {pdfPreview && (
        <PreviewOverlay onClose={() => setPdfPreview(null)}>
          <iframe
            src={pdfPreview}
            title="Xem trước PDF"
            className="h-[90vh] w-[94vw] rounded-xl bg-white lg:w-[80vw]"
          />
        </PreviewOverlay>
      )}
      {officePreview && (
        <OnlyOfficeFilePreview
          attachmentId={officePreview}
          onClose={() => setOfficePreview(null)}
        />
      )}
    </>
  );
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return new Intl.DateTimeFormat('vi-VN', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit' }).format(date);
}

function MessageBubble({
  message,
  isMine,
  currentUserId,
  onOpenAttachment,
  onToggleReaction,
}: {
  message: ChatMessage;
  isMine: boolean;
  currentUserId: string;
  onOpenAttachment: (attachment: ChatAttachment) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const attachment = message.attachments?.[0];
  const groupedReactions = useMemo(
    () =>
      CHAT_REACTIONS.flatMap((emoji) => {
        const reactions =
          message.reactions?.filter((reaction) => reaction.emoji === emoji)
          || [];
        return reactions.length ? [{ emoji, reactions }] : [];
      }),
    [message.reactions],
  );
  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
      {!isMine && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm">
          {message.user.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className={`group flex max-w-[78%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <span className="mb-1 px-1 text-[10px] text-slate-400">
            {message.user.name}
          </span>
        )}
        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <div
            className={`overflow-hidden rounded-2xl px-3 py-2 text-sm ${
            isMine
              ? 'rounded-br-md border border-slate-300 bg-white text-slate-950 shadow-sm'
              : 'rounded-bl-md border border-slate-200 bg-slate-50 text-slate-950 shadow-sm'
            }`}
          >
            {attachment && (
              <AttachmentView
                attachment={attachment}
                onOpen={() => onOpenAttachment(attachment)}
              />
            )}
            {message.content !== attachment?.originalName && (
              <p className="whitespace-pre-wrap break-words">
                {renderMentionedContent(message.content, message.mentions || [])}
              </p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowReactionPicker((current) => !current)}
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 opacity-60 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
              aria-label="Thả cảm xúc"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {showReactionPicker && (
              <div
                className={`absolute bottom-9 z-20 flex rounded-full border border-slate-200 bg-white p-1 shadow-xl ${
                  isMine ? 'right-0' : 'left-0'
                }`}
              >
                {CHAT_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggleReaction(message.id, emoji);
                      setShowReactionPicker(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:scale-110 hover:bg-slate-100"
                    aria-label={`Thả ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {groupedReactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end' : ''}`}>
            {groupedReactions.map(({ emoji, reactions }) => {
              const reacted = reactions.some(
                (reaction) => reaction.userId === currentUserId,
              );
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(message.id, emoji)}
                  title={reactions.map((reaction) => reaction.user.name).join(', ')}
                  className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] shadow-sm transition ${
                    reacted
                      ? 'border-slate-400 bg-slate-100 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-semibold">{reactions.length}</span>
                </button>
              );
            })}
          </div>
        )}
        <span className="mt-1 px-1 text-[10px] text-slate-400">
          {new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(message.createdAt))}
        </span>
      </div>
    </div>
  );
}

function AttachmentView({
  attachment,
  onOpen,
}: {
  attachment: ChatAttachment;
  onOpen: () => void;
}) {
  if (attachment.kind === 'IMAGE') {
    return (
      <button onClick={onOpen} className="mb-1 block overflow-hidden rounded-lg">
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-h-56 w-full object-cover"
        />
      </button>
    );
  }
  if (attachment.kind === 'VIDEO') {
    return (
      <video
        src={attachment.url}
        controls
        preload="metadata"
        className="mb-1 max-h-56 w-full rounded-lg bg-black"
      />
    );
  }
  return (
    <button
      onClick={onOpen}
      className="mb-1 flex w-full min-w-52 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left text-slate-900 hover:bg-slate-50"
    >
      <FileText className="h-6 w-6 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">
          {attachment.originalName}
        </span>
        <span className="block text-[10px] text-slate-400">
          {(attachment.size / 1024 / 1024).toFixed(1)} MB · {attachment.kind}
        </span>
      </span>
      {attachment.kind === 'FILE' ? (
        <Download className="h-4 w-4" />
      ) : (
        <span className="text-[10px] font-semibold">Xem</span>
      )}
    </button>
  );
}

function renderMentionedContent(
  content: string,
  mentions: ChatMention[],
): ReactNode {
  if (!mentions.length) return content;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  mentions
    .slice()
    .sort((a, b) => a.start - b.start)
    .forEach((mention, index) => {
      if (mention.start < cursor || mention.start >= content.length) return;
      nodes.push(content.slice(cursor, mention.start));
      nodes.push(
        <span
          key={`${mention.userId}-${index}`}
          className="rounded bg-slate-200 px-1 font-semibold text-slate-950"
        >
          {content.slice(mention.start, mention.start + mention.length)}
        </span>,
      );
      cursor = mention.start + mention.length;
    });
  nodes.push(content.slice(cursor));
  return nodes;
}

function PreviewOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white"
      >
        <X className="h-6 w-6" />
      </button>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}
