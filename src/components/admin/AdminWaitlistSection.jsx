// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { RefreshCw, Users, Download, Send, Mail, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, ChevronsUpDown, Trash2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

const EMAIL_TEMPLATES = [
  { key: 'waitlist_confirm', label: "You're on the list!",       desc: 'Confirms their waitlist spot' },
  { key: 'early_access',     label: 'Early Access Coming Soon',  desc: "They're on the shortlist for access" },
  { key: 'launch',           label: "We're Live!",               desc: 'Launch announcement with sign-up link' },
];

const TRIAL_DURATIONS = [7, 14, 21, 30];

function formatDate(ts) {
  if (!ts) return '–';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function AdminWaitlistSection({ theme }) {
  const { getToken } = useAuth();
  const isDark = theme === 'dark';
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Send trial state
  const [trialRowId, setTrialRowId] = useState(null);
  const [trialCompany, setTrialCompany] = useState('');
  const [trialDays, setTrialDays] = useState(14);
  const [sendingTrial, setSendingTrial] = useState(false);
  const [trialStatus, setTrialStatus] = useState({});  // id -> 'sent' | 'error'

  // Send email state
  const [emailMenuId, setEmailMenuId] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState({});  // id -> 'sent' | 'error'
  const emailMenuRef = useRef(null);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  // Sort state
  const [sortCol, setSortCol] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/waitlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.waitlist || []);
        setTotal(data.total || 0);
      } else {
        setError('Failed to load waitlist');
      }
    } catch {
      setError('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  // Close email menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (emailMenuRef.current && !emailMenuRef.current.contains(e.target)) {
        setEmailMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function sendTrial(entry) {
    if (!trialCompany.trim()) return;
    setSendingTrial(true);
    try {
      const token = await getToken();
      const provRes = await fetch(`${BACKEND_URL}/api/admin/provision-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: entry.email,
          company_name: trialCompany.trim(),
          trial_duration_days: trialDays,
          notes: 'From waitlist',
        }),
      });
      if (!provRes.ok) {
        const err = await provRes.json();
        throw new Error(err.error || 'Failed to create trial');
      }
      const { provisioned_account } = await provRes.json();
      const inviteRes = await fetch(`${BACKEND_URL}/api/admin/provisioned-accounts/${provisioned_account.id}/send-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!inviteRes.ok) throw new Error('Failed to send invite');
      setTrialStatus(prev => ({ ...prev, [entry.id]: 'sent' }));
      setTrialRowId(null);
      setTrialCompany('');
    } catch (err) {
      setTrialStatus(prev => ({ ...prev, [entry.id]: 'error' }));
    } finally {
      setSendingTrial(false);
    }
  }

  async function sendEmail(entry, templateKey) {
    setEmailMenuId(null);
    setSendingEmail(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/waitlist/${entry.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ template: templateKey }),
      });
      if (!res.ok) throw new Error('Failed to send email');
      setEmailStatus(prev => ({ ...prev, [entry.id]: 'sent' }));
    } catch {
      setEmailStatus(prev => ({ ...prev, [entry.id]: 'error' }));
    } finally {
      setSendingEmail(false);
    }
  }

  async function deleteEntry(id, name) {
    if (!window.confirm(`Remove ${name} from the waitlist?`)) return;
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/site-admin/waitlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { await load(); }
      else { alert('Failed to delete entry'); }
    } catch { alert('Failed to delete entry'); }
    finally { setDeletingId(null); }
  }

  function downloadCSV() {
    const header = 'First Name,Last Name,Email,Signed Up';
    const rows = entries.map(e =>
      `${e.first_name},${e.last_name},${e.email},"${formatDate(e.created_at)}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waitlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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

  const sortedEntries = [...entries].sort((a, b) => {
    let av, bv;
    if (sortCol === 'name') {
      av = `${a.last_name} ${a.first_name}`.toLowerCase();
      bv = `${b.last_name} ${b.first_name}`.toLowerCase();
    } else if (sortCol === 'created_at') {
      av = a.created_at ? new Date(a.created_at).getTime() : 0;
      bv = b.created_at ? new Date(b.created_at).getTime() : 0;
    } else {
      av = String(a[sortCol] ?? '').toLowerCase();
      bv = String(b[sortCol] ?? '').toLowerCase();
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const card = `rounded-2xl border p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`;
  const text = isDark ? 'text-slate-100' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const divider = isDark ? 'divide-slate-800' : 'divide-slate-100';
  const headerBg = isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500';
  const inputCls = `rounded-lg border px-3 py-1.5 text-sm w-full ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`;
  const btnBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${text}`}>Waitlist</h2>
          <p className={`text-sm mt-0.5 ${muted}`}>{total} total signup{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button onClick={downloadCSV} className={`${btnBase} ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
          <button onClick={load} disabled={loading} className={`${btnBase} ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={card}>
        {loading ? (
          <div className={`py-16 text-center text-sm ${muted}`}>Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-400">{error}</div>
        ) : entries.length === 0 ? (
          <div className={`py-16 text-center ${muted}`}>
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No waitlist signups yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${headerBg} text-xs uppercase tracking-wider select-none`}>
                  {[
                    { col: 'name',       label: 'Name' },
                    { col: 'email',      label: 'Email' },
                    { col: 'created_at', label: 'Signed Up' },
                  ].map(({ col, label }) => (
                    <th key={col} className="px-6 py-3 text-left font-medium">
                      <button
                        onClick={() => toggleSort(col)}
                        className="group flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        {label}
                        <SortIcon col={col} />
                      </button>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left font-medium">Actions</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {sortedEntries.map((e) => (
                  <React.Fragment key={e.id}>
                    <tr className={`${rowHover} transition-colors`}>
                      <td className={`px-6 py-3 font-medium ${text}`}>{e.first_name} {e.last_name}</td>
                      <td className={`px-6 py-3 ${muted}`}>{e.email}</td>
                      <td className={`px-6 py-3 ${muted}`}>{formatDate(e.created_at)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {/* Send Trial */}
                          {trialStatus[e.id] === 'sent' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle className="w-3.5 h-3.5" />Trial sent</span>
                          ) : trialStatus[e.id] === 'error' ? (
                            <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />Failed</span>
                          ) : (
                            <button
                              onClick={() => { setTrialRowId(trialRowId === e.id ? null : e.id); setTrialCompany(''); setEmailMenuId(null); }}
                              className={`${btnBase} ${isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Send Trial
                            </button>
                          )}

                          {/* Send Email dropdown */}
                          {emailStatus[e.id] === 'sent' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle className="w-3.5 h-3.5" />Email sent</span>
                          ) : emailStatus[e.id] === 'error' ? (
                            <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />Failed</span>
                          ) : (
                            <div className="relative" ref={emailMenuId === e.id ? emailMenuRef : null}>
                              <button
                                onClick={() => { setEmailMenuId(emailMenuId === e.id ? null : e.id); setTrialRowId(null); }}
                                className={`${btnBase} ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Email
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {emailMenuId === e.id && (
                                <div className={`absolute right-0 z-20 mt-1 w-64 rounded-xl border shadow-lg overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                  {EMAIL_TEMPLATES.map(t => (
                                    <button
                                      key={t.key}
                                      onClick={() => sendEmail(e, t.key)}
                                      disabled={sendingEmail}
                                      className={`w-full text-left px-4 py-3 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                                    >
                                      <div className={`text-sm font-medium ${text}`}>{t.label}</div>
                                      <div className={`text-xs mt-0.5 ${muted}`}>{t.desc}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => deleteEntry(e.id, `${e.first_name} ${e.last_name}`)}
                          disabled={deletingId === e.id}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-700' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} disabled:opacity-40`}
                          title="Remove from waitlist"
                        >
                          {deletingId === e.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Inline trial form row */}
                    {trialRowId === e.id && (
                      <tr className={isDark ? 'bg-slate-800/60' : 'bg-blue-50/60'}>
                        <td colSpan={4} className="px-6 py-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs font-medium ${muted}`}>Company name</span>
                            <input
                              type="text"
                              value={trialCompany}
                              onChange={e2 => setTrialCompany(e2.target.value)}
                              placeholder="e.g. Acme Corp"
                              className={`${inputCls} max-w-[200px]`}
                              autoFocus
                            />
                            <span className={`text-xs font-medium ${muted}`}>Duration</span>
                            <select
                              value={trialDays}
                              onChange={e2 => setTrialDays(Number(e2.target.value))}
                              className={`${inputCls} w-auto`}
                            >
                              {TRIAL_DURATIONS.map(d => <option key={d} value={d}>{d} days</option>)}
                            </select>
                            <button
                              onClick={() => sendTrial(e)}
                              disabled={sendingTrial || !trialCompany.trim()}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {sendingTrial ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {sendingTrial ? 'Sending…' : 'Send Invite'}
                            </button>
                            <button
                              onClick={() => setTrialRowId(null)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
