// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Send, FileText, Clock, Trash2, Edit3, Plus, ChevronRight, Eye, Archive } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001').replace('wss://', 'https://').replace('ws://', 'http://');

export default function AdminMessagingSection({ theme }) {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('compose');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 ring-1 ring-slate-200 dark:ring-slate-800 w-fit">
        {[
          { key: 'compose', label: 'Compose', icon: Edit3 },
          { key: 'templates', label: 'Templates', icon: FileText },
          { key: 'history', label: 'History', icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && <ComposeTab theme={theme} />}
      {activeTab === 'templates' && <TemplatesTab theme={theme} onUseTemplate={(t) => { setActiveTab('compose'); }} />}
      {activeTab === 'history' && <HistoryTab theme={theme} />}
    </div>
  );
}

function ComposeTab({ theme, prefillTemplate }) {
  const { getToken } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [targetType, setTargetType] = useState('all');
  const [displayMode, setDisplayMode] = useState('banner');
  const [dismissible, setDismissible] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (sendNow) => {
    if (!subject || !body) {
      alert('Subject and body are required');
      return;
    }
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, body, message_type: messageType, target_type: targetType,
          display_mode: displayMode, dismissible, send_now: sendNow,
        }),
      });
      if (res.ok) {
        setSent(true);
        if (sendNow) {
          setSubject('');
          setBody('');
          setMessageType('info');
          setTargetType('all');
          setTimeout(() => setSent(false), 3000);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create message');
      }
    } catch (error) {
      console.error('Error creating message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 space-y-4">
      {sent && (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium">
          Message sent successfully!
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Message subject..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message..."
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="alert">Alert</option>
            <option value="feature">Feature</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Target</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50"
          >
            <option value="all">All Users</option>
            <option value="organization">Select Orgs</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Display</label>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50"
          >
            <option value="banner">Banner</option>
            <option value="modal">Modal</option>
            <option value="toast">Toast</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={dismissible}
              onChange={(e) => setDismissible(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Dismissible
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleSend(true)}
          disabled={sending || !subject || !body}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 text-sm"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send Now'}
        </button>
        <button
          onClick={() => handleSend(false)}
          disabled={sending || !subject || !body}
          className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
        >
          Save as Draft
        </button>
      </div>
    </div>
  );
}

function TemplatesTab({ theme, onUseTemplate }) {
  const { getToken } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState('info');

  const fetchTemplates = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/message-templates`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!name || !subject || !body) {
      alert('All fields are required');
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/message-templates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, body, message_type: messageType }),
      });
      if (res.ok) {
        setName(''); setSubject(''); setBody(''); setShowCreate(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/site-admin/message-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const typeColors = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    alert: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    feature: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    maintenance: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body" rows={3}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="flex items-center gap-3">
            <select value={messageType} onChange={(e) => setMessageType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="alert">Alert</option>
              <option value="feature">Feature</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Save Template
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-50"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">{t.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeColors[t.message_type] || typeColors.info}`}>
                    {t.message_type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.subject}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onUseTemplate(t)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  Use
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">No templates yet. Create one to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ theme }) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`${BACKEND_URL}/api/site-admin/messages?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, filter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleArchive = async (id) => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/site-admin/messages/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      fetchMessages();
    } catch (error) {
      console.error('Error archiving message:', error);
    }
  };

  const handleSendDraft = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/messages/${id}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) fetchMessages();
    } catch (error) {
      console.error('Error sending draft:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/site-admin/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    };
    return styles[status] || styles.draft;
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {['', 'draft', 'sent', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-50"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">{msg.subject}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {msg.target_type === 'all' ? 'All users' : `${msg.target_type}`} | {msg.display_mode}
                    {msg.sent_at && ` | Sent ${new Date(msg.sent_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(msg.status)}`}>
                    {msg.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-3">{msg.body}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {msg.status === 'sent' && (
                    <>
                      <span><Eye className="w-3 h-3 inline mr-1" />{msg.read_count || 0} reads</span>
                      <span>{msg.dismissed_count || 0} dismissed</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {msg.status === 'draft' && (
                    <button onClick={() => handleSendDraft(msg.id)} className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      <Send className="w-3 h-3 inline mr-1" />Send
                    </button>
                  )}
                  {msg.status === 'sent' && (
                    <button onClick={() => handleArchive(msg.id)} className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Archive className="w-3 h-3 inline mr-1" />Archive
                    </button>
                  )}
                  <button onClick={() => handleDelete(msg.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">No messages yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
