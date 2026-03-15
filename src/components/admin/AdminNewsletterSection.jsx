// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { RefreshCw, Send, Eye, Edit3, Trash2, Plus, Mail, CheckCircle, AlertCircle, TestTube } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001')
  .replace('wss://', 'https://').replace('ws://', 'http://');

function formatDate(ts) {
  if (!ts) return '–';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AdminNewsletterSection({ theme }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Editor state
  const [editing, setEditing] = useState(null); // newsletter object being edited
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(null);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/newsletters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNewsletters(data.newsletters || []);
      } else {
        setError('Failed to load newsletters');
      }
    } catch {
      setError('Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const openEditor = (nl) => {
    setEditing(nl);
    setEditSubject(nl.subject);
    setEditBody(nl.body_html);
    setPreviewing(null);
  };

  const openNew = () => {
    setEditing({ id: null, status: 'draft' });
    setEditSubject('');
    setEditBody('');
    setPreviewing(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id
        ? `${BACKEND_URL}/api/site-admin/newsletters/${editing.id}`
        : `${BACKEND_URL}/api/site-admin/newsletters`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: editSubject, body_html: editBody }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditing(data.newsletter);
        setSuccess('Draft saved');
        setTimeout(() => setSuccess(null), 3000);
        load();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save newsletter');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!editing?.id) return;
    setSendingTest(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/newsletters/${editing.id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Test email sent to ${data.sentTo}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || 'Failed to send test');
      }
    } catch {
      setError('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSend = async () => {
    if (!editing?.id) return;
    if (!confirm('Send this newsletter to ALL active users? This cannot be undone.')) return;
    setSending(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/newsletters/${editing.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Newsletter sent to ${data.sent} users!`);
        setEditing(null);
        load();
      } else {
        setError(data.error || 'Failed to send');
      }
    } catch {
      setError('Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this draft?')) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/site-admin/newsletters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } catch {
      setError('Failed to delete');
    }
  };

  // If editing/composing a newsletter
  if (editing) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setEditing(null)} className={`text-sm ${mutedColor} hover:underline`}>&larr; Back to list</button>
          <div className="flex items-center gap-2">
            {editing.id && editing.status === 'draft' && (
              <>
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                >
                  <TestTube className="w-3.5 h-3.5" />
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Sending...' : 'Send to All Users'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 text-green-800 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {/* Editor */}
        <div className={`rounded-xl border p-6 space-y-4 ${cardBg}`}>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Subject Line</label>
            <input
              type="text"
              value={editSubject}
              onChange={e => setEditSubject(e.target.value)}
              placeholder="RolePractice.ai – What's New This Week"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
              disabled={editing.status === 'sent'}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textColor}`}>
              Email Body (HTML) <span className={`font-normal ${mutedColor}`}>– "Hi {'{{First Name}}'}" is added automatically</span>
            </label>
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={16}
              placeholder="<p>Here's what we shipped this week...</p>"
              className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${inputBg}`}
              disabled={editing.status === 'sent'}
            />
          </div>

          {editing.status !== 'sent' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !editSubject || !editBody}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing.id ? 'Update Draft' : 'Save Draft'}
              </button>
              <button
                onClick={() => setPreviewing(previewing ? null : true)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border ${cardBg} ${textColor}`}
              >
                <Eye className="w-3.5 h-3.5" />
                {previewing ? 'Hide Preview' : 'Preview'}
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        {previewing && (
          <div className={`rounded-xl border p-6 ${cardBg}`}>
            <h3 className={`text-sm font-semibold mb-3 ${textColor}`}>Email Preview</h3>
            <div className="bg-white rounded-lg border border-slate-200 p-6 max-w-[600px] mx-auto text-slate-900">
              <div className="bg-blue-900 text-white text-center p-6 rounded-t-lg -mt-6 -mx-6 mb-4">
                <h2 className="text-lg font-bold">{editSubject || 'Subject Line'}</h2>
                <p className="text-blue-300 text-sm mt-1">AI-powered sales role-play training</p>
              </div>
              <p className="mb-3">Hi Jeff,</p>
              <div dangerouslySetInnerHTML={{ __html: editBody }} />
              <div className="text-center my-6">
                <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">Start Practicing Now &rarr;</span>
              </div>
              <p className="text-sm text-slate-500">Questions? Reply to this email.</p>
              <p className="font-semibold">&mdash; The RolePractice.ai Team</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Newsletter list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold ${textColor}`}>Weekly Newsletters</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${mutedColor}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> New Draft
          </button>
        </div>
      </div>

      <p className={`text-sm ${mutedColor}`}>
        Auto-generated every Monday at 8am ET. Review, edit, then send.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className={`text-center py-12 ${mutedColor}`}>Loading...</div>
      ) : newsletters.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${cardBg}`}>
          <Mail className={`w-12 h-12 mx-auto mb-3 ${mutedColor}`} />
          <p className={`text-lg font-medium ${textColor}`}>No newsletters yet</p>
          <p className={`text-sm ${mutedColor}`}>A draft will be auto-generated next Monday at 8am ET, or create one manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {newsletters.map(nl => (
            <div key={nl.id} className={`flex items-center justify-between p-4 rounded-xl border ${cardBg}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold truncate ${textColor}`}>{nl.subject}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    nl.status === 'sent'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {nl.status === 'sent' ? 'Sent' : 'Draft'}
                  </span>
                </div>
                <div className={`text-xs mt-1 ${mutedColor}`}>
                  {nl.status === 'sent'
                    ? `Sent ${formatDate(nl.sent_at)} to ${nl.recipient_count} users`
                    : `Created ${formatDate(nl.created_at)}`
                  }
                  {nl.week_start && ` · Week of ${new Date(nl.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button onClick={() => openEditor(nl)} className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 ${mutedColor}`} title={nl.status === 'sent' ? 'View' : 'Edit'}>
                  {nl.status === 'sent' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
                {nl.status === 'draft' && (
                  <button onClick={() => handleDelete(nl.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
