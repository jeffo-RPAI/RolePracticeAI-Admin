// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Mail, Send, Sparkles, Save, Trash2, Clock, Filter,
  CheckSquare, Square, ChevronDown, ChevronUp, RefreshCw,
  FileText, Eye, X, Loader2, Plus, Search, AlertCircle,
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminEmailSection({ theme }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('compose');

  // ── Compose & Send state ──
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateCategory, setSaveTemplateCategory] = useState('general');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ── Templates tab state ──
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateSubject, setEditTemplateSubject] = useState('');
  const [editTemplateBody, setEditTemplateBody] = useState('');
  const [editTemplateCategory, setEditTemplateCategory] = useState('general');
  const [updatingTemplate, setUpdatingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // ── Send History state ──
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // ── Fetch helpers ──
  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    return res;
  }, [getToken]);

  // ── Fetch recipients ──
  const fetchRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    setRecipientsError(null);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-recipients?filter=${recipientFilter}`);
      if (!res.ok) throw new Error(`Failed to fetch recipients (${res.status})`);
      const data = await res.json();
      setRecipients(data.recipients || data || []);
    } catch (err) {
      setRecipientsError(err.message);
    } finally {
      setRecipientsLoading(false);
    }
  }, [authFetch, recipientFilter]);

  // ── Fetch templates ──
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-templates`);
      if (!res.ok) throw new Error(`Failed to fetch templates (${res.status})`);
      const data = await res.json();
      setTemplates(data.templates || data || []);
    } catch (err) {
      setTemplatesError(err.message);
    } finally {
      setTemplatesLoading(false);
    }
  }, [authFetch]);

  // ── Fetch history ──
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-send-history`);
      if (!res.ok) throw new Error(`Failed to fetch send history (${res.status})`);
      const data = await res.json();
      setHistory(data.history || data || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [authFetch]);

  // ── Load data on tab changes ──
  useEffect(() => {
    if (activeTab === 'compose') {
      fetchRecipients();
      fetchTemplates();
    } else if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchRecipients, fetchTemplates, fetchHistory]);

  // ── Re-fetch recipients when filter changes ──
  useEffect(() => {
    if (activeTab === 'compose') {
      fetchRecipients();
    }
  }, [recipientFilter, fetchRecipients, activeTab]);

  // ── Recipient selection helpers ──
  const toggleRecipient = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(recipients.map(r => r.id || r.org_id || r.email)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const getRecipientKey = (r) => r.id || r.org_id || r.email;

  // ── Template selection ──
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    if (templateId === '' || templateId === 'custom') {
      setSubject('');
      setBody('');
      return;
    }
    const tpl = templates.find(t => String(t.id) === String(templateId));
    if (tpl) {
      setSubject(tpl.subject || '');
      setBody(tpl.body || tpl.html_body || '');
    }
  };

  // ── AI Compose ──
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-compose-ai`, {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.status === 503) {
        setAiError('AI compose not configured – add ANTHROPIC_API_KEY to environment variables');
        return;
      }
      if (!res.ok) throw new Error(`AI compose failed (${res.status})`);
      const data = await res.json();
      setAiResult({ subject: data.subject || '', body: data.body || data.html_body || '' });
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiUse = () => {
    if (aiResult) {
      setSubject(aiResult.subject);
      setBody(aiResult.body);
      setSelectedTemplateId('custom');
    }
    setAiModalOpen(false);
    setAiPrompt('');
    setAiResult(null);
    setAiError(null);
  };

  // ── Send email ──
  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const selectedRecipients = recipients.filter(r => selectedIds.has(getRecipientKey(r)));
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-send`, {
        method: 'POST',
        body: JSON.stringify({
          recipients: selectedRecipients.map(r => ({
            id: r.id || r.org_id,
            email: r.email,
            name: r.contact_name || r.org_name || r.name,
          })),
          subject,
          body,
          template_id: selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Send failed (${res.status})`);
      const data = await res.json();
      setSendResult({ success: true, count: data.sent || selectedRecipients.length });
    } catch (err) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  // ── Save as template ──
  const handleSaveTemplate = async () => {
    if (!saveTemplateName.trim() || !subject.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-templates`, {
        method: 'POST',
        body: JSON.stringify({
          name: saveTemplateName,
          subject,
          body,
          category: saveTemplateCategory,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaveTemplateOpen(false);
      setSaveTemplateName('');
      setSaveTemplateCategory('general');
      fetchTemplates();
    } catch (err) {
      console.error('Save template error:', err);
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Template CRUD ──
  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    setUpdatingTemplate(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-templates/${editingTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editTemplateName,
          subject: editTemplateSubject,
          body: editTemplateBody,
          category: editTemplateCategory,
        }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error('Update template error:', err);
    } finally {
      setUpdatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    setDeletingTemplateId(id);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setDeleteConfirmId(null);
      fetchTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!editTemplateName.trim() || !editTemplateSubject.trim()) return;
    setCreatingTemplate(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-templates`, {
        method: 'POST',
        body: JSON.stringify({
          name: editTemplateName,
          subject: editTemplateSubject,
          body: editTemplateBody,
          category: editTemplateCategory,
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setNewTemplateOpen(false);
      setEditTemplateName('');
      setEditTemplateSubject('');
      setEditTemplateBody('');
      setEditTemplateCategory('general');
      fetchTemplates();
    } catch (err) {
      console.error('Create template error:', err);
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeedingDefaults(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/site-admin/email-templates/seed`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Seed failed (${res.status})`);
      fetchTemplates();
    } catch (err) {
      console.error('Seed defaults error:', err);
    } finally {
      setSeedingDefaults(false);
    }
  };

  const startEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setEditTemplateName(tpl.name || '');
    setEditTemplateSubject(tpl.subject || '');
    setEditTemplateBody(tpl.body || tpl.html_body || '');
    setEditTemplateCategory(tpl.category || 'general');
  };

  const startNewTemplate = () => {
    setNewTemplateOpen(true);
    setEditTemplateName('');
    setEditTemplateSubject('');
    setEditTemplateBody('');
    setEditTemplateCategory('general');
  };

  // ── Plan badge helper ──
  const planBadge = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'paid' || t === 'active') return { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
    if (t === 'pilot') return { label: 'Pilot', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    return { label: 'Trial', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
  };

  // ── Status badge for history ──
  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'sent') return { label: status, cls: 'text-emerald-600 dark:text-emerald-400' };
    if (s === 'opened') return { label: 'Opened', cls: 'text-blue-600 dark:text-blue-400' };
    if (s === 'bounced' || s === 'failed') return { label: status, cls: 'text-red-600 dark:text-red-400' };
    if (s === 'pending') return { label: 'Pending', cls: 'text-yellow-600 dark:text-yellow-400' };
    return { label: status || 'Unknown', cls: 'text-slate-500' };
  };

  // ── Shared styles ──
  const cardClass = `rounded-2xl p-5 shadow-lg ring-1 ${isDark ? 'bg-slate-900 ring-slate-800' : 'bg-white ring-slate-200'}`;
  const inputClass = `w-full px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`;
  const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const btnSecondary = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 ring-1 ring-slate-200'}`;
  const btnDanger = 'px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50';

  const selectedRecipients = recipients.filter(r => selectedIds.has(getRecipientKey(r)));

  // ── Sub-tabs ──
  const tabs = [
    { key: 'compose', label: 'Compose & Send', icon: Send },
    { key: 'templates', label: 'Templates', icon: FileText },
    { key: 'history', label: 'Send History', icon: Clock },
  ];

  // ══════════════════════════════════════════════════
  //  Modal overlay
  // ══════════════════════════════════════════════════
  const Modal = ({ open, onClose, title, children, wide }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div
          className={`${cardClass} ${wide ? 'max-w-3xl' : 'max-w-lg'} w-full max-h-[85vh] overflow-y-auto`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
            <button onClick={onClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════
  //  TAB 1: Compose & Send
  // ══════════════════════════════════════════════════
  const renderCompose = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Recipients */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Mail className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Recipients</h3>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {['all', 'paid', 'pilot', 'trial'].map(f => (
            <button
              key={f}
              onClick={() => { setRecipientFilter(f); setSelectedIds(new Set()); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                recipientFilter === f
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Select all / deselect */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className={`text-xs font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>Select All</button>
            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>|</span>
            <button onClick={deselectAll} className={`text-xs font-medium ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}>Deselect All</button>
          </div>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {selectedIds.size} of {recipients.length} selected
          </span>
        </div>

        {/* Recipient list */}
        <div className={`rounded-lg border overflow-y-auto max-h-[400px] ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {recipientsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading recipients...</span>
            </div>
          ) : recipientsError ? (
            <div className="flex items-center justify-center py-10 px-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-500">{recipientsError}</span>
            </div>
          ) : recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Mail className={`w-8 h-8 mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No recipients found for this filter</span>
            </div>
          ) : (
            recipients.map(r => {
              const key = getRecipientKey(r);
              const checked = selectedIds.has(key);
              const badge = planBadge(r.plan_type || r.type || r.subscription_status);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b last:border-b-0 transition-colors ${
                    isDark
                      ? `border-slate-800 ${checked ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'}`
                      : `border-slate-100 ${checked ? 'bg-blue-50' : 'hover:bg-slate-50'}`
                  }`}
                >
                  <button onClick={() => toggleRecipient(key)} className="flex-shrink-0">
                    {checked
                      ? <CheckSquare className="w-4 h-4 text-blue-500" />
                      : <Square className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {r.org_name || r.name || 'Unnamed'}
                    </div>
                    <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {r.contact_name ? `${r.contact_name} – ` : ''}{r.email}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Compose */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Compose Email</h3>
        </div>

        {/* Template selector */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Template</label>
          <select
            value={selectedTemplateId}
            onChange={e => handleTemplateSelect(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a template...</option>
            <option value="custom">Custom Message</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject line..."
            className={inputClass}
          />
        </div>

        {/* Body */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Body (HTML)</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Compose your email body here. HTML is supported..."
            rows={10}
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAiModalOpen(true)}
            className={`${btnSecondary} flex items-center gap-1.5`}
          >
            <Sparkles className="w-4 h-4" />
            AI Compose
          </button>

          <button
            onClick={() => setPreviewOpen(true)}
            disabled={!subject.trim() && !body.trim()}
            className={`${btnSecondary} flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>

          <button
            onClick={() => setSaveTemplateOpen(true)}
            disabled={!subject.trim()}
            className={`${btnSecondary} flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save className="w-4 h-4" />
            Save as Template
          </button>

          <button
            onClick={() => setSendConfirmOpen(true)}
            disabled={selectedIds.size === 0 || !subject.trim()}
            className={`${btnPrimary} flex items-center gap-1.5 ml-auto`}
          >
            <Send className="w-4 h-4" />
            Send to Selected ({selectedIds.size})
          </button>
        </div>

        {/* Send result */}
        {sendResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${sendResult.success ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
            {sendResult.success
              ? `Sent to ${sendResult.count} recipient${sendResult.count !== 1 ? 's' : ''} successfully`
              : `Send failed: ${sendResult.error}`
            }
          </div>
        )}
      </div>

      {/* ── AI Compose Modal ── */}
      <Modal open={aiModalOpen} onClose={() => { setAiModalOpen(false); setAiResult(null); setAiError(null); setAiPrompt(''); }} title="AI Email Composer">
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Describe the email you want to create
            </label>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="E.g., A follow-up email for pilot users whose trial ends this week, encouraging them to upgrade..."
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>

          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating || !aiPrompt.trim()}
            className={`${btnPrimary} flex items-center gap-1.5`}
          >
            {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiGenerating ? 'Generating...' : 'Generate'}
          </button>

          {aiError && (
            <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Generated Subject</label>
                <input
                  type="text"
                  value={aiResult.subject}
                  onChange={e => setAiResult({ ...aiResult, subject: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Generated Body</label>
                <textarea
                  value={aiResult.body}
                  onChange={e => setAiResult({ ...aiResult, body: e.target.value })}
                  rows={8}
                  className={`${inputClass} resize-y`}
                />
              </div>
              <button onClick={handleAiUse} className={`${btnPrimary} flex items-center gap-1.5`}>
                <CheckSquare className="w-4 h-4" />
                Use This
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Email Preview" wide>
        <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
          <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Subject</div>
          <div className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{subject || '(no subject)'}</div>
          <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Body</div>
          <div
            className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}
            dangerouslySetInnerHTML={{ __html: body || '<p style="color:#999">(empty body)</p>' }}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => setPreviewOpen(false)} className={btnSecondary}>Close</button>
        </div>
      </Modal>

      {/* ── Send Confirmation Modal ── */}
      <Modal open={sendConfirmOpen} onClose={() => { if (!sending) setSendConfirmOpen(false); }} title="Confirm Send">
        {!sendResult ? (
          <div className="space-y-4">
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Send to {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}?
            </p>
            <div className={`rounded-lg border max-h-48 overflow-y-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              {selectedRecipients.map(r => (
                <div key={getRecipientKey(r)} className={`px-3 py-1.5 text-sm border-b last:border-b-0 ${isDark ? 'text-slate-300 border-slate-800' : 'text-slate-700 border-slate-100'}`}>
                  {r.org_name || r.name || r.email} {r.contact_name ? `(${r.contact_name})` : ''}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setSendConfirmOpen(false)} disabled={sending} className={btnSecondary}>Cancel</button>
              <button onClick={handleSend} disabled={sending} className={`${btnPrimary} flex items-center gap-1.5`}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg text-sm ${sendResult.success ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
              {sendResult.success
                ? `Sent to ${sendResult.count} recipient${sendResult.count !== 1 ? 's' : ''} successfully`
                : `Send failed: ${sendResult.error}`
              }
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setSendConfirmOpen(false); setSendResult(null); }} className={btnSecondary}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Save as Template Modal ── */}
      <Modal open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} title="Save as Template">
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Template Name</label>
            <input
              type="text"
              value={saveTemplateName}
              onChange={e => setSaveTemplateName(e.target.value)}
              placeholder="e.g., Pilot Follow-Up"
              className={inputClass}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Category</label>
            <select
              value={saveTemplateCategory}
              onChange={e => setSaveTemplateCategory(e.target.value)}
              className={inputClass}
            >
              <option value="general">General</option>
              <option value="onboarding">Onboarding</option>
              <option value="engagement">Engagement</option>
              <option value="upgrade">Upgrade</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setSaveTemplateOpen(false)} className={btnSecondary}>Cancel</button>
            <button
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !saveTemplateName.trim()}
              className={`${btnPrimary} flex items-center gap-1.5`}
            >
              {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingTemplate ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  // ══════════════════════════════════════════════════
  //  TAB 2: Templates
  // ══════════════════════════════════════════════════
  const renderTemplates = () => (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Email Templates</h3>
        </div>
        <div className="flex items-center gap-2">
          {!templatesLoading && templates.length === 0 && (
            <button onClick={handleSeedDefaults} disabled={seedingDefaults} className={`${btnSecondary} flex items-center gap-1.5 text-xs`}>
              {seedingDefaults ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Seed Defaults
            </button>
          )}
          <button onClick={startNewTemplate} className={`${btnPrimary} flex items-center gap-1.5 text-xs`}>
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
          <button onClick={fetchTemplates} disabled={templatesLoading} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <RefreshCw className={`w-4 h-4 ${templatesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {templatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading templates...</span>
        </div>
      ) : templatesError ? (
        <div className="flex items-center justify-center py-12 px-4">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-500">{templatesError}</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No templates yet. Create one or seed the defaults.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className={`rounded-xl p-4 ring-1 transition-colors ${
                isDark ? 'bg-slate-800/50 ring-slate-700 hover:bg-slate-800' : 'bg-slate-50 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{tpl.name}</h4>
                  <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tpl.subject}</p>
                </div>
                {tpl.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                    {tpl.category}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {tpl.updated_at ? `Updated ${new Date(tpl.updated_at).toLocaleDateString()}` : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditTemplate(tpl)}
                    className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    title="Edit"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  {deleteConfirmId === tpl.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        disabled={deletingTemplateId === tpl.id}
                        className="p-1.5 rounded-lg text-xs text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="Confirm delete"
                      >
                        {deletingTemplateId === tpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(tpl.id)}
                      className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Template Modal ── */}
      <Modal open={!!editingTemplate} onClose={() => setEditingTemplate(null)} title="Edit Template" wide>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Name</label>
            <input type="text" value={editTemplateName} onChange={e => setEditTemplateName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Category</label>
            <select value={editTemplateCategory} onChange={e => setEditTemplateCategory(e.target.value)} className={inputClass}>
              <option value="general">General</option>
              <option value="onboarding">Onboarding</option>
              <option value="engagement">Engagement</option>
              <option value="upgrade">Upgrade</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Subject</label>
            <input type="text" value={editTemplateSubject} onChange={e => setEditTemplateSubject(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Body (HTML)</label>
            <textarea value={editTemplateBody} onChange={e => setEditTemplateBody(e.target.value)} rows={10} className={`${inputClass} resize-y`} />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setEditingTemplate(null)} className={btnSecondary}>Cancel</button>
            <button
              onClick={handleUpdateTemplate}
              disabled={updatingTemplate || !editTemplateName.trim() || !editTemplateSubject.trim()}
              className={`${btnPrimary} flex items-center gap-1.5`}
            >
              {updatingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {updatingTemplate ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── New Template Modal ── */}
      <Modal open={newTemplateOpen} onClose={() => setNewTemplateOpen(false)} title="New Template" wide>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Name</label>
            <input type="text" value={editTemplateName} onChange={e => setEditTemplateName(e.target.value)} placeholder="e.g., Weekly Digest" className={inputClass} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Category</label>
            <select value={editTemplateCategory} onChange={e => setEditTemplateCategory(e.target.value)} className={inputClass}>
              <option value="general">General</option>
              <option value="onboarding">Onboarding</option>
              <option value="engagement">Engagement</option>
              <option value="upgrade">Upgrade</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Subject</label>
            <input type="text" value={editTemplateSubject} onChange={e => setEditTemplateSubject(e.target.value)} placeholder="Email subject line..." className={inputClass} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Body (HTML)</label>
            <textarea value={editTemplateBody} onChange={e => setEditTemplateBody(e.target.value)} rows={10} placeholder="Compose your email body here..." className={`${inputClass} resize-y`} />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setNewTemplateOpen(false)} className={btnSecondary}>Cancel</button>
            <button
              onClick={handleCreateTemplate}
              disabled={creatingTemplate || !editTemplateName.trim() || !editTemplateSubject.trim()}
              className={`${btnPrimary} flex items-center gap-1.5`}
            >
              {creatingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creatingTemplate ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  // ══════════════════════════════════════════════════
  //  TAB 3: Send History
  // ══════════════════════════════════════════════════
  const renderHistory = () => (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Send History</h3>
        </div>
        <button onClick={fetchHistory} disabled={historyLoading} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
          <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {historyLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading history...</span>
        </div>
      ) : historyError ? (
        <div className="flex items-center justify-center py-12 px-4">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-500">{historyError}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Clock className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No emails have been sent yet</span>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map(entry => {
            const isExpanded = expandedHistoryId === entry.id;
            const sentCount = entry.sent_count ?? entry.sent ?? 0;
            const failedCount = entry.failed_count ?? entry.failed ?? 0;
            const totalRecipients = entry.recipient_count ?? entry.recipients_count ?? (sentCount + failedCount);
            return (
              <div key={entry.id} className={`rounded-xl ring-1 overflow-hidden ${isDark ? 'ring-slate-700' : 'ring-slate-200'}`}>
                <button
                  onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? <ChevronUp className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {entry.subject || entry.template_name || 'Untitled'}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {entry.sent_at || entry.created_at ? new Date(entry.sent_at || entry.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}
                    </span>
                    {sentCount > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">{sentCount} sent</span>
                    )}
                    {failedCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">{failedCount} failed</span>
                    )}
                  </div>
                </button>

                {/* Expanded: individual recipient statuses */}
                {isExpanded && (
                  <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    {entry.recipients && entry.recipients.length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {entry.recipients.map((r, idx) => {
                          const sBadge = statusBadge(r.status);
                          return (
                            <div key={r.id || idx} className={`flex items-center justify-between px-6 py-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{r.name || r.email}</span>
                                {r.email && r.name && (
                                  <span className={`truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{r.email}</span>
                                )}
                              </div>
                              <span className={`font-medium ${sBadge.cls}`}>{sBadge.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`px-6 py-4 text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No detailed recipient data available
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════
  //  Main render
  // ══════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Internal tab nav */}
      <div className={`flex items-center gap-1 rounded-xl p-1 ring-1 overflow-x-auto ${isDark ? 'bg-slate-800/50 ring-slate-700' : 'bg-slate-100 ring-slate-200'}`}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && renderCompose()}
      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'history' && renderHistory()}
    </div>
  );
}
