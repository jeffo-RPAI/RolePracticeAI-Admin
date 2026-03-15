// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect } from 'react';
import { Key, Copy, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Plus, RefreshCw, CheckSquare, Square, Send } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminTrialCodes({ theme, getToken }) {
  const isDark = theme === 'dark';
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedCode, setExpandedCode] = useState(null);
  const [redemptions, setRedemptions] = useState({});
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const [markingSent, setMarkingSent] = useState(null); // code id being marked
  const [sentCompany, setSentCompany] = useState({}); // { [codeId]: companyName }
  const [showSentInput, setShowSentInput] = useState(null); // code id showing input

  // Form state
  const [label, setLabel] = useState('');
  const [trialMinutes, setTrialMinutes] = useState(60);
  const [trialDays, setTrialDays] = useState(14);
  const [maxRedemptions, setMaxRedemptions] = useState(10);
  const [expiresAt, setExpiresAt] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [allowedDomain, setAllowedDomain] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/trial-codes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
      }
    } catch (err) {
      console.error('Failed to load trial codes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    if (!expiresAt) {
      setError('Expiration date is required');
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/trial-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          label: label || null,
          trial_minutes: trialMinutes,
          trial_duration_days: trialDays,
          max_redemptions: maxRedemptions,
          expires_at: new Date(expiresAt).toISOString(),
          code_prefix: codePrefix || null,
          allowed_domain: allowedDomain || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create code');
      }

      // Reset form
      setLabel('');
      setTrialMinutes(60);
      setTrialDays(14);
      setMaxRedemptions(10);
      setExpiresAt('');
      setCodePrefix('');
      setAllowedDomain('');
      setShowForm(false);
      await loadCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(codeId, currentActive) {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/trial-codes/${codeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentActive })
      });
      await loadCodes();
    } catch (err) {
      console.error('Failed to toggle code:', err);
    }
  }

  async function handleDelete(codeId) {
    if (!confirm('Are you sure you want to delete this pilot code?')) return;
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/trial-codes/${codeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadCodes();
    } catch (err) {
      console.error('Failed to delete code:', err);
    }
  }

  async function loadRedemptions(codeId) {
    if (expandedCode === codeId) {
      setExpandedCode(null);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/trial-codes/${codeId}/redemptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRedemptions(prev => ({ ...prev, [codeId]: data.redemptions }));
        setExpandedCode(codeId);
      }
    } catch (err) {
      console.error('Failed to load redemptions:', err);
    }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function markSent(codeId) {
    const company = sentCompany[codeId] || '';
    setMarkingSent(codeId);
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/trial-codes/${codeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sent_at: new Date().toISOString(), sent_to_company: company || null })
      });
      setShowSentInput(null);
      await loadCodes();
    } catch (err) {
      console.error('Failed to mark sent:', err);
    } finally {
      setMarkingSent(null);
    }
  }

  function getStatusBadge(code) {
    if (!code.is_active) {
      return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-500/20 text-slate-400">Deactivated</span>;
    }
    if (code.is_expired) {
      return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">Expired</span>;
    }
    if (code.times_redeemed >= code.max_redemptions) {
      return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400">Maxed Out</span>;
    }
    return <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400">Active</span>;
  }

  const minutePresets = [15, 30, 60, 120, 300];
  const dayPresets = [7, 14, 30, 60, 90];

  // Default expiration to 30 days from now for the date input
  const defaultExpDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Pilot License Codes
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Generate and manage pilot license codes for new users
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCodes}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Generate Code
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className={`rounded-2xl p-6 space-y-5 ${
          isDark ? 'bg-slate-900 ring-1 ring-slate-800' : 'bg-white ring-1 ring-slate-200'
        }`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Generate New Pilot Code
          </h3>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Label */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Label (optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Q1 Partner Demo"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Code Prefix */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Code Prefix (optional)
              </label>
              <input
                type="text"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value)}
                placeholder="e.g. DEMO (default: TRIAL)"
                maxLength={8}
                className={`w-full rounded-lg px-3 py-2 text-sm uppercase ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Allowed Domain */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Restrict to Domain (optional)
              </label>
              <input
                type="text"
                value={allowedDomain}
                onChange={(e) => setAllowedDomain(e.target.value)}
                placeholder="e.g. acme.com"
                className={`w-full rounded-lg px-3 py-2 text-sm lowercase ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Only users with this email domain can redeem
              </p>
            </div>

            {/* Pilot Minutes */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Pilot Minutes
              </label>
              <div className="flex gap-2 mb-2">
                {minutePresets.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTrialMinutes(m)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      trialMinutes === m
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={trialMinutes}
                onChange={(e) => setTrialMinutes(parseInt(e.target.value) || 0)}
                min="1"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Pilot Duration Days */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Pilot Duration (days)
              </label>
              <div className="flex gap-2 mb-2">
                {dayPresets.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrialDays(d)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      trialDays === d
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                min="1"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Max Redemptions */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Max Redemptions
              </label>
              <input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(parseInt(e.target.value) || 1)}
                min="1"
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Expiration Date
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full rounded-lg px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                } border focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {creating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Generate Code
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Codes Table */}
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : codes.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <Key className={`h-12 w-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              No pilot codes yet. Click "Generate Code" to create one.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <div key={code.id} className={`rounded-2xl overflow-hidden ${
              isDark ? 'bg-slate-900 ring-1 ring-slate-800' : 'bg-white ring-1 ring-slate-200'
            }`}>
              {/* Code Row */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <code className={`text-sm font-mono font-bold tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyCode(code.code)}
                        className={`rounded p-1 transition ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        title="Copy code"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {copied === code.code && (
                        <span className="text-xs text-green-400">Copied!</span>
                      )}
                    </div>
                    {code.label && (
                      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {code.label}
                      </span>
                    )}
                    {getStatusBadge(code)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadRedemptions(code.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {expandedCode === code.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {code.times_redeemed} / {code.max_redemptions} used
                    </button>
                    <button
                      onClick={() => handleToggleActive(code.id, code.is_active)}
                      className={`rounded-lg p-1.5 transition ${
                        isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                      }`}
                      title={code.is_active ? 'Deactivate' : 'Reactivate'}
                    >
                      {code.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details row */}
                <div className={`flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  <span>{code.trial_minutes} min · {code.trial_duration_days} days · Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                  {code.allowed_domain && (
                    <span className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      @{code.allowed_domain} only
                    </span>
                  )}
                  {code.created_by_name && <span>By: {code.created_by_name}</span>}

                  {/* Sent status */}
                  {code.sent_at ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-medium">
                      <CheckSquare className="h-3 w-3" />
                      Sent {code.sent_to_company ? `to ${code.sent_to_company}` : ''} · {new Date(code.sent_at).toLocaleDateString()}
                    </span>
                  ) : showSentInput === code.id ? (
                    <span className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Company name (optional)"
                        value={sentCompany[code.id] || ''}
                        onChange={e => setSentCompany(p => ({ ...p, [code.id]: e.target.value }))}
                        className={`rounded px-2 py-0.5 text-xs border w-36 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'}`}
                        autoFocus
                      />
                      <button
                        onClick={() => markSent(code.id)}
                        disabled={markingSent === code.id}
                        className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        {markingSent === code.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Mark Sent
                      </button>
                      <button onClick={() => setShowSentInput(null)} className="text-xs text-slate-500 hover:text-slate-300">cancel</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowSentInput(code.id)}
                      className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Square className="h-3 w-3" />
                      Mark as Sent
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Redemptions */}
              {expandedCode === code.id && (
                <div className={`border-t px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
                  {(!redemptions[code.id] || redemptions[code.id].length === 0) ? (
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      No redemptions yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Redemptions ({redemptions[code.id].length})
                      </p>
                      {redemptions[code.id].map((r, i) => (
                        <div key={i} className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          <div className="flex gap-4">
                            <span className="font-medium">{r.user_name || 'Unknown'}</span>
                            <span>{r.user_email}</span>
                            <span>{r.organization_name}</span>
                          </div>
                          <span>{new Date(r.redeemed_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
