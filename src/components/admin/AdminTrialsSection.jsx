// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Plus, Send, Clock, Check, Trash2, ChevronDown, ChevronUp, ChevronsUpDown,
  Copy, RefreshCw, Key, FlaskConical, Mail, Building2, Users, AlertTriangle, Pencil, X
} from 'lucide-react';
import AdminTrialCodes from '../../AdminTrialCodes';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

const APP_URL = window.location.origin;

function statusBadge(status) {
  const map = {
    pending:  'bg-slate-700 text-slate-300',
    claimed:  'bg-green-900/40 text-green-400',
    revoked:  'bg-red-900/40 text-red-400',
  };
  return map[status] || 'bg-slate-700 text-slate-300';
}

export default function AdminTrialsSection({ theme }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState('invites');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [extendingId, setExtendingId] = useState(null);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // New account form
  const [form, setForm] = useState({
    email: '', company_name: '', trial_duration_days: 7, trial_minutes: 200, max_users: 10, notes: ''
  });
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  // Extend form
  const [extendDays, setExtendDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function createAccount() {
    if (!form.email || !form.company_name) return setError('Email and company name are required');
    setSaving(true); setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/provision-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          company_name: form.company_name,
          trial_duration_days: form.trial_duration_days,
          trial_minutes: form.trial_minutes,
          max_users: form.max_users,
          notes: form.notes
        })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to create account');
      setForm({ email: '', company_name: '', trial_duration_days: 7, trial_minutes: 200, max_users: 10, notes: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      setError('Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite(id) {
    setSendingId(id); setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts/${id}/send-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to send invite');
      await load();
    } catch (e) {
      setError('Failed to send invite');
    } finally {
      setSendingId(null);
    }
  }

  async function extendTrial(id) {
    setExtendingId(id); setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts/${id}/extend`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional_days: extendDays })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to extend pilot');
      await load();
    } catch (e) {
      setError('Failed to extend pilot');
    } finally {
      setExtendingId(null);
      setExpandedId(null);
    }
  }

  async function deleteAccount(id, status) {
    const msg = status === 'claimed'
      ? 'Delete this invite record? The organization and its data will remain intact – only the provisioned account record is removed.'
      : 'Delete this provisioned account? This will also remove the unused organization.';
    if (!window.confirm(msg)) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await load();
    } catch (e) {
      setError('Failed to delete account');
    }
  }

  const [revokingId, setRevokingId] = useState(null);

  async function revokeAccount(id) {
    if (!window.confirm('Revoke this pilot invite? The user will no longer be able to claim it.')) return;
    setRevokingId(id); setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts/${id}/revoke`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to revoke invite');
      await load();
    } catch (e) {
      setError('Failed to revoke invite');
    } finally {
      setRevokingId(null);
    }
  }

  function copyInviteLink(account) {
    if (!account.invite_token) return;
    const url = `${APP_URL}/claim/${account.invite_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(account.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function saveNotes(id) {
    setSavingNotes(true);
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts/${id}/notes`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft })
      });
      setEditingNotesId(null);
      await load();
    } catch (e) {
      setError('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = `w-full rounded-lg px-3 py-2 text-sm border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`;
  const labelClass = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { id: 'active', label: 'Active Pilots', icon: Building2 },
          { id: 'invites', label: 'Pilot Invites', icon: Mail },
          { id: 'codes', label: 'Pilot Codes', icon: Key },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === id
                ? 'bg-blue-600 text-white shadow'
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 px-4 py-3 text-sm">
          {error}
          <button className="ml-2 underline text-xs" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {tab === 'invites' && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base">Pilot Invitations</h2>
              <p className={`text-xs mt-0.5 ${muted}`}>
                Create invite links for companies. Each link gives a pilot period with unlimited calls.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition"
              >
                <Plus className="h-4 w-4" />
                New Invite
              </button>
            </div>
          </div>

          {/* Create form */}
          {showForm && (
            <div className={`rounded-2xl border p-5 mb-6 ${card}`}>
              <h3 className="font-semibold text-sm mb-4">Create New Pilot Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Company Name *</label>
                  <input className={inputClass} placeholder="Acme Corp"
                    value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Contact Email *</label>
                  <input className={inputClass} type="email" placeholder="contact@acme.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Pilot Duration (days)</label>
                  <input className={inputClass} type="number" min={1} max={90}
                    value={form.trial_duration_days} onChange={e => setForm(f => ({ ...f, trial_duration_days: parseInt(e.target.value) || 7 }))} />
                </div>
                <div>
                  <label className={labelClass}>Practice Minutes</label>
                  <input className={inputClass} type="number" min={30} max={9999}
                    value={form.trial_minutes} onChange={e => setForm(f => ({ ...f, trial_minutes: parseInt(e.target.value) || 200 }))} />
                </div>
                <div>
                  <label className={labelClass}>Max Users</label>
                  <input className={inputClass} type="number" min={1} max={100}
                    value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: parseInt(e.target.value) || 10 }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Notes (internal)</label>
                  <input className={inputClass} placeholder="e.g. Referred by John Smith"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={createAccount}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Create Account
                </button>
                <button onClick={() => setShowForm(false)} className={`px-4 py-2 text-sm rounded-xl ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Accounts list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
            </div>
          ) : accounts.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl border ${card}`}>
              <FlaskConical className={`h-10 w-10 mx-auto mb-3 ${muted}`} />
              <p className={`text-sm font-medium ${muted}`}>No pilot accounts yet</p>
              <p className={`text-xs mt-1 ${muted}`}>Create an invite link to get started.</p>
            </div>
          ) : (
            <div className={`rounded-2xl border divide-y ${card} ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {accounts.map(account => (
                <div key={account.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{account.company_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(account.status)}`}>
                          {account.status}
                        </span>
                        {account.invite_token && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            invite sent
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${muted}`}>{account.email}</p>
                      <p className={`text-xs ${muted}`}>
                        {account.trial_duration_days}d pilot
                        {account.max_users && ` · up to ${account.max_users} users`}
                        {account.claimed_at && ` · claimed ${new Date(account.claimed_at).toLocaleDateString()}`}
                        {account.invite_sent_at && !account.claimed_at && ` · invited ${new Date(account.invite_sent_at).toLocaleDateString()}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {account.status !== 'claimed' && (
                        <button
                          onClick={() => sendInvite(account.id)}
                          disabled={sendingId === account.id}
                          title={account.invite_token ? 'Resend invite email' : 'Send invite email'}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isDark ? 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} disabled:opacity-50`}
                        >
                          {sendingId === account.id
                            ? <RefreshCw className="h-3 w-3 animate-spin" />
                            : <Send className="h-3 w-3" />}
                          {account.invite_token ? 'Resend' : 'Send Invite'}
                        </button>
                      )}
                      {account.invite_token && (
                        <button
                          onClick={() => copyInviteLink(account)}
                          title="Copy invite link"
                          className={`p-1.5 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        >
                          {copied === account.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                      {account.status === 'pending' && (
                        <button
                          onClick={() => revokeAccount(account.id)}
                          disabled={revokingId === account.id}
                          title="Revoke pilot invite"
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isDark ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60' : 'bg-red-50 text-red-600 hover:bg-red-100'} disabled:opacity-50`}
                        >
                          {revokingId === account.id
                            ? <RefreshCw className="h-3 w-3 animate-spin" />
                            : <X className="h-3 w-3" />}
                          Revoke
                        </button>
                      )}
                      {account.status === 'claimed' && (
                        <button
                          onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                          title="Extend pilot"
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          <Clock className="h-3 w-3" />
                          Extend
                          {expandedId === account.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                      <button
                        onClick={() => deleteAccount(account.id, account.status)}
                        title="Delete invite record"
                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Extend panel */}
                  {expandedId === account.id && (
                    <div className={`mt-3 rounded-xl p-3 flex items-center gap-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Add days:
                      </label>
                      <input
                        type="number" min={1} max={90}
                        value={extendDays}
                        onChange={e => setExtendDays(parseInt(e.target.value) || 7)}
                        className={`w-20 rounded-lg px-2 py-1 text-sm border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                      <button
                        onClick={() => extendTrial(account.id)}
                        disabled={extendingId === account.id}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                      >
                        {extendingId === account.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Confirm
                      </button>
                    </div>
                  )}

                  {/* Notes inline edit */}
                  {editingNotesId === account.id ? (
                    <div className="mt-3 flex items-start gap-2">
                      <textarea
                        rows={2}
                        autoFocus
                        value={notesDraft}
                        onChange={e => setNotesDraft(e.target.value)}
                        placeholder="Add a note about this account..."
                        className={`flex-1 rounded-lg px-3 py-2 text-xs border resize-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => saveNotes(account.id)}
                          disabled={savingNotes}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          {savingNotes ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-start gap-1.5">
                      {account.notes
                        ? <p className={`text-xs italic flex-1 ${muted}`}>{account.notes}</p>
                        : <p className={`text-xs flex-1 ${muted}`}>No notes</p>
                      }
                      <button
                        onClick={() => { setEditingNotesId(account.id); setNotesDraft(account.notes || ''); }}
                        title="Edit notes"
                        className={`shrink-0 p-0.5 rounded transition ${isDark ? 'text-slate-600 hover:text-slate-300' : 'text-slate-300 hover:text-slate-600'}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'active' && (
        <ActiveTrialsTab theme={theme} getToken={getToken} />
      )}

      {tab === 'codes' && (
        <AdminTrialCodes theme={theme} getToken={getToken} />
      )}
    </div>
  );
}

// ── Active Trials Tab ──────────────────────────────────────────────────────────

function ActiveTrialsTab({ theme, getToken }) {
  const isDark = theme === 'dark';
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extendingId, setExtendingId] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [extendDays, setExtendDays] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [sortCol, setSortCol] = useState('trial_end');
  const [sortDir, setSortDir] = useState('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations-detailed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Show all trial orgs (pilot = Trial Pending, trial = Trial Active)
        const active = (data.organizations || [])
          .filter(o => ['pilot', 'trial'].includes(o.tier_key));
        setOrgs(active);
        setSelected(new Set());
      }
    } catch (e) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function extendTrial(orgId) {
    const days = extendDays[orgId] || 7;
    setExtendingId(orgId); setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}/extend-trial`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional_days: days })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to extend pilot');
      setExpandedId(null);
      await load();
    } catch (e) {
      setError('Failed to extend pilot');
    } finally {
      setExtendingId(null);
    }
  }

  async function deleteOrg(orgId, orgName) {
    if (!window.confirm(`Permanently delete "${orgName}" and all its data? This cannot be undone.`)) return;
    setDeletingIds(prev => new Set([...prev, orgId]));
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to delete organization');
      } else {
        await load();
      }
    } catch (e) {
      setError('Failed to delete organization');
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(orgId); return s; });
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const names = orgs.filter(o => selected.has(o.id)).map(o => o.name).join(', ');
    if (!window.confirm(`Permanently delete ${selected.size} organization(s)?\n\n${names}\n\nThis cannot be undone.`)) return;
    setBulkDeleting(true); setError(null);
    try {
      const token = await getToken();
      await Promise.all([...selected].map(orgId =>
        fetch(`${BACKEND_URL}/api/site-admin/organizations/${orgId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      ));
      await load();
    } catch (e) {
      setError('One or more deletions failed');
    } finally {
      setBulkDeleting(false);
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === orgs.length ? new Set() : new Set(orgs.map(o => o.id)));
  }

  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const allSelected = orgs.length > 0 && selected.size === orgs.length;

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />;
  }

  const sortedOrgs = [...orgs].sort((a, b) => {
    let av = a[sortCol] ?? '';
    let bv = b[sortCol] ?? '';
    if (sortCol === 'member_count' || sortCol === 'total_calls') {
      av = parseFloat(av) || 0;
      bv = parseFloat(bv) || 0;
    } else if (sortCol === 'trial_end') {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function daysInfo(trialEnd) {
    if (!trialEnd) return { label: 'No end date', expired: false, days: null };
    const now = new Date();
    const end = new Date(trialEnd);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `Expired ${Math.abs(diff)}d ago`, expired: true, days: diff };
    if (diff === 0) return { label: 'Expires today', expired: false, days: 0 };
    return { label: `${diff}d remaining`, expired: false, days: diff };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-base">Active Pilot Organizations</h2>
          <p className={`text-xs mt-0.5 ${muted}`}>
            Pilots with at least one active user – sorted by soonest expiry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
            >
              {bulkDeleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Delete {selected.size} selected
            </button>
          )}
          <button onClick={load} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 px-4 py-3 text-sm">
          {error}
          <button className="ml-2 underline text-xs" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        </div>
      ) : orgs.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${card}`}>
          <FlaskConical className={`h-10 w-10 mx-auto mb-3 ${muted}`} />
          <p className={`text-sm font-medium ${muted}`}>No active pilot organizations</p>
        </div>
      ) : (
        <div className={`rounded-2xl border divide-y ${card} ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {/* Table header with select-all */}
          <div className={`hidden md:grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide select-none ${muted}`}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded cursor-pointer mt-0.5"
            />
            {[
              { col: 'name',         label: 'Organization' },
              { col: 'member_count', label: 'Users' },
              { col: 'trial_end',    label: 'Expires' },
              { col: 'total_calls',  label: 'Calls' },
            ].map(({ col, label }) => (
              <button
                key={col}
                onClick={() => toggleSort(col)}
                className="group flex items-center gap-1 text-left hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                {label}
                <SortIcon col={col} />
              </button>
            ))}
            <span />
          </div>

          {sortedOrgs.map(org => {
            const { label: expiryLabel, expired, days } = daysInfo(org.trial_end);
            const urgent = days !== null && days <= 2 && !expired;
            const isSelected = selected.has(org.id);
            const isDeleting = deletingIds.has(org.id);

            return (
              <div key={org.id} className={`px-5 py-4 transition ${isSelected ? isDark ? 'bg-blue-900/10' : 'bg-blue-50/60' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-3 items-center">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(org.id)}
                    className="rounded cursor-pointer"
                  />

                  {/* Name */}
                  <div>
                    <p className="font-semibold text-sm">{org.name}</p>
                    <p className={`text-xs ${muted}`}>{org.tier_key}</p>
                  </div>

                  {/* Users */}
                  <div className="flex items-center gap-1.5">
                    <Users className={`h-3.5 w-3.5 ${muted}`} />
                    <span className="text-sm">{org.member_count ?? 0}</span>
                  </div>

                  {/* Trial expiry */}
                  <div className="flex items-center gap-1.5">
                    {(expired || urgent) && <AlertTriangle className={`h-3.5 w-3.5 ${expired ? 'text-red-500' : 'text-amber-500'}`} />}
                    <span className={`text-sm font-medium ${expired ? 'text-red-500' : urgent ? 'text-amber-500' : ''}`}>
                      {expiryLabel}
                    </span>
                  </div>

                  {/* Call count */}
                  <div className={`text-sm ${muted}`}>
                    {org.total_calls ?? 0} calls
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Clock className="h-3 w-3" />
                      Extend
                      {expandedId === org.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => deleteOrg(org.id, org.name)}
                      disabled={isDeleting}
                      title="Delete organization"
                      className={`p-1.5 rounded-lg transition ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} disabled:opacity-40`}
                    >
                      {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Extend panel */}
                {expandedId === org.id && (
                  <div className={`mt-3 rounded-xl p-3 flex items-center gap-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Add days:
                    </label>
                    <input
                      type="number" min={1} max={90}
                      value={extendDays[org.id] ?? 7}
                      onChange={e => setExtendDays(p => ({ ...p, [org.id]: parseInt(e.target.value) || 7 }))}
                      className={`w-20 rounded-lg px-2 py-1 text-sm border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
                    />
                    <button
                      onClick={() => extendTrial(org.id)}
                      disabled={extendingId === org.id}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                    >
                      {extendingId === org.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Confirm
                    </button>
                    <span className={`text-xs ${muted}`}>
                      {org.trial_end ? `Current end: ${new Date(org.trial_end).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
