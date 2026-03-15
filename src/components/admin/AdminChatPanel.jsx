import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MessageCircle, Send, X, User, Bot, Shield, Clock, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminChatPanel({ theme }) {
  const { getToken } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTopicSettings, setShowTopicSettings] = useState(false);
  const [topicSettings, setTopicSettings] = useState({});
  const [savingTopics, setSavingTopics] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const isDark = theme === 'dark';

  // Fetch chat list
  const fetchChats = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/support/admin/chats?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Fetch topic settings
  const fetchTopicSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/platform-settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const topics = {};
        for (const [key, value] of Object.entries(data.settings)) {
          if (key.startsWith('chat_topic_')) {
            topics[key] = value;
          }
        }
        setTopicSettings(topics);
      }
    } catch (err) {
      console.error('Failed to fetch topic settings:', err);
    }
  }, [getToken]);

  useEffect(() => {
    fetchChats();
    fetchTopicSettings();
  }, [fetchChats, fetchTopicSettings]);

  // Poll for new chats every 10s
  useEffect(() => {
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Load messages for selected chat
  const loadChat = useCallback(async (chatId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/support/admin/chats/${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedChat(data.chat);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  }, [getToken]);

  // Poll selected chat for new messages every 3s
  useEffect(() => {
    if (!selectedChat) return;
    pollRef.current = setInterval(async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/support/admin/chats/${selectedChat.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch {
        // Silent fail
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedChat, getToken]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send admin message
  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/support/admin/chats/${selectedChat.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setInput('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Close chat
  const closeChat = async (chatId) => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/support/admin/chats/${chatId}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchChats();
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to close chat:', err);
    }
  };

  // Save topic settings
  const saveTopicSetting = async (key, value) => {
    setSavingTopics(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/platform-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: { [key]: value } }),
      });
      if (res.ok) {
        setTopicSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (err) {
      console.error('Failed to save topic setting:', err);
    } finally {
      setSavingTopics(false);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
  };

  const topicLabels = {
    chat_topic_pricing: { label: 'Pricing & Plans', desc: 'Discuss plan costs, pricing details, comparisons' },
    chat_topic_features: { label: 'Features', desc: 'Explain platform features and capabilities' },
    chat_topic_troubleshooting: { label: 'Troubleshooting', desc: 'Help with technical issues and errors' },
    chat_topic_account: { label: 'Account & Billing', desc: 'Answer account, subscription, billing questions' },
    chat_topic_general: { label: 'General Questions', desc: 'Answer general or off-topic questions' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topic Settings Toggle */}
      <div className={`rounded-2xl shadow-lg ring-1 overflow-hidden ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`}>
        <button
          onClick={() => setShowTopicSettings(!showTopicSettings)}
          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
        >
          <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
            <Settings2 className="w-4 h-4" /> Chatbot Topic Controls
          </h3>
          {showTopicSettings ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showTopicSettings && (
          <div className={`border-t p-4 space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Control which topics the AI chatbot will engage with. Disabled topics will redirect users to email support.
            </p>
            {Object.entries(topicLabels).map(([key, { label, desc }]) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topicSettings[key] === 'true'}
                  onChange={(e) => saveTopicSetting(key, e.target.checked ? 'true' : 'false')}
                  disabled={savingTopics}
                  className="w-5 h-5 mt-0.5 rounded border-slate-600 text-blue-600 focus:ring-blue-600"
                />
                <div>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{label}</span>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className={`rounded-2xl shadow-lg ring-1 overflow-hidden ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`}>
        <div className="flex" style={{ height: '500px' }}>
          {/* Chat List */}
          <div className={`w-72 border-r flex flex-col ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`p-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                <MessageCircle className="w-4 h-4 inline mr-1.5" />
                User Chats ({chats.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <p className={`p-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No chat conversations yet.
                </p>
              ) : (
                chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => loadChat(chat.id)}
                    className={`w-full text-left p-3 border-b transition-colors ${
                      selectedChat?.id === chat.id
                        ? isDark ? 'bg-blue-900/30 border-slate-700' : 'bg-blue-50 border-slate-200'
                        : isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {chat.user_name || chat.user_email || 'Unknown'}
                      </span>
                      <span className={`text-[10px] flex-shrink-0 ml-1 px-1.5 py-0.5 rounded-full font-medium ${
                        chat.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {chat.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {chat.organization_name && (
                        <span className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {chat.organization_name}
                        </span>
                      )}
                      {chat.tier_key && (
                        <span className={`text-[10px] px-1 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {chat.tier_key}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {chat.first_message || 'No messages'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {chat.message_count} msgs{chat.admin_message_count > 0 ? ` (${chat.admin_message_count} admin)` : ''}
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatTime(chat.updated_at)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Header */}
                <div className={`flex items-center justify-between p-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {selectedChat.user_name || selectedChat.user_email}
                    </span>
                    {selectedChat.organization_name && (
                      <span className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedChat.organization_name} ({selectedChat.tier_key || 'no plan'})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedChat.status === 'active' && (
                      <button
                        onClick={() => closeChat(selectedChat.id)}
                        className={`text-xs px-2 py-1 rounded-lg transition ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        Close Chat
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {msg.role !== 'user' && (
                          <div className={`mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            msg.role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            {msg.role === 'admin'
                              ? <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              : <Bot className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            }
                          </div>
                        )}
                        <div>
                          <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : msg.role === 'admin'
                                ? isDark
                                  ? 'bg-purple-900/40 text-purple-100 rounded-bl-md border border-purple-500/30'
                                  : 'bg-purple-50 text-purple-900 rounded-bl-md border border-purple-200'
                                : isDark
                                  ? 'bg-slate-800 text-slate-200 rounded-bl-md'
                                  : 'bg-slate-100 text-slate-800 rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-2 mt-0.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {msg.role === 'admin' ? 'Admin' : msg.role === 'assistant' ? 'AI' : 'User'}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <User className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin Input */}
                <div className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-50'}`}>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Reply as admin..."
                      rows={1}
                      className={`flex-1 resize-none bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                      style={{ maxHeight: '80px' }}
                      disabled={sending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      className={`shrink-0 p-1.5 rounded-lg transition ${
                        input.trim() && !sending
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : isDark ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Messages appear in the user's chat widget in real-time with an "Admin" badge
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select a conversation to view and reply
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
