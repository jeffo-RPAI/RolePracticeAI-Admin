// Copyright (c) 2024-2026 RolePractice.ai. All rights reserved.
// Proprietary and confidential. Unauthorized copying, modification, or distribution
// of this software is strictly prohibited.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Wrench, Smartphone, GitPullRequest, Shield, Loader2, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai';

export default function AdminAutoFixSettings({ theme }) {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const [settingsRes, attemptsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/auto-fix/settings`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/auto-fix/attempts?limit=10`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (attemptsRes.ok) {
        const data = await attemptsRes.json();
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      console.error('Error fetching auto-fix data:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateSetting = async (key, value) => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/auto-fix/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [key]: value })
      });
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error('Error updating setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = {
    pending_analysis: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', label: 'Pending' },
    analyzing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Analyzing' },
    fix_generated: { icon: Wrench, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Fix Ready' },
    pending_approval: { icon: Smartphone, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Awaiting Approval' },
    approved: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Approved' },
    auto_merged: { icon: GitPullRequest, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Auto-Merged' },
    rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Rejected' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Failed' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-5 flex items-center gap-2">
          <Wrench className="w-4 h-4" /> AutoFix Settings
        </h3>

        <div className="space-y-5">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">AutoFix Enabled</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI analyzes errors and generates code fixes automatically</p>
            </div>
            <button
              onClick={() => updateSetting('enabled', !settings?.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Auto Push Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Auto-Push Fixes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Automatically merge PRs without approval (use with caution)</p>
            </div>
            <button
              onClick={() => updateSetting('auto_push_enabled', !settings?.auto_push_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.auto_push_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.auto_push_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* SMS Approval Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">SMS Approval</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Get a text with approve/reject link when fixes are ready</p>
            </div>
            <button
              onClick={() => updateSetting('sms_approval_enabled', !settings?.sms_approval_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.sms_approval_enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.sms_approval_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-50 block mb-1">Admin Phone Number</label>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                defaultValue={settings?.admin_phone || ''}
                onBlur={(e) => {
                  if (e.target.value !== (settings?.admin_phone || '')) {
                    updateSetting('admin_phone', e.target.value);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Used for SMS approval notifications (Twilio)</p>
          </div>

          {/* Rate Limit */}
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-50 block mb-1">Max Fixes Per Hour</label>
            <select
              value={settings?.max_fixes_per_hour || 5}
              onChange={(e) => updateSetting('max_fixes_per_hour', parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-50"
            >
              {[1, 2, 3, 5, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Env var status */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold mb-1">Required Environment Variables (Railway):</p>
            <ul className="space-y-0.5 ml-2">
              <li>GITHUB_TOKEN — Personal Access Token with repo access</li>
              <li>ANTHROPIC_API_KEY — Claude API key for fix generation</li>
              <li>TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER — For SMS</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Attempts */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
            <GitPullRequest className="w-4 h-4" /> Recent Fix Attempts
          </h3>
          <div className="space-y-3">
            {attempts.map(a => {
              const sc = statusConfig[a.status] || statusConfig.failed;
              const Icon = sc.icon;
              return (
                <div key={a.id} className={`p-3 rounded-xl border border-slate-200 dark:border-slate-700`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.color}`}>
                          <Icon className="w-3 h-3" /> {sc.label}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-900 dark:text-slate-50 truncate">{a.fix_description || a.error_message?.substring(0, 100)}</p>
                      {a.file_path && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{a.file_path}</p>}
                      {a.failure_reason && <p className="text-xs text-red-500 mt-1">{a.failure_reason}</p>}
                    </div>
                    {a.pr_url && (
                      <a href={a.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 flex-shrink-0">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
