import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, FileText, Image, X, Download, MessageSquare } from 'lucide-react';

const roleColors: Record<string, string> = {
  owner: 'text-amber-400',
  team_leader: 'text-blue-400',
  admin: 'text-sky-400',
  curator: 'text-purple-400',
  hr: 'text-emerald-400',
  scout: 'text-primary-400',
};

const roleLabels: Record<string, string> = {
  owner: 'Владелец',
  team_leader: 'Сквад Лидер',
  admin: 'Админ',
  curator: 'Куратор',
  hr: 'HR',
  hr_huntme: 'HR HuntMe',
  hr_mason: 'HR Mason',
  scout: 'Скаут',
};

interface ChatMessage {
  id: number;
  application_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  user_role: string;
  message: string;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  created_at: string;
}

interface ApplicationChatProps {
  applicationId: number;
  hasAccess: boolean;
}

export default function ApplicationChat({ applicationId, hasAccess }: ApplicationChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen && hasAccess) {
      loadMessages();
      // Polling with visibility check — stop when tab is inactive
      const poll = () => {
        if (!document.hidden) loadMessages();
      };
      pollRef.current = setInterval(poll, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, applicationId, hasAccess]);

  const prevMessageCount = useRef(0);
  useEffect(() => {
    // Only auto-scroll when new messages arrive
    if (messages.length > prevMessageCount.current) {
      scrollToBottom();
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadMessages() {
    try {
      const data = await api.get<ChatMessage[]>(`/chat/${applicationId}`);
      setMessages(data);
    } catch { /* ignore polling errors */ }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || sending) return;

    setSending(true);
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('message', newMessage.trim());
        await api.upload(`/chat/${applicationId}/upload`, formData);
      } else {
        await api.post(`/chat/${applicationId}`, { message: newMessage.trim() });
      }
      setNewMessage('');
      setFile(null);
      await loadMessages();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 5 МБ)');
      return;
    }
    setFile(f);
  }

  function isImage(type: string | null) {
    return type?.startsWith('image/');
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
  }

  // Group messages by date
  function groupByDate(msgs: ChatMessage[]) {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let lastDate = '';
    for (const m of msgs) {
      const date = formatDate(m.created_at);
      if (date !== lastDate) {
        groups.push({ date, messages: [m] });
        lastDate = date;
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    }
    return groups;
  }

  if (!hasAccess) return null;

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="card flex items-center gap-3 w-full hover:border-primary-500/50 transition cursor-pointer"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
          <MessageSquare size={20} className="text-primary-400" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-white">Чат по анкете</h3>
          <p className="text-xs text-dark-400">
            {messages.length > 0 ? `${messages.length} сообщений` : 'Нет сообщений'}
          </p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-dark-400"
        >
          ▼
        </motion.div>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="card !p-0 border-primary-500/20">
              {/* Messages area */}
              <div className="h-96 overflow-y-auto p-4 space-y-4 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-dark-500">
                    <MessageSquare size={40} className="mb-3 opacity-30" />
                    <p className="text-sm">Нет сообщений</p>
                    <p className="text-xs mt-1">Начните обсуждение анкеты</p>
                  </div>
                ) : (
                  groupByDate(messages).map((group, gi) => (
                    <div key={gi}>
                      {/* Date separator */}
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-dark-700" />
                        <span className="text-xs text-dark-500 font-medium">{group.date}</span>
                        <div className="flex-1 h-px bg-dark-700" />
                      </div>
                      {group.messages.map((msg, mi) => {
                        const isMe = msg.user_id === user?.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: mi * 0.02 }}
                            className={`flex gap-3 mb-3 ${isMe ? 'flex-row-reverse' : ''}`}
                          >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isMe ? 'bg-primary-600' : 'bg-dark-700'
                            } text-white`}>
                              {msg.user_name?.charAt(0) || '?'}
                            </div>

                            {/* Bubble */}
                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <span className={`text-xs font-medium ${roleColors[msg.user_role.split(',')[0]] || 'text-dark-300'}`}>
                                  {msg.user_name}
                                </span>
                                <span className="text-[10px] text-dark-600">
                                  {msg.user_role.split(',').map(r => roleLabels[r] || r).join(', ')}
                                </span>
                              </div>
                              <div className={`rounded-2xl px-4 py-2.5 ${
                                isMe
                                  ? 'bg-primary-600/20 border border-primary-500/20'
                                  : 'bg-dark-800 border border-dark-700'
                              }`}>
                                {/* File attachment */}
                                {msg.file_path && (
                                  <div className="mb-2">
                                    {isImage(msg.file_type) ? (
                                      <a href={msg.file_path} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={msg.file_path}
                                          alt={msg.file_name || 'image'}
                                          className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-80 transition"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={msg.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/50 hover:bg-dark-900 transition group"
                                      >
                                        <FileText size={16} className="text-dark-400 shrink-0" />
                                        <span className="text-sm text-primary-400 truncate group-hover:underline">
                                          {msg.file_name}
                                        </span>
                                        <Download size={14} className="text-dark-500 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                {msg.message && (
                                  <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.message}</p>
                                )}
                              </div>
                              <p className={`text-[10px] text-dark-600 mt-0.5 ${isMe ? 'text-right' : ''}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* File preview */}
              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 border-t border-dark-700 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 py-2">
                      {file.type.startsWith('image/') ? <Image size={14} className="text-primary-400" /> : <FileText size={14} className="text-primary-400" />}
                      <span className="text-xs text-dark-300 truncate flex-1">{file.name}</span>
                      <span className="text-xs text-dark-500">{(file.size / 1024).toFixed(0)} КБ</span>
                      <button onClick={() => setFile(null)} className="text-dark-500 hover:text-red-400 transition">
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-dark-700">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-dark-400 hover:text-primary-400 transition rounded-lg hover:bg-dark-800"
                  title="Прикрепить файл"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Написать сообщение..."
                  className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-4 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition"
                />
                <motion.button
                  type="submit"
                  disabled={sending || (!newMessage.trim() && !file)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-30 disabled:hover:bg-primary-600 text-white rounded-xl transition"
                >
                  <Send size={16} />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
